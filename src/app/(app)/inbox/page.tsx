import { MailList } from "@/components/mail-list";

export default function InboxPage() {
  return (
    <section className="page-container page-container-wide">
      <div className="mb-8">
        <p className="eyebrow">Gmail</p>
        <h1 className="page-title">Inbox</h1>
        <p className="page-description">
          Review recent messages. Use Signal chat when you want the agent to act.
        </p>
      </div>
      <MailList />
    </section>
  );
}
