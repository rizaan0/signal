import { auth } from "@/auth";
import { listConversations } from "@/lib/app-data";
import { ConversationList } from "@/components/conversation-list";

export default async function ConversationsPage() {
  const session = await auth();
  const conversations = session?.user?.id
    ? await listConversations(session.user.id, 100)
    : [];

  return (
    <section className="page-container">
      <div className="mb-8">
        <p className="eyebrow">History</p>
        <h1 className="page-title">Conversations</h1>
        <p className="page-description">
          Reopen a previous Signal session or search the messages inside it.
        </p>
      </div>
      <ConversationList initial={conversations} />
    </section>
  );
}
