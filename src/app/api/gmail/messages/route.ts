import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGmailClient, GmailError } from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "in:inbox";
  const accountEmail = searchParams.get("account") ?? undefined;
  const maxResults = Math.min(Number(searchParams.get("max") ?? "20"), 50);

  try {
    const { client: gmail } = await getGmailClient(
      session.user.id,
      accountEmail,
    );

    const listResp = await gmail.users.messages.list({
      userId: "me",
      q,
      maxResults,
    });

    const items = listResp.data.messages ?? [];
    if (items.length === 0) {
      return NextResponse.json({ messages: [] });
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
      const hdrs = d.data.payload?.headers ?? [];
      return {
        id: d.data.id,
        threadId: d.data.threadId,
        snippet: d.data.snippet,
        subject: hdrs.find((h) => h.name === "Subject")?.value ?? "",
        from: hdrs.find((h) => h.name === "From")?.value ?? "",
        date: hdrs.find((h) => h.name === "Date")?.value ?? "",
        labelIds: d.data.labelIds ?? [],
      };
    });

    return NextResponse.json({ messages });
  } catch (e) {
    if (e instanceof GmailError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
