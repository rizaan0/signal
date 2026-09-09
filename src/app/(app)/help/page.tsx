import Link from "next/link";

const EXAMPLES = [
  "Summarize unread emails from this week.",
  "Find the latest invoice from Acme.",
  "Archive newsletters older than a month.",
  "Draft a reply to the latest email from Jordan.",
];

export default function HelpPage() {
  return (
    <section className="page-container">
      <div className="mb-8">
        <p className="eyebrow">Guide</p>
        <h1 className="page-title">Help</h1>
        <p className="page-description">Get useful results while keeping control of your inbox.</p>
      </div>

      <div className="space-y-4">
        <article className="rounded-3xl border border-ui bg-elevated p-6">
          <h2 className="section-title">Ask naturally</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Tell Signal what outcome you want. Include a sender, time range, label, or topic when it matters.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((example) => (
              <li key={example} className="rounded-xl bg-surface px-4 py-3 text-sm">{example}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-ui bg-elevated p-6">
          <h2 className="section-title">Approvals keep you in control</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Signal can search and summarize automatically. Consequential actions such as sending,
            deleting, archiving, starring, and replying pause for your confirmation. Review the
            proposed action, then choose Confirm or Cancel.
          </p>
        </article>

        <article className="rounded-3xl border border-ui bg-elevated p-6">
          <h2 className="section-title">Privacy and connections</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Manage Gmail accounts and local preferences in Settings. You can also remove all Signal
            conversation history without changing any Gmail messages.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/settings" className="button-primary">Open Settings</Link>
            <Link href="/privacy" className="button-secondary">Privacy Policy</Link>
          </div>
        </article>
      </div>
    </section>
  );
}
