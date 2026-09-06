import "server-only";
import { randomUUID } from "crypto";
import { getGmailClient } from "@/lib/gmail";
import { getSupabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Intent =
  | "read"
  | "reply"
  | "archive"
  | "trash"
  | "summarize"
  | "flag";

export type PlanStep = { id: string; description: string };

export type AgentPlan = {
  id: string;
  intent: Intent;
  query: string;
  steps: PlanStep[];
  rawCommand: string;
  status: "pending" | "confirmed" | "cancelled" | "done" | "error";
};

// ─── Intent detection ────────────────────────────────────────────────────────

export function detectIntent(command: string): Intent {
  const lower = command.toLowerCase();
  if (/\breply\b|respond|answer|write back/.test(lower)) return "reply";
  if (/\barchive\b/.test(lower)) return "archive";
  if (/\btrash\b|\bdelete\b|\bremove\b/.test(lower)) return "trash";
  if (/summarize|summary|recap|overview/.test(lower)) return "summarize";
  if (/\bflag\b|\bstar\b|\bmark\b|urgent|follow.?up/.test(lower)) return "flag";
  return "read";
}

// ─── Gmail query extraction ───────────────────────────────────────────────────

function extractQuery(command: string): string {
  const lower = command.toLowerCase();
  const parts: string[] = [];

  if (/\btoday\b/.test(lower)) parts.push("newer_than:1d");
  else if (/this week|past week|last 7 days/.test(lower)) parts.push("newer_than:7d");
  else if (/this month|past month/.test(lower)) parts.push("newer_than:30d");

  if (/\bunread\b/.test(lower)) parts.push("is:unread");
  if (/\bstarred\b/.test(lower)) parts.push("is:starred");

  const fromMatch = lower.match(/\bfrom\s+([^\s,]+)/);
  if (fromMatch) parts.push(`from:${fromMatch[1]}`);

  if (/promotional|newsletter|promo/.test(lower)) parts.push("category:promotions");
  else if (/social/.test(lower)) parts.push("category:social");

  return parts.length ? parts.join(" ") : "in:inbox";
}

// ─── Plan generation ──────────────────────────────────────────────────────────

const STEP_TEMPLATES: Record<Intent, string[]> = {
  read: [
    "Search Gmail for matching messages",
    "Fetch message subjects and senders",
    "Return results",
  ],
  summarize: [
    "Search Gmail for matching messages",
    "Fetch message content",
    "Generate summaries for each message",
  ],
  archive: [
    "Search Gmail for matching messages (max 10)",
    "Remove INBOX label from each message",
  ],
  trash: [
    "Search Gmail for matching messages (max 10)",
    "Move each message to Trash",
  ],
  flag: [
    "Search Gmail for matching messages (max 10)",
    "Add STARRED label to each message",
  ],
  reply: [
    "Search Gmail for matching threads",
    "Compose and send replies",
  ],
};

export function buildPlan(command: string): AgentPlan {
  const intent = detectIntent(command);
  const query = extractQuery(command);
  const id = randomUUID();
  const steps = STEP_TEMPLATES[intent].map((description, i) => ({
    id: `${id}-${i}`,
    description,
  }));
  return { id, intent, query, steps, rawCommand: command, status: "pending" };
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

async function checkRateLimit(userId: string): Promise<void> {
  const db = getSupabase();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  try {
    const { count } = await db
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 100) {
      throw new Error("Rate limit exceeded. Try again in an hour.");
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Rate limit")) throw e;
    // Table not yet created — skip rate limiting
  }
}

// ─── Audit logging ────────────────────────────────────────────────────────────

async function writeAuditLog(
  userId: string,
  accountId: string,
  action: string,
  messageIds: string[],
  planId: string,
): Promise<void> {
  try {
    await getSupabase().from("audit_logs").insert({
      user_id: userId,
      gmail_account_id: accountId,
      action,
      message_ids: messageIds,
      plan_id: planId,
    });
  } catch {
    console.error("audit_log write failed — migration may not be applied");
  }
}

// ─── Plan execution ───────────────────────────────────────────────────────────

export type ExecutionResult = {
  messageIds: string[];
  summary: string;
};

export async function executePlan(
  plan: AgentPlan,
  userId: string,
): Promise<ExecutionResult> {
  await checkRateLimit(userId);

  const { client: gmail, account } = await getGmailClient(userId);

  const listResp = await gmail.users.messages.list({
    userId: "me",
    q: plan.query,
    maxResults: 10,
  });

  const items = listResp.data.messages ?? [];
  const messageIds = items.map((m) => m.id!).filter(Boolean);

  if (messageIds.length === 0) {
    return { messageIds: [], summary: "No messages found matching your query." };
  }

  let result: ExecutionResult;

  switch (plan.intent) {
    case "archive": {
      await Promise.all(
        messageIds.map((id) =>
          gmail.users.messages.modify({
            userId: "me",
            id,
            requestBody: { removeLabelIds: ["INBOX"] },
          }),
        ),
      );
      result = {
        messageIds,
        summary: `Archived ${messageIds.length} message(s).`,
      };
      break;
    }

    case "trash": {
      await Promise.all(
        messageIds.map((id) => gmail.users.messages.trash({ userId: "me", id })),
      );
      result = {
        messageIds,
        summary: `Moved ${messageIds.length} message(s) to Trash.`,
      };
      break;
    }

    case "flag": {
      await Promise.all(
        messageIds.map((id) =>
          gmail.users.messages.modify({
            userId: "me",
            id,
            requestBody: { addLabelIds: ["STARRED"] },
          }),
        ),
      );
      result = {
        messageIds,
        summary: `Starred ${messageIds.length} message(s).`,
      };
      break;
    }

    case "read":
    case "summarize": {
      const details = await Promise.all(
        messageIds.slice(0, 5).map((id) =>
          gmail.users.messages.get({
            userId: "me",
            id,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "Date"],
          }),
        ),
      );
      const lines = details.map((d) => {
        const hdrs = d.data.payload?.headers ?? [];
        const subject =
          hdrs.find((h) => h.name === "Subject")?.value ?? "(no subject)";
        const from = hdrs.find((h) => h.name === "From")?.value ?? "Unknown";
        return `• ${subject} — ${from}`;
      });
      const extra = messageIds.length > 5 ? `\n(and ${messageIds.length - 5} more)` : "";
      result = {
        messageIds,
        summary: `Found ${messageIds.length} message(s):\n${lines.join("\n")}${extra}`,
      };
      break;
    }

    case "reply":
      result = {
        messageIds: [],
        summary: "Reply is not yet supported — please compose replies manually.",
      };
      break;

    default:
      result = { messageIds: [], summary: "Unknown intent." };
  }

  await writeAuditLog(userId, account.id, plan.intent, result.messageIds, plan.id);
  return result;
}
