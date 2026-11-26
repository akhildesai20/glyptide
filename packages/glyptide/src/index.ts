import { makeEngine, type InternalEngine } from "./engine";
import { getPattern, patternCount } from "./patterns";
import { defaultAppearanceConfig } from "./appearance";
import { resolveGenerationColors } from "./palette";
import type {
  AppearanceConfig,
  CreateGlyptideOptions,
  GlyptideConfig,
  GlyptideInstance,
  ResolvedConfig,
  ThemeAwarePalette,
  ThemePreference,
} from "./types";

export type {
  AppearanceCapabilities,
  AppearanceColorMode,
  AppearanceConfig,
  AppearanceLifecycle,
  AppearanceSettlement,
  AppearanceTreatment,
  BufferKind,
  CaseDefinition,
  CaseId,
  ColorControlKey,
  ColorControlNeeds,
  CreateGlyptideOptions,
  Effect,
  EngineState,
  GenerationColors,
  GenerationPalette,
  GlyptideConfig,
  GlyptideInstance,
  GradientMotion,
  PaletteCategory,
  PalettePreset,
  PatternDefinition,
  ResolvedConfig,
  StreamScenario,
  ThemeAwarePalette,
  ThemeMode,
  ThemePreference,
} from "./types";

export type { AppearanceLifecycleMeta } from "./lifecycle";
export {
  TRANSIENT_APPEARANCE_CLASSES,
  appearanceLifecycleFor,
  clearTransientAppearance,
  isReviewBoundEffect,
  resolveAppearanceLifecycle,
  settlePieceAppearance,
} from "./lifecycle";

export {
  cases,
  findPattern,
  getCase,
  getPattern,
  getPatternsByCase,
  patternCount,
  patternId,
  patterns,
  searchPatterns,
} from "./patterns";

export { splitText } from "./split";
export { springFrames } from "./spring";
export {
  applyPalette,
  isDarkDocument,
  palettePreviewGradient,
  resolveGenerationColors,
  resolveThemeMode,
  classifyContrast,
  contrastRatio,
  contrastRatioHex,
  fixContrastInk,
  meetsAA,
  parseHex,
  toHex,
  worstGradientContrast,
} from "./palette";
export { makeEngine } from "./engine";
export {
  colorNeedsForEffect,
  effectUsesAnyColor,
  effectUsesGradient,
} from "./color-needs";
export {
  appearanceCapabilities,
  colorModeLabel,
  defaultAppearanceConfig,
  isDedicatedGradientEffect,
  resolveVisualTreatment,
  treatmentLabel,
} from "./appearance";
export {
  DEFAULT_PRESET_ID,
  GRADIENT_DEMO_PRESET_ID,
  PALETTE_PRESETS,
  PRESET_CATEGORIES,
  SIGNATURE_PRESET_ID,
  generationColorsToPalette,
  getPreset,
  getPresetOrDefault,
  isValidHex,
  normalizeHex,
  paletteToGenerationColors,
  presetsByCategory,
  resolvePresetPalette,
} from "./presets";
export {
  consumeTextStream,
  iterateTextStream,
  pipeTextToGlyptide,
  type ConsumeTextStreamOptions,
  type StreamMode,
} from "./stream";
export {
  recommendPatterns,
  type PatternRecommendation,
  type RecommendContentType,
  type RecommendInput,
  type RecommendUseCase,
} from "./recommend";

