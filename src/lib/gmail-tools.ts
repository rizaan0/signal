import "server-only";
import { z } from "zod";
import { getGmailClient } from "@/lib/gmail";
import { getSupabase } from "@/lib/supabase";

export type ToolContext = {
  userId: string;
  runId: string;
};

type ToolDef<T> = {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  input: z.ZodType<T>;
  requiresApproval: boolean;
  execute: (ctx: ToolContext, args: T) => Promise<string>;
};

const MAX_IDS = 10;

const messageIdsSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1).max(MAX_IDS),
});

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
  }
}

async function writeAuditLog(
  userId: string,
  accountId: string,
  action: string,
  messageIds: string[],
  runId: string,
): Promise<void> {
  try {
    await getSupabase().from("audit_logs").insert({
      user_id: userId,
      gmail_account_id: accountId,
      action,
      message_ids: messageIds,
      plan_id: runId,
    });
  } catch {
    console.error("audit_log write failed — migration may not be applied");
  }
}

function headerMap(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers ?? []) {
    if (h.name) map[h.name] = h.value ?? "";
  }
  return map;
}

function encodeRawMessage(headers: string[], body: string): string {
  const raw = [...headers, "", body].join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

const search_messages: ToolDef<{ query: string; maxResults?: number }> = {
  name: "search_messages",
  description: "Search the user's Gmail inbox. Returns message ids, subjects, senders, and snippets.",
  schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Gmail search query, e.g. newer_than:7d is:unread",
      },
      maxResults: {
        type: "number",
        description: `Number of messages to return (max ${MAX_IDS})`,
      },
    },
    required: ["query"],
  },
  input: z.object({
    query: z.string().min(1),
    maxResults: z.number().int().min(1).max(MAX_IDS).optional(),
  }),
  requiresApproval: false,
  async execute(ctx, args) {
    const { client: gmail } = await getGmailClient(ctx.userId);
    const maxResults = Math.min(args.maxResults ?? MAX_IDS, MAX_IDS);
    const listResp = await gmail.users.messages.list({
      userId: "me",
      q: args.query,
      maxResults,
    });
    const items = listResp.data.messages ?? [];
    if (items.length === 0) {
      return JSON.stringify({ messages: [], count: 0 });
    }
    const details = await Promise.all(
      items.map((m) =>
        gmail.users.messages.get({
          userId: "me",
          id: m.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        }),
      ),
    );
    const messages = details.map((d) => {
      const hdrs = headerMap(d.data.payload?.headers);
      return {
        id: d.data.id,
        threadId: d.data.threadId,
        subject: hdrs.Subject ?? "(no subject)",
        from: hdrs.From ?? "Unknown",
        date: hdrs.Date ?? "",
        snippet: d.data.snippet ?? "",
      };
    });
    return JSON.stringify({ count: messages.length, messages });
  },
};

const get_message: ToolDef<{ id: string }> = {
  name: "get_message",
  description: "Fetch one message's headers and snippet by id. Does not return raw tokens or full MIME.",
  schema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Gmail message id" },
    },
    required: ["id"],
  },
  input: z.object({ id: z.string().min(1) }),
  requiresApproval: false,
  async execute(ctx, args) {
    const { client: gmail } = await getGmailClient(ctx.userId);
    const d = await gmail.users.messages.get({
      userId: "me",
      id: args.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date", "Message-ID"],
    });
    const hdrs = headerMap(d.data.payload?.headers);
    return JSON.stringify({
      id: d.data.id,
      threadId: d.data.threadId,
      subject: hdrs.Subject ?? "(no subject)",
      from: hdrs.From ?? "Unknown",
      to: hdrs.To ?? "",
      date: hdrs.Date ?? "",
      snippet: d.data.snippet ?? "",
      labelIds: d.data.labelIds ?? [],
    });
  },
};

const get_inbox_stats: ToolDef<Record<string, never>> = {
  name: "get_inbox_stats",
  description: "Return INBOX totals: messages, unread, threads.",
  schema: { type: "object", properties: {} },
  input: z.object({}),
  requiresApproval: false,
  async execute(ctx) {
    const { client: gmail } = await getGmailClient(ctx.userId);
    const label = await gmail.users.labels.get({ userId: "me", id: "INBOX" });
    return JSON.stringify({
      messagesTotal: label.data.messagesTotal ?? 0,
      messagesUnread: label.data.messagesUnread ?? 0,
      threadsTotal: label.data.threadsTotal ?? 0,
      threadsUnread: label.data.threadsUnread ?? 0,
    });
  },
};

const archive_messages: ToolDef<{ messageIds: string[] }> = {
  name: "archive_messages",
  description: "Remove the INBOX label from the given message ids (max 10).",
  schema: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "string" },
        description: `Gmail message ids to archive (max ${MAX_IDS})`,
      },
    },
    required: ["messageIds"],
  },
  input: messageIdsSchema,
  requiresApproval: true,
  async execute(ctx, args) {
    await checkRateLimit(ctx.userId);
    const { client: gmail, account } = await getGmailClient(ctx.userId);
    await Promise.all(
      args.messageIds.map((id) =>
        gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: { removeLabelIds: ["INBOX"] },
        }),
      ),
    );
    await writeAuditLog(ctx.userId, account.id, "archive", args.messageIds, ctx.runId);
    return JSON.stringify({
      archived: args.messageIds.length,
      messageIds: args.messageIds,
    });
  },
};

