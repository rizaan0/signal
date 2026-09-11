"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ThinkingLevel } from "@/lib/app-data";
import {
  ChevronDownIcon,
  MicIcon,
  SendIcon,
} from "@/components/icons";
import { SquircleSurface } from "@/components/ui comp/skiper63";
import { GlassButton } from "@/components/ui/glass-button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  modelDescription,
  modelDisplayName,
  THINKING_LEVEL_COPY,
} from "@/lib/model-display";
import {
  liquidIdle,
  liquidMenuEnter,
  liquidMenuLeave,
  liquidMorphTransition,
  liquidReducedTransition,
} from "@/lib/liquid-motion";

type ComposerMenu = "model" | "thinking";

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
  const [openMenu, setOpenMenu] = useState<ComposerMenu | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const menuTransition = reduceMotion ? liquidReducedTransition : liquidMorphTransition;
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

  useEffect(() => {
    if (!openMenu) return;
    const close = (event: MouseEvent) => {
      if (!menusRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [openMenu]);

  function toggleMenu(id: ComposerMenu, nextOpen: boolean) {
    setOpenMenu(nextOpen ? id : (current) => (current === id ? null : current));
  }

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
      <div ref={menusRef} className="flex flex-wrap items-center gap-1.5 px-2 pb-2">
        <LiquidGlass
          as="details"
          className="composer-menu"
          scale={0.4}
          radius="9999px"
          static
          name="composer-menu"
          open={openMenu === "model"}
          onToggle={(event) => toggleMenu("model", event.currentTarget.open)}
        >
          <summary className="relative z-[1] flex min-h-8 cursor-pointer list-none items-center gap-1 px-2.5 text-[11px] font-medium text-primary">
            <span className="max-w-40 truncate">{modelDisplayName(model)}</span>
            <ChevronDownIcon className="size-3" />
          </summary>
          <AnimatePresence initial={false}>
            {openMenu === "model" ? (
              <motion.div
                key="model-menu"
                className="composer-popover composer-popover-model start-0"
                initial={reduceMotion ? false : liquidMenuEnter}
                animate={liquidIdle}
                exit={reduceMotion ? { opacity: 0, transition: liquidReducedTransition } : liquidMenuLeave}
                transition={menuTransition}
                style={{ transformOrigin: "20% 0%" }}
              >
                <div className="flex items-center gap-2 whitespace-nowrap text-xs" aria-current="true">
                  <span className="font-medium text-primary">{modelDisplayName(model)}</span>
                  {modelDescription(model) ? (
                    <span className="composer-option-desc">{modelDescription(model)}</span>
                  ) : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </LiquidGlass>

        <LiquidGlass
          as="details"
          className="composer-menu"
          scale={0.4}
          radius="9999px"
          static
          name="composer-menu"
          open={openMenu === "thinking"}
          onToggle={(event) => toggleMenu("thinking", event.currentTarget.open)}
        >
          <summary className="relative z-[1] flex min-h-8 cursor-pointer list-none items-center gap-1 px-2.5 text-[11px] font-medium text-primary">
            <span>{THINKING_LEVEL_COPY[thinkingLevel].label}</span>
            <ChevronDownIcon className="size-3" />
          </summary>
          <AnimatePresence initial={false}>
            {openMenu === "thinking" ? (
              <motion.div
                key="thinking-menu"
                className="composer-popover start-0"
                role="listbox"
                aria-label="Reasoning level"
                initial={reduceMotion ? false : liquidMenuEnter}
                animate={liquidIdle}
                exit={reduceMotion ? { opacity: 0, transition: liquidReducedTransition } : liquidMenuLeave}
                transition={menuTransition}
                style={{ transformOrigin: "20% 0%" }}
              >
                {(["low", "medium", "high"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="option"
                    aria-selected={thinkingLevel === level}
                    aria-pressed={thinkingLevel === level}
                    onClick={() => {
                      onThinkingLevelChange(level);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="font-medium text-primary">{THINKING_LEVEL_COPY[level].label}</span>
                    <span className="composer-option-desc">
                      {THINKING_LEVEL_COPY[level].description}
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </LiquidGlass>

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
          className="composer-icon-button"
        >
          <MicIcon className="size-[1.1rem]" />
        </button>
        <GlassButton
          type="button"
          size="icon"
          onClick={attemptSend}
          disabled={pending}
          aria-label="Send message"
        >
          <SendIcon className="size-[1.1rem]" />
        </GlassButton>
      </div>
      <p id="agent-message-hint" className="sr-only">Press Control or Command and Enter to send.</p>
      <p id="agent-message-error" role="alert" className="px-4 pb-2 text-xs text-danger">
        {validationError}
      </p>
      <p className="sr-only" aria-live="polite">{speechStatus}</p>
    </SquircleSurface>
  );
}
