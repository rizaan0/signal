import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getSupabase } from "@/lib/supabase";
import { getUserPreferences } from "@/lib/app-data";

export const runtime = "nodejs";

const preferencePatch = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    defaultThinkingLevel: z.enum(["low", "medium", "high"]).optional(),
    notifyAgentCompletion: z.boolean().optional(),
    notifyApprovalNeeded: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    preferences: await getUserPreferences(session.user.id),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = preferencePatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });
  }

  const patch = parsed.data;
  const row: Record<string, unknown> = {
    user_id: session.user.id,
    updated_at: new Date().toISOString(),
  };
  if (patch.theme) row.theme = patch.theme;
  if (patch.defaultThinkingLevel) {
    row.default_thinking_level = patch.defaultThinkingLevel;
  }
  if (patch.notifyAgentCompletion !== undefined) {
    row.notify_agent_completion = patch.notifyAgentCompletion;
  }
  if (patch.notifyApprovalNeeded !== undefined) {
    row.notify_approval_needed = patch.notifyApprovalNeeded;
  }

  const { error } = await getSupabase()
    .from("user_preferences")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    const message =
      error.code === "PGRST205"
        ? "Apply supabase/migrations/0003_user_preferences.sql before saving preferences."
        : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: await getUserPreferences(session.user.id),
  });
}