const trash_messages: ToolDef<{ messageIds: string[] }> = {
  name: "trash_messages",
  description: "Move the given message ids to Trash (max 10).",
  schema: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "string" },
        description: `Gmail message ids to trash (max ${MAX_IDS})`,
      },
    },
    required: ["messageIds"],
  },
  input: messageIdsSchema,
  requiresApproval: true,
  async execute(ctx, args) {
    await checkRateLimit(ctx.userId);
    const { client: gmail, account } = await getGmailClient(ctx.userId);
    await Promise.all(
      args.messageIds.map((id) =>
        gmail.users.messages.trash({ userId: "me", id }),
      ),
    );
    await writeAuditLog(ctx.userId, account.id, "trash", args.messageIds, ctx.runId);
    return JSON.stringify({
      trashed: args.messageIds.length,
      messageIds: args.messageIds,
    });
  },
};

const star_messages: ToolDef<{ messageIds: string[] }> = {
  name: "star_messages",
  description: "Add the STARRED label to the given message ids (max 10).",
  schema: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "string" },
        description: `Gmail message ids to star (max ${MAX_IDS})`,
      },
    },
    required: ["messageIds"],
  },
  input: messageIdsSchema,
  requiresApproval: true,
  async execute(ctx, args) {
    await checkRateLimit(ctx.userId);
    const { client: gmail, account } = await getGmailClient(ctx.userId);
    await Promise.all(
      args.messageIds.map((id) =>
        gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: { addLabelIds: ["STARRED"] },
        }),
      ),
    );
    await writeAuditLog(ctx.userId, account.id, "flag", args.messageIds, ctx.runId);
    return JSON.stringify({
      starred: args.messageIds.length,
      messageIds: args.messageIds,
    });
  },
};

const send_email: ToolDef<{ to: string; subject: string; body: string }> = {
  name: "send_email",
  description: "Send a new email from the connected Gmail account.",
  schema: {
    type: "object",
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string" },
      body: { type: "string", description: "Plain-text body" },
    },
    required: ["to", "subject", "body"],
  },
  input: z.object({
    to: z.string().min(1),
    subject: z.string(),
    body: z.string(),
  }),
  requiresApproval: true,
  async execute(ctx, args) {
    await checkRateLimit(ctx.userId);
    const { client: gmail, account } = await getGmailClient(ctx.userId);
    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodeRawMessage(
          [
            `To: ${args.to}`,
            `Subject: ${args.subject}`,
            "Content-Type: text/plain; charset=utf-8",
          ],
          args.body,
        ),
      },
    });
    const id = sent.data.id ?? "";
    await writeAuditLog(ctx.userId, account.id, "send", id ? [id] : [], ctx.runId);
    return JSON.stringify({ sent: true, id });
  },
};

const reply_to_message: ToolDef<{ messageId: string; body: string }> = {
  name: "reply_to_message",
  description: "Reply to an existing Gmail message in the same thread.",
  schema: {
    type: "object",
    properties: {
      messageId: { type: "string", description: "Gmail message id to reply to" },
      body: { type: "string", description: "Plain-text reply body" },
    },
    required: ["messageId", "body"],
  },
  input: z.object({
    messageId: z.string().min(1),
    body: z.string().min(1),
  }),
  requiresApproval: true,
  async execute(ctx, args) {
    await checkRateLimit(ctx.userId);
    const { client: gmail, account } = await getGmailClient(ctx.userId);
    const original = await gmail.users.messages.get({
      userId: "me",
      id: args.messageId,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Message-ID"],
    });
    const hdrs = headerMap(original.data.payload?.headers);
    const subject = hdrs.Subject ?? "";
    const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
    const to = hdrs.From ?? "";
    const messageIdHeader = hdrs["Message-ID"] ?? hdrs["Message-Id"] ?? "";
    const replyHeaders = [
      `To: ${to}`,
      `Subject: ${replySubject}`,
      "Content-Type: text/plain; charset=utf-8",
    ];
    if (messageIdHeader) {
      replyHeaders.push(`In-Reply-To: ${messageIdHeader}`);
      replyHeaders.push(`References: ${messageIdHeader}`);
    }
    const sent = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        threadId: original.data.threadId ?? undefined,
        raw: encodeRawMessage(replyHeaders, args.body),
      },
    });
    const id = sent.data.id ?? "";
    await writeAuditLog(ctx.userId, account.id, "reply", id ? [id] : [args.messageId], ctx.runId);
    return JSON.stringify({ sent: true, id, threadId: original.data.threadId });
  },
};

const TOOLS: Record<string, ToolDef<unknown>> = {
  search_messages: search_messages as ToolDef<unknown>,
  get_message: get_message as ToolDef<unknown>,
  get_inbox_stats: get_inbox_stats as ToolDef<unknown>,
  archive_messages: archive_messages as ToolDef<unknown>,
  trash_messages: trash_messages as ToolDef<unknown>,
  star_messages: star_messages as ToolDef<unknown>,
  send_email: send_email as ToolDef<unknown>,
  reply_to_message: reply_to_message as ToolDef<unknown>,
};

export function listToolDescriptors(): {
  name: string;
  description: string;
  schema: unknown;
}[] {
  return Object.values(TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    schema: t.schema,
  }));
}

export function toolRequiresApproval(name: string): boolean {
  return TOOLS[name]?.requiresApproval ?? false;
}

export function isAllowedTool(name: string): boolean {
  return name in TOOLS;
}

export async function executeTool(
  name: string,
  ctx: ToolContext,
  args: unknown,
): Promise<string> {
  const tool = TOOLS[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  const parsed = tool.input.parse(args);
  return tool.execute(ctx, parsed);
}
