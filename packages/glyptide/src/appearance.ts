import { isCodeSurfacePattern } from "./pattern-flags";
import type {
  AppearanceCapabilities,
  AppearanceColorMode,
  AppearanceConfig,
  AppearanceTreatment,
  CaseId,
  Effect,
  GradientMotion,
} from "./types";

const ALL_TREATMENTS: AppearanceTreatment[] = [
  "ink",
  "highlight",
  "underline",
  "glow",
];

/** Semantic review effects — aesthetic overlays must not replace meaning. */
const SEMANTIC_EFFECTS = new Set<Effect>([
  "ghost",
  "review",
  "diff",
  "worddiff",
  "addition",
]);

/** Effects that already encode a unique gradient travel behavior */
const DEDICATED_GRADIENT: Partial<
  Record<Effect, { treatment: AppearanceTreatment; motion: GradientMotion }>
> = {
  gradientInk: { treatment: "ink", motion: "animated" },
  gradientHighlight: { treatment: "highlight", motion: "animated" },
  gradientGlow: { treatment: "glow", motion: "animated" },
  gradientUnderline: { treatment: "underline", motion: "animated" },
};

/**
 * Appearance capabilities for a pattern — derived from registry fields,
 * never hardcoded in the UI.
 */
export function appearanceCapabilities(
  effect: Effect,
  caseId: CaseId,
  patternName?: string,
  patternId?: string,
): AppearanceCapabilities {
  const dedicated = DEDICATED_GRADIENT[effect];
  const semantic = SEMANTIC_EFFECTS.has(effect);
  const isCode =
    caseId === "structured" &&
    (isCodeSurfacePattern(patternId, patternName) ||
      (!!patternName &&
        /^(Code|Buffered code|Data|Buffered data)/.test(patternName)));

  // Opacity-only / cursor / skeleton: appearance optional
  const motionOnly = [
    "none",
    "spring",
    "fade",
    "wipe",
    "block",
    "cursor",
    "skeleton",
    "heading",
  ].includes(effect);

  let treatments: AppearanceTreatment[] = [...ALL_TREATMENTS];
  if (semantic) {
    // Aesthetic ink only — keep semantic strikethrough/underline intact
    treatments = ["ink"];
  }
  if (isCode) {
    // Avoid background/glow washing syntax; underline + ink ok
    treatments = ["ink", "underline"];
  }
  if (effect === "shimmer") {
    // Waiting-label shimmer — generation text stays quiet
    treatments = ["ink"];
  }

  const colorModes: AppearanceColorMode[] = semantic
    ? ["default", "solid"]
    : dedicated
      ? ["default", "solid", "gradient"]
      : motionOnly || !semantic
        ? ["default", "solid", "gradient"]
        : ["default", "solid"];

  return {
    colorModes,
    treatments,
    allowsGradientMotion: colorModes.includes("gradient") && !semantic,
    preservesSemanticColors: semantic,
    preservesSyntaxHighlight: isCode,
    dedicatedGradient: !!dedicated,
    defaultTreatment: dedicated?.treatment ?? "ink",
    defaultGradientMotion: dedicated?.motion ?? "animated",
  };
}

export function defaultAppearanceConfig(
  effect: Effect,
  caseId: CaseId,
  patternName?: string,
  patternId?: string,
): AppearanceConfig {
  const caps = appearanceCapabilities(effect, caseId, patternName, patternId);
  const dedicated = DEDICATED_GRADIENT[effect];
  return {
    colorMode: dedicated ? "gradient" : "default",
    treatment: caps.defaultTreatment,
    intensity: 1,
    gradientDirection: 110,
    gradientMotion: caps.defaultGradientMotion,
  };
}

/**
 * Resolve the CSS visual class (+ motion) for incoming content.
 * Dedicated gradient effects remain the default when appearance is "default".
 */
export function resolveVisualTreatment(
  effect: Effect,
  appearance: AppearanceConfig | null | undefined,
  reduce: boolean,
): {
  className: string | null;
  animateGradient: boolean;
  solidOnly: boolean;
} {
  const dedicated = DEDICATED_GRADIENT[effect];

  // Default mode: keep historical effect behavior
  if (!appearance || appearance.colorMode === "default") {
    if (dedicated && !reduce) {
      return {
        className: treatmentClass(dedicated.treatment, true),
        animateGradient: dedicated.motion === "animated",
        solidOnly: false,
      };
    }
    return { className: null, animateGradient: false, solidOnly: false };
  }

  if (appearance.colorMode === "solid") {
    return {
      className: treatmentClass(appearance.treatment, false),
      animateGradient: false,
      solidOnly: true,
    };
  }

  // gradient
  const animate =
    !reduce && (appearance.gradientMotion ?? "animated") === "animated";
  return {
    className: treatmentClass(appearance.treatment, true),
    animateGradient: animate,
    solidOnly: false,
  };
}

function treatmentClass(
  treatment: AppearanceTreatment,
  gradient: boolean,
): string {
  if (gradient) {
    switch (treatment) {
      case "ink":
        return "grad-ink";
      case "highlight":
        return "grad-highlight";
      case "glow":
        return "grad-glow";
      case "underline":
        return "grad-underline";
    }
  }
  switch (treatment) {
    case "ink":
      return "ink appear-ink";
    case "highlight":
      return "appear-highlight";
    case "glow":
      return "appear-glow";
    case "underline":
      return "underlined appear-underline";
  }
}

export function treatmentLabel(t: AppearanceTreatment): string {
  switch (t) {
    case "ink":
      return "Text ink";
    case "highlight":
      return "Background highlight";
    case "underline":
      return "Underline";
    case "glow":
      return "Diffused glow";
  }
}

export function colorModeLabel(m: AppearanceColorMode): string {
  switch (m) {
    case "default":
      return "Default";
    case "solid":
      return "Solid";
    case "gradient":
      return "Gradient";
  }
}

/** Map legacy gradient effect → base motion effect for consolidated playback */
export function baseMotionEffect(effect: Effect): Effect {
  if (effect in DEDICATED_GRADIENT) {
    // Traveling gradient is the unique motion; keep effect id for timing finalize
    return effect;
  }
  return effect;
}

export function isDedicatedGradientEffect(effect: Effect): boolean {
  return effect in DEDICATED_GRADIENT;
}
