import type {
  AppearanceConfig,
  ColorControlNeeds,
  Effect,
} from "./types";

/**
 * Derive which generation color controls a pattern needs from its effect
 * and optional decoupled appearance config.
 */
export function colorNeedsForEffect(
  effect: Effect,
  appearance?: AppearanceConfig | null,
): ColorControlNeeds {
  const none: ColorControlNeeds = {
    ink: false,
    highlight: false,
    gradientMiddle: false,
    gradientEnd: false,
  };

  const mode = appearance?.colorMode ?? "default";
  const treatment = appearance?.treatment ?? "ink";

  if (mode === "solid") {
    return {
      ink: true,
      highlight: treatment === "highlight" || treatment === "glow",
      gradientMiddle: false,
      gradientEnd: false,
    };
  }

  if (mode === "gradient") {
    return {
      ink: true,
      highlight: treatment === "highlight" || treatment === "glow",
      gradientMiddle: true,
      gradientEnd: true,
    };
  }

  // default — derive from historical effect
  switch (effect) {
    case "none":
    case "spring":
    case "fade":
    case "wipe":
    case "block":
    case "cursor":
    case "skeleton":
    case "heading":
      return none;

    case "ghost":
    case "review":
    case "diff":
    case "worddiff":
      return { ...none, ink: true };

    case "mark":
    case "emphasis":
    case "guide":
    case "checkpoint":
    case "rowAccent":
    case "rowFocus":
    case "placeholder":
    case "linebar":
      return { ...none, ink: true, highlight: true };

    case "color":
    case "ink":
    case "replacementInk":
    case "underline":
    case "addition":
      return { ...none, ink: true, highlight: true };

    case "shimmer":
      return { ...none, ink: true };

    case "gradientInk":
    case "gradientUnderline":
      return {
        ink: true,
        highlight: false,
        gradientMiddle: true,
        gradientEnd: true,
      };

    case "gradientHighlight":
    case "gradientGlow":
      return {
        ink: true,
        highlight: true,
        gradientMiddle: true,
        gradientEnd: true,
      };

    default:
      return { ink: true, highlight: true, gradientMiddle: false, gradientEnd: false };
  }
}

export function effectUsesGradient(effect: Effect): boolean {
  return effect.startsWith("gradient") || effect === "shimmer";
}

export function effectUsesAnyColor(
  effect: Effect,
  appearance?: AppearanceConfig | null,
): boolean {
  const n = colorNeedsForEffect(effect, appearance);
  return n.ink || n.highlight || n.gradientMiddle || n.gradientEnd;
}
