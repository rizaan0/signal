/**
 * Movement-only primitives from the Liquid UI playground remix.
 * Skiper63 remains the visual/surface layer; this file does not render shapes.
 */
export const LIQUID_MORPH_MS = 620;
export const LIQUID_SURFACE_MS = 320;
export const LIQUID_EXIT_MS = 150;

export const LIQUID_EASE_CSS = "cubic-bezier(0.65, 0, 0.35, 1)";

export const liquidEase = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const liquidMorphTransition = {
  duration: LIQUID_MORPH_MS / 1000,
  ease: [0.65, 0, 0.35, 1] as const,
};

export const liquidSurfaceTransition = {
  duration: LIQUID_SURFACE_MS / 1000,
  ease: [0.65, 0, 0.35, 1] as const,
};

export const liquidExitTransition = {
  duration: LIQUID_EXIT_MS / 1000,
  ease: "easeOut" as const,
};

export const liquidReducedTransition = {
  duration: 0.01,
  ease: "linear" as const,
};
