"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  liquidExitTransition,
  liquidMorphTransition,
  liquidReducedTransition,
  liquidSurfaceTransition,
} from "@/lib/liquid-motion";

export function LiquidPresence({
  id,
  children,
  className,
  morph = false,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  morph?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const enter = reduceMotion
    ? liquidReducedTransition
    : morph
      ? liquidMorphTransition
      : liquidSurfaceTransition;
  const exit = reduceMotion ? liquidReducedTransition : liquidExitTransition;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        className={className}
        initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -12, filter: "blur(4px)", transition: exit }}
        transition={enter}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
