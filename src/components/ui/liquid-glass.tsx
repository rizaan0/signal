"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, type MotionStyle } from "framer-motion";
import { cn } from "@/lib/utils";

/** Light chip fill so glass reads on white, matching Flash composer pills. */
export const SKY_BG = "linear-gradient(180deg, #f4f7fb 0%, #e4ebf3 100%)";
export const SKY_BG_DARK = "#25252d";

export type LiquidGlassProps = {
  children: ReactNode;
  className?: string;
  scale?: number;
  radius?: string;
  hoverable?: boolean;
  dark?: boolean;
  static?: boolean;
  background?: string;
  whileTap?: { scale: number };
  transition?: {
    type?: "spring" | "tween";
    stiffness?: number;
    damping?: number;
  };
  as?: "div" | "details";
  open?: boolean;
  name?: string;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
};

function displacementUri(
  width: number,
  height: number,
  radiusPx: number,
  lightness: number,
) {
  const w = Math.max(2, Math.round(width / 2));
  const h = Math.max(2, Math.round(height / 2));
  const r = Math.min(radiusPx / 2, w / 2, h / 2);
  const border = Math.min(w, h) * 0.08;
  const svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="red" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="blue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect width="${w}" height="${h}" fill="black"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#red)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#blue)" style="mix-blend-mode:difference"/><rect x="${border}" y="${border}" width="${Math.max(0, w - border * 2)}" height="${Math.max(0, h - border * 2)}" rx="${r}" fill="hsl(0 0% ${lightness}% / 0.9)" style="filter:blur(5px)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function LiquidGlass({
  children,
  className,
  scale = 0.4,
  radius = "9999px",
  hoverable = true,
  dark = false,
  static: isStatic = false,
  background = SKY_BG,
  whileTap,
  transition = { type: "spring", stiffness: 500, damping: 18 },
  as = "div",
  open,
  name,
  onToggle,
}: LiquidGlassProps) {
  const reduceMotion = useReducedMotion();
  const filterId = `liquid-glass-${useId().replace(/:/g, "")}`;
  const rootRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 160, height: 44 });
  const pullX = useMotionValue(0);
  const pullY = useMotionValue(0);
  const x = useSpring(pullX, { stiffness: 420, damping: 28, mass: 0.4 });
  const y = useSpring(pullY, { stiffness: 420, damping: 28, mass: 0.4 });
  const magnetic = hoverable && !isStatic && !reduceMotion;
  const tap = magnetic && whileTap && !reduceMotion ? whileTap : undefined;
  const displacement = Math.max(8, scale * 100);
  const radiusPx = radius.endsWith("px") ? parseFloat(radius) : 9999;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const map = useMemo(
    () => displacementUri(size.width, size.height, radiusPx, dark ? 28 : 58),
    [size.width, size.height, radiusPx, dark],
  );

  const frost = dark ? "rgb(255 255 255 / 0.05)" : "rgb(255 255 255 / 0.28)";
  const visualStyle = {
    borderRadius: radius,
    background,
    x: magnetic ? x : 0,
    y: magnetic ? y : 0,
  } satisfies MotionStyle;

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!magnetic) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    pullX.set(Math.max(-8, Math.min(8, dx * 0.08)));
    pullY.set(Math.max(-6, Math.min(6, dy * 0.08)));
  }

  const lens = (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute overflow-hidden",
          as === "details" ? "inset-x-0 top-0 h-8" : "inset-0",
        )}
        style={{
          borderRadius: radius,
          background: frost,
          backdropFilter: `url(#${filterId}) blur(14px) saturate(1.35)`,
          WebkitBackdropFilter: `url(#${filterId}) blur(14px) saturate(1.35)`,
          boxShadow: dark
            ? "inset 0 1px 0 rgb(255 255 255 / 0.14), 0 0 0 1px rgb(15 23 42 / 0.2)"
            : "inset 0 1px 0 rgb(255 255 255 / 0.72), 0 0 0 1px rgb(15 23 42 / 0.08), 0 1px 2px rgb(15 23 42 / 0.04)",
        }}
      />
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width="100%" height="100%" result="map" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={displacement}
              xChannelSelector="R"
              yChannelSelector="B"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="0.4" />
          </filter>
        </defs>
      </svg>
    </>
  );

  const motionProps = {
    className: cn(
      "relative inline-flex overflow-hidden",
      as === "details" && "overflow-visible",
      className,
    ),
    style: visualStyle,
    onPointerMove,
    onPointerLeave: () => {
      pullX.set(0);
      pullY.set(0);
    },
    whileTap: tap,
    transition: reduceMotion ? { duration: 0 } : transition,
  };

  if (as === "details") {
    return (
      <motion.details
        ref={rootRef as never}
        {...motionProps}
        open={open}
        name={name}
        onToggle={onToggle}
      >
        {lens}
        {children}
      </motion.details>
    );
  }

  return (
    <motion.div ref={rootRef as never} {...motionProps}>
      {lens}
      {children}
    </motion.div>
  );
}
