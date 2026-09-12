"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import React, {
  forwardRef,
  type ComponentPropsWithoutRef,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const inputWrapperClassName = "relative block w-full";
const inputClassName = "caret-transparent";
const CARET_SPRING = { stiffness: 500, damping: 30, mass: 0.5 };

type TextControl = HTMLInputElement | HTMLTextAreaElement;

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

function passwordChar() {
  if (typeof navigator === "undefined") return "\u2022";
  return navigator.userAgent.match(/firefox|fxios/i) ? "\u25CF" : "\u2022";
}

function caretIndex(target: TextControl) {
  const start = target.selectionStart;
  const end = target.selectionEnd;

  // Browsers preserve email validation but do not expose its selection range.
  // In that case, keep the animated caret at the typed value's trailing edge.
  if (start === null || end === null) return target.value.length;
  if (start === end) return start;
  return target.selectionDirection === "backward" ? start : end;
}

/**
 * Shared caret engine from Skiper 106. The native control remains responsible
 * for value, selection, keyboard behavior, validation, and scrolling.
 */
function useSmoothCaret({
  forwardedRef,
  value,
  multiline = false,
}: {
  forwardedRef: Ref<TextControl>;
  value: string;
  multiline?: boolean;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const controlElementRef = useRef<TextControl>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const caretX = useMotionValue(0);
  const caretY = useMotionValue(0);
  const caretOpacity = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();

  const spring = prefersReducedMotion
    ? { stiffness: 10000, damping: 100, mass: 0.1 }
    : CARET_SPRING;
  const springCaretX = useSpring(caretX, spring);
  const springCaretY = useSpring(caretY, spring);

  const updateCaretFromControl = useCallback((target: TextControl) => {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    if (start !== null && end !== null && start !== end) {
      caretOpacity.set(0);
      return;
    }

    const styles = window.getComputedStyle(target);
    const index = caretIndex(target);
    const fontSize = parseFloat(styles.fontSize) || 16;
    const caretHeight = fontSize * 0.9;
    let x = target.offsetLeft;
    let y = target.offsetTop;

    if (multiline && target instanceof HTMLTextAreaElement) {
      const mirror = mirrorRef.current;
      const marker = markerRef.current;
      if (!mirror || !marker) return;

      mirror.style.width = `${target.clientWidth}px`;
      mirror.style.boxSizing = styles.boxSizing;
      mirror.style.padding = styles.padding;
      mirror.style.borderWidth = styles.borderWidth;
      mirror.style.borderStyle = "solid";
      mirror.style.borderColor = "transparent";
      mirror.style.font = styles.font;
      mirror.style.letterSpacing = styles.letterSpacing;
      mirror.style.lineHeight = styles.lineHeight;
      mirror.style.textTransform = styles.textTransform;
      mirror.style.textIndent = styles.textIndent;
      mirror.style.textAlign = styles.textAlign;
      mirror.style.direction = styles.direction;
      mirror.style.tabSize = styles.tabSize;
      mirror.style.whiteSpace = "pre-wrap";
      mirror.style.overflowWrap = styles.overflowWrap;
      mirror.style.wordBreak = styles.wordBreak;

      mirror.textContent = target.value.slice(0, index);
      mirror.append(marker);

      const lineHeight =
        styles.lineHeight === "normal"
          ? fontSize * 1.2
          : parseFloat(styles.lineHeight) || fontSize * 1.2;
      x += marker.offsetLeft - target.scrollLeft;
      y +=
        marker.offsetTop -
        target.scrollTop +
        Math.max(0, (lineHeight - caretHeight) / 2);
    } else {
      const measure = measureRef.current;
      if (!measure || !(target instanceof HTMLInputElement)) return;

      let measuredFontSize = styles.fontSize;
      if (
        target.type === "password" &&
        passwordChar() === "\u2022" &&
        !navigator.userAgent.match(/chrome|chromium|crios/i)
      ) {
        measuredFontSize = `${fontSize + 6.25}px`;
      }

      measure.style.font = `${styles.fontStyle} ${styles.fontWeight} ${measuredFontSize} ${styles.fontFamily}`;
      measure.style.letterSpacing = styles.letterSpacing;
      measure.style.fontFeatureSettings = styles.fontFeatureSettings;
      measure.style.fontVariationSettings = styles.fontVariationSettings;
      measure.style.textTransform = styles.textTransform;
      measure.textContent =
        target.type === "password"
          ? passwordChar().repeat(index)
          : target.value.slice(0, index);

      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const absoluteWidth =
        measure.textContent.length > 0
          ? measure.offsetWidth + paddingLeft
          : paddingLeft - 1;
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight =
        target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;

      if (absoluteWidth > visibleRight) {
        target.scrollLeft = Math.min(
          absoluteWidth - target.clientWidth + paddingRight,
          maxScroll,
        );
      } else if (absoluteWidth < visibleLeft) {
        target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
      }

      x += absoluteWidth - target.scrollLeft;
      y += Math.max(0, (target.clientHeight - caretHeight) / 2);
    }

    const visible =
      x >= target.offsetLeft - 1 &&
      x <= target.offsetLeft + target.clientWidth + 1 &&
      y >= target.offsetTop - 1 &&
      y <= target.offsetTop + target.clientHeight - caretHeight + 1;

    caretX.set(x);
    caretY.set(y);
    caretOpacity.set(visible ? 1 : 0);
  }, [caretOpacity, caretX, caretY, multiline]);

  useEffect(() => {
    const control = controlElementRef.current;
    if (control && document.activeElement === control) {
      updateCaretFromControl(control);
    }
  }, [updateCaretFromControl, value]);

  useEffect(() => {
    const control = controlElementRef.current;
    const container = containerRef.current;
    if (!control || !container) return;

    const updateIfFocused = () => {
      if (document.activeElement === control) {
        updateCaretFromControl(control);
      }
    };
    const handleSelectionChange = () => {
      if (document.activeElement !== control) return;
      requestAnimationFrame(updateIfFocused);
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.fonts.addEventListener("loadingdone", updateIfFocused);
    void document.fonts.ready.then(updateIfFocused);
    control.addEventListener("scroll", updateIfFocused);

    const resizeObserver = new ResizeObserver(updateIfFocused);
    resizeObserver.observe(container);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.fonts.removeEventListener("loadingdone", updateIfFocused);
      control.removeEventListener("scroll", updateIfFocused);
      resizeObserver.disconnect();
    };
  }, [updateCaretFromControl]);

  const setControlRef = useCallback(
    (node: TextControl | null) => {
      controlElementRef.current = node;
      assignRef(forwardedRef, node);
    },
    [forwardedRef],
  );

  const showCaret = useCallback(
    (target: TextControl) => {
      requestAnimationFrame(() => updateCaretFromControl(target));
    },
    [updateCaretFromControl],
  );

  const hideCaret = useCallback(() => {
    caretOpacity.set(0);
  }, [caretOpacity]);

  return {
    caretOpacity,
    containerRef,
    hideCaret,
    markerRef,
    measureRef,
    mirrorRef,
    setControlRef,
    showCaret,
    springCaretX,
    springCaretY,
  };
}

type CaretLayersProps = Pick<
  ReturnType<typeof useSmoothCaret>,
  | "caretOpacity"
  | "markerRef"
  | "measureRef"
  | "mirrorRef"
  | "springCaretX"
  | "springCaretY"
>;

function CaretLayers({
  caretOpacity,
  markerRef,
  measureRef,
  mirrorRef,
  springCaretX,
  springCaretY,
}: CaretLayersProps) {
  return (
    <>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre"
      />
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0"
      >
        <span ref={markerRef}>{"\u200b"}</span>
      </div>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-[2] h-[0.9em] w-0.5 bg-primary"
        style={{
          x: springCaretX,
          y: springCaretY,
          opacity: caretOpacity,
        }}
      />
    </>
  );
}

type InputFieldProps = ComponentPropsWithoutRef<"input"> & {
  wrapperClassName?: string;
};

type TextInputType =
  | "email"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "url";

type SmoothInputProps = Omit<InputFieldProps, "type"> & {
  type?: TextInputType;
};

const Input = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <span className={cn(inputWrapperClassName, wrapperClassName)}>
      <input ref={ref} className={className} {...props} />
    </span>
  ),
);
Input.displayName = "Input";

