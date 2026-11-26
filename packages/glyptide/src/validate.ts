import { getPattern } from "./patterns";
import { getPreset, isValidHex } from "./presets";
import { MOTION_PRESET_IDS } from "./motion";
import type {
  AppearanceColorMode,
  AppearanceConfig,
  AppearanceTreatment,
  BufferKind,
  CatchUpPolicy,
  CreateGlyptideOptions,
  Effect,
  GenerationColors,
  GlyptideConfig,
  MotionConfig,
  MotionPresetId,
  ThemeAwarePalette,
  ThemePreference,
} from "./types";

const BUFFER_KINDS = new Set<BufferKind>([
  "token",
  "word",
  "phrase",
  "sentence",
  "paragraph",
  "line",
  "all",
]);

const CATCH_UP = new Set<CatchUpPolicy>(["pace", "catchUp", "flush"]);

const THEMES = new Set<ThemePreference>([
  "light",
  "dark",
  "system",
  "inherit",
]);

const COLOR_MODES = new Set<AppearanceColorMode>([
  "default",
  "solid",
  "gradient",
]);

const TREATMENTS = new Set<AppearanceTreatment>([
  "ink",
  "highlight",
  "underline",
  "glow",
]);

const EFFECTS = new Set<Effect>([
  "none",
  "spring",
  "fade",
  "wipe",
  "block",
  "mark",
  "review",
  "ghost",
  "color",
  "underline",
  "addition",
  "placeholder",
  "cursor",
  "guide",
  "emphasis",
  "skeleton",
  "checkpoint",
  "ink",
  "replacementInk",
  "diff",
  "worddiff",
  "linebar",
  "shimmer",
  "gradientInk",
  "gradientHighlight",
  "gradientGlow",
  "gradientUnderline",
  "rowAccent",
  "rowFocus",
  "heading",
]);

/** Legacy pattern id aliases → canonical registry ids */
const PATTERN_ALIASES: Record<string, string> = {
  // Preserve room for renames without silent wrong defaults
};

export class GlyptideConfigError extends Error {
  readonly code = "GLYPTIDE_CONFIG";
  constructor(message: string) {
    super(message);
    this.name = "GlyptideConfigError";
  }
}

export function resolvePatternId(id: string): string {
  return PATTERN_ALIASES[id] ?? id;
}

export function assertValidPatternId(id: string): void {
  const resolved = resolvePatternId(id);
  if (!getPattern(resolved)) {
    throw new GlyptideConfigError(
      `Unknown pattern "${id}". Use getPattern() / patterns from "glyptide" or "glyptide/patterns", or omit pattern for defaults.`,
    );
  }
}

function assertFiniteNumber(
  name: string,
  value: unknown,
  opts?: { min?: number; max?: number; integer?: boolean },
): void {
  if (value == null) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new GlyptideConfigError(`${name} must be a finite number (got ${String(value)}).`);
  }
  if (opts?.integer && !Number.isInteger(value)) {
    throw new GlyptideConfigError(`${name} must be an integer (got ${value}).`);
  }
  if (opts?.min != null && value < opts.min) {
    throw new GlyptideConfigError(`${name} must be >= ${opts.min} (got ${value}).`);
  }
  if (opts?.max != null && value > opts.max) {
    throw new GlyptideConfigError(`${name} must be <= ${opts.max} (got ${value}).`);
  }
}

function assertHex(name: string, value: unknown): void {
  if (value == null || value === "") return;
  if (typeof value !== "string" || !isValidHex(value)) {
    throw new GlyptideConfigError(
      `${name} must be a valid hex color (got ${JSON.stringify(value)}).`,
    );
  }
}

function assertColors(colors: GenerationColors | null | undefined): void {
  if (!colors) return;
  assertHex("colors.ink", colors.ink);
  assertHex("colors.highlight", colors.highlight);
  assertHex("colors.middle", colors.middle);
  assertHex("colors.end", colors.end);
}

function assertPalette(palette: ThemeAwarePalette | null | undefined): void {
  if (!palette) return;
  for (const mode of ["light", "dark"] as const) {
    const p = palette[mode];
    if (!p) {
      throw new GlyptideConfigError(`palette.${mode} is required when palette is set.`);
    }
    assertHex(`palette.${mode}.ink`, p.ink);
    assertHex(`palette.${mode}.highlight`, p.highlight);
    assertHex(`palette.${mode}.gradientMiddle`, p.gradientMiddle);
    assertHex(`palette.${mode}.gradientEnd`, p.gradientEnd);
  }
}

