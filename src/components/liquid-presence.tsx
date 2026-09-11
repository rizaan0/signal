"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  liquidEnter,
  liquidIdle,
  liquidLeave,
  liquidMorphTransition,
  liquidReducedTransition,
} from "@/lib/liquid-motion";

export function LiquidPresence({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? liquidReducedTransition : liquidMorphTransition;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        className={className}
        initial={reduceMotion ? false : liquidEnter}
        animate={liquidIdle}
        exit={
          reduceMotion
            ? { opacity: 0, transition: liquidReducedTransition }
            : liquidLeave
        }
        transition={transition}
        style={{ transformOrigin: "50% 50%" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
