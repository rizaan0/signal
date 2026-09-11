/**
 * Movement-only primitives from the Liquid UI playground remix.
 * Enter/morph keeps the 620ms ease-in-out; leave uses ease-out so fade
 * does not stall then drop through the steep middle of that curve.
 * Skiper63 remains the visual/surface layer; this file does not render shapes.
 */
export const LIQUID_MORPH_MS = 620;
export const LIQUID_LEAVE_MS = 480;

export const LIQUID_EASE_CSS = "cubic-bezier(0.65, 0, 0.35, 1)";

export const liquidEase = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const morphEase = [0.65, 0, 0.35, 1] as const;
const leaveEase = [0.2, 0, 0, 1] as const;

export const liquidMorphTransition = {
  type: "tween" as const,
  duration: LIQUID_MORPH_MS / 1000,
  ease: morphEase,
};

export const liquidLeaveTransition = {
  type: "tween" as const,
  duration: LIQUID_LEAVE_MS / 1000,
  ease: leaveEase,
  opacity: {
    type: "tween" as const,
    duration: 0.52,
    ease: [0.33, 0, 0.2, 1] as const,
  },
  filter: {
    type: "tween" as const,
    duration: 0.5,
    ease: leaveEase,
  },
};

export const liquidReducedTransition = {
  type: "tween" as const,
  duration: 0.01,
  ease: "linear" as const,
};

export const liquidEnter = {
  opacity: 0,
  x: 0,
  y: 48,
  scaleX: 0.9,
  scaleY: 0.82,
  filter: "blur(8px)",
};

export const liquidIdle = {
  opacity: 1,
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  filter: "blur(0px)",
};

export const liquidLeave = {
  opacity: 0,
  x: 0,
  y: -12,
  scaleX: 0.99,
  scaleY: 0.99,
  filter: "blur(4px)",
  transition: liquidLeaveTransition,
};

export const liquidDrawerHidden = {
  opacity: 0,
  x: "-70%",
  y: 0,
  scaleX: 0.98,
  scaleY: 1,
  filter: "blur(4px)",
  transition: liquidLeaveTransition,
};

/** Composer menus open downward, away from the input. */
export const liquidMenuEnter = {
  opacity: 0,
  x: 0,
  y: 14,
  scaleX: 0.96,
  scaleY: 0.94,
  filter: "blur(6px)",
};

export const liquidMenuLeave = {
  opacity: 0,
  x: 0,
  y: 10,
  scaleX: 0.98,
  scaleY: 0.98,
  filter: "blur(4px)",
  transition: liquidLeaveTransition,
};