function assertAppearance(appearance: AppearanceConfig | null | undefined): void {
  if (!appearance) return;
  if (appearance.colorMode != null && !COLOR_MODES.has(appearance.colorMode)) {
    throw new GlyptideConfigError(
      `appearance.colorMode must be one of ${[...COLOR_MODES].join(", ")}.`,
    );
  }
  if (appearance.treatment != null && !TREATMENTS.has(appearance.treatment)) {
    throw new GlyptideConfigError(
      `appearance.treatment must be one of ${[...TREATMENTS].join(", ")}.`,
    );
  }
  assertFiniteNumber("appearance.intensity", appearance.intensity, {
    min: 0,
    max: 1,
  });
  assertFiniteNumber("appearance.gradientDirection", appearance.gradientDirection, {
    min: 0,
    max: 360,
  });
}

function assertMotion(motion: MotionConfig | null | undefined): void {
  if (!motion) return;
  if (
    motion.preset != null &&
    !(MOTION_PRESET_IDS as readonly string[]).includes(motion.preset)
  ) {
    throw new GlyptideConfigError(
      `motion.preset must be one of ${(MOTION_PRESET_IDS as readonly MotionPresetId[]).join(", ")}.`,
    );
  }
  assertFiniteNumber("motion.revealMs", motion.revealMs, { min: 0 });
  assertFiniteNumber("motion.blurPx", motion.blurPx, { min: 0 });
  assertFiniteNumber("motion.displacementPx", motion.displacementPx, { min: 0 });
  assertFiniteNumber("motion.deliveryIntervalMs", motion.deliveryIntervalMs, {
    min: 0,
  });
  assertFiniteNumber("motion.initialOpacity", motion.initialOpacity, {
    min: 0,
    max: 1,
  });
  if (motion.spring) {
    assertFiniteNumber("motion.spring.stiffness", motion.spring.stiffness, {
      min: 1,
    });
    assertFiniteNumber("motion.spring.damping", motion.spring.damping, {
      min: 0,
    });
  }
}

/**
 * Lightweight runtime validation for createGlyptide / config patches.
 * Throws GlyptideConfigError with actionable messages (AI-agent friendly).
 */
export function validateCreateOptions(options: CreateGlyptideOptions): void {
  if (!options?.element || !(options.element instanceof HTMLElement)) {
    throw new GlyptideConfigError(
      "createGlyptide requires options.element to be an HTMLElement.",
    );
  }
  if (options.waiting != null && !(options.waiting instanceof HTMLElement)) {
    throw new GlyptideConfigError(
      "options.waiting must be an HTMLElement when provided.",
    );
  }
  if (options.pattern != null && options.pattern !== "") {
    assertValidPatternId(String(options.pattern));
  }
  if (options.preset != null && options.preset !== "") {
    if (!getPreset(options.preset)) {
      throw new GlyptideConfigError(
        `Unknown preset "${options.preset}". Use getPreset() / PALETTE_PRESETS.`,
      );
    }
  }
  if (options.theme != null && !THEMES.has(options.theme)) {
    throw new GlyptideConfigError(
      `theme must be one of ${[...THEMES].join(", ")}.`,
    );
  }
  assertFiniteNumber("speed", options.speed, { min: 1 });
  assertFiniteNumber("latency", options.latency, { min: 0 });
  assertColors(options.colors);
  assertPalette(options.palette);
  assertMotion(options.motion);
  if (options.config) validatePartialConfig(options.config);
}

export function validatePartialConfig(config: Partial<GlyptideConfig>): void {
  if (config.kind != null && !BUFFER_KINDS.has(config.kind)) {
    throw new GlyptideConfigError(
      `kind must be one of ${[...BUFFER_KINDS].join(", ")}.`,
    );
  }
  if (config.effect != null && !EFFECTS.has(config.effect)) {
    throw new GlyptideConfigError(`Unknown effect "${config.effect}".`);
  }
  if (config.catchUp != null && !CATCH_UP.has(config.catchUp)) {
    throw new GlyptideConfigError(
      `catchUp must be one of ${[...CATCH_UP].join(", ")}.`,
    );
  }
  if (config.theme != null && !THEMES.has(config.theme)) {
    throw new GlyptideConfigError(
      `theme must be one of ${[...THEMES].join(", ")}.`,
    );
  }
  if (config.preset != null && config.preset !== "") {
    if (!getPreset(config.preset)) {
      throw new GlyptideConfigError(`Unknown preset "${config.preset}".`);
    }
  }
  if (config.patternId != null && config.patternId !== "") {
    assertValidPatternId(config.patternId);
  }
  assertFiniteNumber("speed", config.speed, { min: 1 });
  assertFiniteNumber("latency", config.latency, { min: 0 });
  assertFiniteNumber("waitingThresholdMs", config.waitingThresholdMs, {
    min: 0,
  });
  assertFiniteNumber("stallMs", config.stallMs, { min: 0 });
  assertColors(config.colors);
  assertPalette(config.palette as ThemeAwarePalette | null | undefined);
  assertAppearance(config.appearance);
  assertMotion(config.motion);
}
