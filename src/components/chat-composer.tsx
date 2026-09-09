"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ThinkingLevel } from "@/lib/app-data";
import {
  ChevronDownIcon,
  MicIcon,
  SendIcon,
} from "@/components/icons";
import { SquircleSurface } from "@/components/ui comp/ui comp/skiper63";

type SpeechResultEvent = {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  pending,
  model,
  thinkingLevel,
  onThinkingLevelChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  pending: boolean;
  model: string;
  thinkingLevel: ThinkingLevel;
  onThinkingLevelChange: (level: ThinkingLevel) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [validationError, setValidationError] = useState("");
  const speechSupported = useSyncExternalStore(
    () => () => undefined,
    () => Boolean(speechRecognitionConstructor()),
    () => false,
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  function toggleVoice() {
    if (!speechSupported) {
      setSpeechStatus("Voice input is unavailable in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setSpeechStatus("Voice input stopped.");
      return;
    }

    const Constructor = speechRecognitionConstructor();
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    let committed = value.trim();
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = 0; index < event.results.length; index++) {
        const transcript = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) {
          committed = `${committed} ${transcript}`.trim();
        } else {
          interim += transcript;
        }
      }
      onChange(`${committed} ${interim}`.trim());
    };
    recognition.onerror = () => {
      setListening(false);
      setSpeechStatus("Voice input could not continue.");
    };
    recognition.onend = () => {
      setListening(false);
      setSpeechStatus("Voice input stopped.");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setSpeechStatus("Listening. Speak now.");
  }

  function attemptSend() {
    if (!value.trim()) {
      setValidationError("Enter a message before sending.");
      textareaRef.current?.focus();
      return;
    }
    setValidationError("");
    onSend();
  }

  return (
    <SquircleSurface
      className="composer"
      contentClassName="squircle-black-text flex flex-col"
      surfaceClassName="composer-surface bg-white"
      seedRadius={18}
      blurValue={7}
      colorMatrixValue={20}
      alphaValue={-7}
    >
      <label htmlFor="agent-message" className="sr-only">Message Signal</label>
      <textarea
        ref={textareaRef}
        id="agent-message"
        rows={1}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (validationError) setValidationError("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            if (!pending) attemptSend();
          }
        }}
        placeholder="Ask Signal to work with your inbox…"
        disabled={pending}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? "agent-message-error" : "agent-message-hint"}
        className="max-h-[180px] min-h-14 w-full resize-none bg-transparent px-4 pt-4 text-base leading-6 outline-none placeholder:text-tertiary disabled:opacity-60 sm:text-sm"
      />
      <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
        <details className="composer-menu">
          <summary>
            <span className="max-w-28 truncate">{model}</span>
            <ChevronDownIcon className="size-3.5" />
          </summary>
          <div className="composer-popover start-0">
            <p className="px-3 py-2 text-xs text-tertiary">Configured model</p>
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs font-medium text-accent">
              {model}
            </p>
          </div>
        </details>

        <details className="composer-menu">
          <summary>
            <span className="capitalize">{thinkingLevel}</span>
            <ChevronDownIcon className="size-3.5" />
          </summary>
          <div className="composer-popover start-0">
            <p className="px-3 py-2 text-xs text-tertiary">Reasoning</p>
            {(["low", "medium", "high"] as const).map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={thinkingLevel === level}
                onClick={(event) => {
                  onThinkingLevelChange(level);
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }}
                className="w-full text-start capitalize"
              >
                {level}
              </button>
            ))}
          </div>
        </details>

        <span className="flex-1" />
        <button
          type="button"
          onClick={toggleVoice}
          disabled={pending}
          aria-disabled={!speechSupported || undefined}
          aria-label={
            !speechSupported
              ? "Voice input is unavailable in this browser"
              : listening
                ? "Stop voice input"
                : "Start voice input"
          }
          aria-pressed={listening}
          className={`composer-icon-button ${listening ? "bg-accent-soft text-accent" : ""}`}
        >
          <MicIcon className="size-[1.1rem]" />
        </button>
        <button
          type="button"
          onClick={attemptSend}
          disabled={pending}
          aria-label="Send message"
          className="composer-send"
        >
          <SendIcon className="size-[1.1rem]" />
        </button>
      </div>
      <p id="agent-message-hint" className="sr-only">Press Control or Command and Enter to send.</p>
      <p id="agent-message-error" role="alert" className="px-4 pb-2 text-xs text-danger">
        {validationError}
      </p>
      <p className="sr-only" aria-live="polite">{speechStatus}</p>
    </SquircleSurface>
  );
}