const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  (
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      style,
      type = "text",
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(
      defaultValue == null ? "" : String(defaultValue),
    );
    const controlled = value !== undefined;
    const currentValue = controlled ? String(value) : internalValue;
    const {
      caretOpacity,
      containerRef,
      hideCaret,
      markerRef,
      measureRef,
      mirrorRef,
      setControlRef,
      showCaret,
      springCaretX,
      springCaretY,
    } = useSmoothCaret({
      forwardedRef: ref as Ref<TextControl>,
      value: currentValue,
    });

    return (
      <span
        ref={containerRef}
        className={cn(inputWrapperClassName, wrapperClassName)}
      >
        <input
          {...props}
          ref={setControlRef as Ref<HTMLInputElement>}
          type={type}
          value={currentValue}
          className={cn("block", inputClassName, className)}
          style={{ ...style, caretColor: "transparent" }}
          onFocus={(event) => {
            showCaret(event.currentTarget);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            hideCaret();
            onBlur?.(event);
          }}
          onChange={(event) => {
            if (!controlled) setInternalValue(event.currentTarget.value);
            onChange?.(event);
            showCaret(event.currentTarget);
          }}
        />
        <CaretLayers
          caretOpacity={caretOpacity}
          markerRef={markerRef}
          measureRef={measureRef}
          mirrorRef={mirrorRef}
          springCaretX={springCaretX}
          springCaretY={springCaretY}
        />
      </span>
    );
  },
);
SmoothInput.displayName = "SmoothInput";

type SmoothTextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  wrapperClassName?: string;
};

const SmoothTextarea = forwardRef<HTMLTextAreaElement, SmoothTextareaProps>(
  (
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      style,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(
      defaultValue == null ? "" : String(defaultValue),
    );
    const controlled = value !== undefined;
    const currentValue = controlled ? String(value) : internalValue;
    const {
      caretOpacity,
      containerRef,
      hideCaret,
      markerRef,
      measureRef,
      mirrorRef,
      setControlRef,
      showCaret,
      springCaretX,
      springCaretY,
    } = useSmoothCaret({
      forwardedRef: ref as Ref<TextControl>,
      value: currentValue,
      multiline: true,
    });

    return (
      <span
        ref={containerRef}
        className={cn(inputWrapperClassName, wrapperClassName)}
      >
        <textarea
          {...props}
          ref={setControlRef as Ref<HTMLTextAreaElement>}
          value={currentValue}
          className={cn("block", inputClassName, className)}
          style={{ ...style, caretColor: "transparent" }}
          onFocus={(event) => {
            showCaret(event.currentTarget);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            hideCaret();
            onBlur?.(event);
          }}
          onChange={(event) => {
            if (!controlled) setInternalValue(event.currentTarget.value);
            onChange?.(event);
            showCaret(event.currentTarget);
          }}
        />
        <CaretLayers
          caretOpacity={caretOpacity}
          markerRef={markerRef}
          measureRef={measureRef}
          mirrorRef={mirrorRef}
          springCaretX={springCaretX}
          springCaretY={springCaretY}
        />
      </span>
    );
  },
);
SmoothTextarea.displayName = "SmoothTextarea";

const Skiper106 = () => (
  <div className="flex h-full w-full flex-col items-center justify-center bg-muted text-foreground">
    <div className="-mt-10 mb-20 grid content-start justify-items-center gap-6 text-center">
      <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-linear-to-b after:from-transparent after:to-foreground after:content-['']">
        Try typing below
      </span>
    </div>
    <div className="flex w-full flex-col items-center space-y-4">
      <SmoothInput
        aria-label="Smooth caret input"
        placeholder="smooth input"
        className="w-full bg-transparent text-2xl outline-none placeholder:text-foreground/40"
        wrapperClassName="max-w-[420px] rounded-2xl bg-muted2 p-4"
      />
      <Input
        placeholder="normal input"
        className="w-full bg-transparent text-2xl outline-none placeholder:text-foreground/40"
        wrapperClassName="max-w-[420px] rounded-2xl bg-muted2 p-4"
        aria-label="Normal input"
      />
    </div>
  </div>
);

export { Input, Skiper106, SmoothInput, SmoothTextarea };