function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resolveConfig(
  partial: Partial<GlyptideConfig> & { text?: string },
  defaults?: Partial<GlyptideConfig>,
  root?: HTMLElement | null,
): ResolvedConfig {
  const merged = { ...defaults, ...partial };
  const theme: ThemePreference = merged.theme ?? "inherit";
  const preset = merged.preset ?? null;
  const paletteCfg =
    (merged.palette as ThemeAwarePalette | null | undefined) ?? null;
  const caseId = merged.caseId ?? "new";
  const patternName = merged.patternName ?? "Word settle";
  const effect = merged.effect ?? "spring";
  const appearance: AppearanceConfig | null =
    merged.appearance === undefined
      ? defaultAppearanceConfig(effect, caseId, patternName)
      : merged.appearance;

  const resolved = resolveGenerationColors({
    theme,
    preset,
    palette: paletteCfg,
    colors: merged.colors ?? null,
    root,
  });

  return {
    caseId,
    patternName,
    kind: merged.kind ?? "word",
    effect,
    source: merged.source ?? "",
    text: merged.text ?? "",
    speed: merged.speed ?? 54,
    latency: merged.latency ?? 600,
    scenario: merged.scenario ?? "steady",
    reduce: merged.reduce ?? prefersReducedMotion(),
    colors: resolved.colors,
    preset,
    palette: paletteCfg,
    theme,
    persistGradient: merged.persistGradient ?? false,
    appearance,
  };
}

function ensureWaiting(
  parent: HTMLElement,
  waiting?: HTMLElement | null,
): HTMLElement {
  if (waiting) return waiting;
  const existing = parent.parentElement?.querySelector(
    ".glyptide-waiting",
  ) as HTMLElement | null;
  if (existing) return existing;
  const el = document.createElement("div");
  el.className = "glyptide-waiting waiting";
  el.setAttribute("aria-hidden", "true");
  parent.insertAdjacentElement("afterend", el);
  return el;
}

/**
 * Create a Glyptide instance bound to a DOM element.
 */
export function createGlyptide(options: CreateGlyptideOptions): GlyptideInstance {
  const element = options.element;
  element.classList.add("document", "glyptide-document");

  const waiting = ensureWaiting(element, options.waiting ?? null);
  const engine: InternalEngine = makeEngine({
    out: element,
    wait: waiting,
    status: options.onStatus,
    announce: options.onAnnounce,
    change: options.onChange,
  });

  let base: Partial<GlyptideConfig> = {
    speed: options.speed ?? 54,
    latency: options.latency ?? 400,
    reduce: options.reduce,
    colors: options.colors ?? null,
    preset: options.preset ?? null,
    palette: options.palette ?? null,
    theme: options.theme ?? "inherit",
  };

  if (options.pattern) {
    const p = getPattern(options.pattern);
    if (p) {
      base = {
        ...base,
        caseId: p.caseId,
        patternName: p.name,
        kind: p.kind,
        effect: p.effect,
        source: p.source,
        text: p.sample,
      };
    }
  }

  if (options.config) {
    base = { ...base, ...options.config };
  }

  engine.reset(resolveConfig({ text: "" }, base, element));

  return {
    start(config) {
      engine.start(resolveConfig({ ...base, ...config }, base, element));
    },
    append(chunk) {
      engine.append(chunk);
    },
    finish() {
      engine.finish();
    },
    reset(config) {
      if (config) base = { ...base, ...config };
      engine.reset(resolveConfig({ text: base.text ?? "" }, base, element));
    },
    pause: () => engine.pause(),
    resume: () => engine.resume(),
    stop: () => engine.stop(),
    accept: () => engine.accept(),
    reject: () => engine.reject(),
    palette: () => engine.palette(),
    setAppearance(next) {
      if ("preset" in next) base.preset = next.preset ?? null;
      if ("palette" in next) base.palette = next.palette ?? null;
      if ("theme" in next) base.theme = next.theme;
      if ("colors" in next) base.colors = next.colors ?? null;
      if ("appearance" in next) base.appearance = next.appearance ?? null;
      const resolved = resolveConfig({ text: base.text ?? "" }, base, element);
      base.colors = resolved.colors;
      base.appearance = resolved.appearance;
      engine.updateAppearance({
        colors: resolved.colors,
        preset: resolved.preset,
        palette: resolved.palette,
        theme: resolved.theme,
        appearance: resolved.appearance,
        persistGradient: resolved.persistGradient,
      });
    },
    destroy: () => engine.destroy(),
    get state() {
      return engine.state;
    },
    get rendered() {
      return engine.rendered;
    },
  };
}

export { patternCount as PATTERN_COUNT };
