/**
 * Curated motion presets — configure timing, not a second animation engine.
 * Patterns ignore unsupported params (e.g. spring when effect has no spatial motion).
 */

export type MotionPresetId =
  | "natural"
  | "quiet"
  | "instant"
  | "fluid"
  | "precise"
  | "editorial"
  | "expressive";

export interface MotionConfig {
  preset?: MotionPresetId;
  /** Reveal / piece animation duration override (ms) */
  revealMs?: number;
  /** Delivery interval scale for simulated streaming */
  deliveryIntervalMs?: number;
  /** Initial opacity for fade-like reveals */
  initialOpacity?: number;
  /** Blur px for soft reveals (0 = none) */
  blurPx?: number;
  /** Vertical displacement px for block springs */
  displacementPx?: number;
  spring?: {
    stiffness?: number;
    damping?: number;
  };
}

export interface ResolvedMotion {
  preset: MotionPresetId;
  revealMs: number;
  deliveryIntervalMs: number;
  initialOpacity: number;
  blurPx: number;
  displacementPx: number;
  spring: { stiffness: number; damping: number };
}

const PRESETS: Record<MotionPresetId, Omit<ResolvedMotion, "preset">> = {
  natural: {
    revealMs: 210,
    deliveryIntervalMs: 0,
    initialOpacity: 0.28,
    blurPx: 0,
    displacementPx: 10,
    spring: { stiffness: 170, damping: 26 },
  },
  quiet: {
    revealMs: 160,
    deliveryIntervalMs: 0,
    initialOpacity: 0.45,
    blurPx: 0,
    displacementPx: 4,
    spring: { stiffness: 200, damping: 28 },
  },
  instant: {
    revealMs: 0,
    deliveryIntervalMs: 0,
    initialOpacity: 1,
    blurPx: 0,
    displacementPx: 0,
    spring: { stiffness: 300, damping: 40 },
  },
  fluid: {
    revealMs: 320,
    deliveryIntervalMs: 12,
    initialOpacity: 0.2,
    blurPx: 2,
    displacementPx: 14,
    spring: { stiffness: 140, damping: 22 },
  },
  precise: {
    revealMs: 180,
    deliveryIntervalMs: 0,
    initialOpacity: 0.35,
    blurPx: 0,
    displacementPx: 6,
    spring: { stiffness: 220, damping: 30 },
  },
  editorial: {
    revealMs: 280,
    deliveryIntervalMs: 8,
    initialOpacity: 0.22,
    blurPx: 1,
    displacementPx: 8,
    spring: { stiffness: 160, damping: 24 },
  },
  expressive: {
    revealMs: 400,
    deliveryIntervalMs: 16,
    initialOpacity: 0.12,
    blurPx: 3,
    displacementPx: 18,
    spring: { stiffness: 120, damping: 18 },
  },
};

export const MOTION_PRESET_IDS = Object.keys(PRESETS) as MotionPresetId[];

export function resolveMotion(config?: MotionConfig | null): ResolvedMotion {
  const preset = config?.preset ?? "natural";
  const base = PRESETS[preset] ?? PRESETS.natural;
  return {
    preset,
    revealMs: config?.revealMs ?? base.revealMs,
    deliveryIntervalMs:
      config?.deliveryIntervalMs ?? base.deliveryIntervalMs,
    initialOpacity: config?.initialOpacity ?? base.initialOpacity,
    blurPx: config?.blurPx ?? base.blurPx,
    displacementPx: config?.displacementPx ?? base.displacementPx,
    spring: {
      stiffness: config?.spring?.stiffness ?? base.spring.stiffness,
      damping: config?.spring?.damping ?? base.spring.damping,
    },
  };
}
