export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: September 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-7 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="font-semibold text-foreground">What Flash does</h2>
          <p className="mt-2">
            Flash is a Gmail agent that lets you manage your inbox using natural
            language commands. You describe the task; Flash shows you a plan;
            you confirm before anything happens.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Data we access</h2>
          <p className="mt-2">
            With your explicit consent, Flash accesses your Gmail account to
            read, archive, trash, and flag messages. We access only what is
            necessary to execute the commands you approve.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Data we store</h2>
          <p className="mt-2">
            We store your email address, name, encrypted OAuth tokens, and the
            history of commands you have run. Tokens are encrypted at rest.
            We do not sell or share your data with third parties.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Deleting your data</h2>
          <p className="mt-2">
            You can revoke Gmail access at any time via your Google Account
            permissions page. Contact us to delete your Flash account and all
            stored data.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Questions? Email us at{" "}
            <a href="mailto:privacy@example.com" className="underline">
              privacy@example.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
