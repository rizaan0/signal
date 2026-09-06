import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGmailClient, GmailError } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountEmail = req.nextUrl.searchParams.get("account") ?? undefined;

  try {
    const { client: gmail } = await getGmailClient(
      session.user.id,
      accountEmail,
    );

    const label = await gmail.users.labels.get({
      userId: "me",
      id: "INBOX",
    });

    return NextResponse.json({
      messagesTotal: label.data.messagesTotal ?? 0,
      messagesUnread: label.data.messagesUnread ?? 0,
      threadsTotal: label.data.threadsTotal ?? 0,
      threadsUnread: label.data.threadsUnread ?? 0,
    });
  } catch (e) {
    if (e instanceof GmailError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
