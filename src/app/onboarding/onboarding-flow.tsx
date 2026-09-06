"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "connect" | "indexing" | "done";

const INDEXING_STEPS = [
  "Connecting to Gmail…",
  "Fetching inbox stats…",
  "Reading message headers…",
  "Preparing your inbox…",
  "Almost done…",
];

function ConnectStep({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gmail/connect", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to connect");
      }
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
        📬
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connect Gmail</h1>
        <p className="mt-2 max-w-xs text-sm text-zinc-500">
          Signed in as <strong>{email}</strong>. Connect a Gmail account to get started.
        </p>
      </div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex h-11 items-center justify-center rounded-full bg-foreground px-8 text-sm font-medium text-background disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Connect Gmail"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function IndexingStep({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const calledDone = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((i) => {
        const next = i + 1;
        if (next >= INDEXING_STEPS.length) {
          clearInterval(timer);
          if (!calledDone.current) {
            calledDone.current = true;
            onDone();
          }
        }
        return next;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
        ⚡
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Setting up…</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {INDEXING_STEPS[Math.min(stepIndex, INDEXING_STEPS.length - 1)]}
        </p>
      </div>
      <div className="flex gap-1">
        {INDEXING_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${
              i <= stepIndex ? "bg-foreground" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function DoneStep() {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl dark:bg-zinc-800">
        ✅
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Gmail connected. Redirecting to your inbox agent…
        </p>
      </div>
    </div>
  );
}

export function OnboardingFlow({
  email,
  startPhase,
}: {
  email: string;
  startPhase: Phase;
}) {
  const [phase, setPhase] = useState<Phase>(startPhase);
  const router = useRouter();

  function handleIndexingDone() {
    setPhase("done");
    setTimeout(() => router.push("/chat"), 1500);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      {phase === "connect" && <ConnectStep email={email} />}
      {phase === "indexing" && <IndexingStep onDone={handleIndexingDone} />}
      {phase === "done" && <DoneStep />}
    </main>
  );
}
