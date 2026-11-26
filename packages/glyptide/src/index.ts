import { makeEngine, type InternalEngine } from "./engine";
import { getPattern, patternCount } from "./patterns";
import { defaultAppearanceConfig } from "./appearance";
import { resolveGenerationColors } from "./palette";
import {
  GlyptideConfigError,
  resolvePatternId,
  validateCreateOptions,
  validatePartialConfig,
} from "./validate";
import type {
  AppearanceConfig,
  CreateGlyptideOptions,
  GlyptideConfig,
  GlyptideEvent,
  GlyptideEventHandler,
  GlyptideInstance,
  MotionConfig,
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
  CatchUpPolicy,
  ColorControlKey,
  ColorControlNeeds,
  CreateGlyptideOptions,
  Effect,
  EngineState,
  GenerationColors,
  GenerationPalette,
  GlyptideConfig,
  GlyptideEvent,
  GlyptideEventHandler,
  GlyptideInstance,
  GradientMotion,
  MotionConfig,
  MotionPresetId,
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
  normalizeSnapshot,
  applyTextOperation,
  commonPrefixLength,
  raceAbort,
  __resetAbortListenerStats,
  __abortListenerAdds,
  __abortListenerRemoves,
  type ConsumeTextStreamOptions,
  type StreamMode,
  type TextOperation,
} from "./stream";
export {
  createIncrementalSplitter,
  type IncrementalSplitter,
} from "./incremental-split";
export {
  GlyptideConfigError,
  assertValidPatternId,
  resolvePatternId,
  validateCreateOptions,
  validatePartialConfig,
} from "./validate";
export {
  recommendPatterns,
  type PatternRecommendation,
  type RecommendContentType,
  type RecommendInput,
  type RecommendUseCase,
} from "./recommend";
export {
  createStreamIngress,
  type StreamIngress,
  type StreamIngressOptions,
} from "./stream-ingress";
export {
  createEventBus,
  eventForEngineState,
  type EventBus,
} from "./events";
export {
  MOTION_PRESET_IDS,
  resolveMotion,
  type ResolvedMotion,
} from "./motion";
export {
  PATTERN,
  headingWeightMode,
  isBlockByBlock,
  isCodeSurfacePattern,
  isParagraphLeadIn,
  isReservedGap,
  showsCaret,
} from "./pattern-flags";
export {
  passthroughRenderAdapter,
  type RenderAdapter,
  type RenderAdapterContext,
} from "./render-adapter";

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
  const patternId = merged.patternId ?? "";
  const patternName = merged.patternName ?? "Word settle";
  const effect = merged.effect ?? "spring";
  const appearance: AppearanceConfig | null =
    merged.appearance === undefined
      ? defaultAppearanceConfig(effect, caseId, patternName, patternId)
      : merged.appearance;
  const motion: MotionConfig | null =
    merged.motion === undefined ? null : merged.motion;

  const resolved = resolveGenerationColors({
    theme,
    preset,
    palette: paletteCfg,
    colors: merged.colors ?? null,
    root,
  });

  return {
    caseId,
    patternId,
    patternName,
    kind: merged.kind ?? "word",
    effect,
    source: merged.source ?? "",
    text: merged.text ?? "",
    speed: merged.speed ?? 54,
    latency: merged.latency ?? 600,
    waitingThresholdMs: merged.waitingThresholdMs ?? 180,
    stallMs: merged.stallMs ?? 2500,
    catchUp: merged.catchUp ?? "catchUp",
    scenario: merged.scenario ?? "steady",
    reduce: merged.reduce ?? prefersReducedMotion(),
    motion,
    colors: resolved.colors,
    preset,
    palette: paletteCfg,
    theme,
    persistGradient: merged.persistGradient ?? false,
    appearance,
  };
}

/**
 * Own a waiting node per instance. Never reuse a sibling's `.glyptide-waiting`
 * via parent queries — that couples instances under the same host.
 */
function ensureWaiting(
  parent: HTMLElement,
  waiting?: HTMLElement | null,
): { el: HTMLElement; owned: boolean } {
  if (waiting) return { el: waiting, owned: false };
  const el = document.createElement("div");
  el.className = "glyptide-waiting";
  el.setAttribute("aria-hidden", "true");
  el.dataset.glyptideOwned = "true";
  parent.insertAdjacentElement("afterend", el);
  return { el, owned: true };
}

/**
 * Create a Glyptide instance bound to a DOM element.
 * Glyptide only mutates `element` and the optional waiting node.
 */
export function createGlyptide(options: CreateGlyptideOptions): GlyptideInstance {
  validateCreateOptions(options);

  const element = options.element;
  /** Classes Glyptide added (never remove host-preexisting classes) */
  const addedOutClasses: string[] = [];
  const addOutClass = (name: string) => {
    if (!element.classList.contains(name)) {
      element.classList.add(name);
      addedOutClasses.push(name);
    }
  };
  addOutClass("glyptide-document");

  const { el: waiting, owned: ownedWaiting } = ensureWaiting(
    element,
    options.waiting ?? null,
  );
  const addedWaitClasses: string[] = [];
  // Host-supplied waiting nodes are not class-mutated here.
  const engine: InternalEngine = makeEngine({
    out: element,
    wait: waiting,
    status: options.onStatus,
    announce: options.onAnnounce,
    change: options.onChange,
    event: options.onEvent,
  });

  let base: Partial<GlyptideConfig> = {
    speed: options.speed ?? 54,
    latency: options.latency ?? 400,
    reduce: options.reduce,
    colors: options.colors ?? null,
    preset: options.preset ?? null,
    palette: options.palette ?? null,
    theme: options.theme ?? "inherit",
    motion: options.motion ?? null,
  };

  if (options.pattern) {
    const resolvedId = resolvePatternId(options.pattern);
    const p = getPattern(resolvedId);
    if (!p) {
      // validateCreateOptions already throws; keep guard for type narrowing
      throw new GlyptideConfigError(`Unknown pattern "${options.pattern}".`);
    }
    base = {
      ...base,
      caseId: p.caseId,
      patternId: p.id,
      patternName: p.name,
      kind: p.kind,
      effect: p.effect,
      source: p.source,
      text: p.sample,
    };
  }

  if (options.config) {
    base = { ...base, ...options.config };
  }

  engine.reset(resolveConfig({ text: "" }, base, element));

  let abortHandler: (() => void) | null = null;
  const bindSignal = (signal?: AbortSignal) => {
    if (abortHandler && options.signal) {
      options.signal.removeEventListener("abort", abortHandler);
    }
    abortHandler = null;
    const sig = signal ?? options.signal;
    if (!sig) return;
    abortHandler = () => engine.stop();
    if (sig.aborted) {
      abortHandler();
      return;
    }
    sig.addEventListener("abort", abortHandler, { once: true });
  };
  bindSignal(options.signal);

  const instance: GlyptideInstance = {
    start(config) {
      if (config) validatePartialConfig(config);
      engine.start(resolveConfig({ ...base, ...config }, base, element));
    },
    beginStream() {
      return engine.beginStream();
    },
    append(chunk, session) {
      engine.append(chunk, session);
    },
    applySnapshot(fullText, session) {
      engine.applySnapshot(fullText, session);
    },
    finish(session) {
      engine.finish(session);
    },
    reset(config) {
      if (config) {
        validatePartialConfig(config);
        const proposed = { ...base, ...config };
        // Validate resolved shape before mutating base
        resolveConfig({ text: proposed.text ?? "" }, proposed, element);
        base = proposed;
      }
      engine.reset(resolveConfig({ text: base.text ?? "" }, base, element));
    },
    pause: () => engine.pause(),
    resume: () => engine.resume(),
    stop: () => engine.stop(),
    accept: () => engine.accept(),
    reject: () => engine.reject(),
    palette: () => engine.palette(),
    setAppearance(next) {
      const proposed: Partial<GlyptideConfig> = { ...base };
      if ("preset" in next) proposed.preset = next.preset ?? null;
      if ("palette" in next) proposed.palette = next.palette ?? null;
      if ("theme" in next) proposed.theme = next.theme;
      if ("colors" in next) proposed.colors = next.colors ?? null;
      if ("appearance" in next) proposed.appearance = next.appearance ?? null;
      if ("motion" in next) proposed.motion = next.motion ?? null;
      validatePartialConfig(proposed);
      const resolved = resolveConfig(
        { text: proposed.text ?? base.text ?? "" },
        proposed,
        element,
      );
      // Atomic apply only after validation + resolve succeed
      base = {
        ...proposed,
        colors: resolved.colors,
        appearance: resolved.appearance,
        motion: resolved.motion,
      };
      engine.updateAppearance({
        colors: resolved.colors,
        preset: resolved.preset,
        palette: resolved.palette,
        theme: resolved.theme,
        appearance: resolved.appearance,
        persistGradient: resolved.persistGradient,
        motion: resolved.motion,
      });
    },
    on(event: GlyptideEvent | "*", handler: GlyptideEventHandler) {
      return engine.on(event, handler);
    },
    destroy() {
      if (abortHandler && options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
        abortHandler = null;
      }
      engine.destroy();
      if (ownedWaiting) waiting.remove();
      else {
        for (const name of addedWaitClasses) waiting.classList.remove(name);
      }
      for (const name of addedOutClasses) element.classList.remove(name);
      // Engine may toggle these during playback — only remove if we own the surface class
      if (addedOutClasses.includes("glyptide-document")) {
        element.classList.remove("code", "reduced", "paused");
      }
    },
    get state() {
      return engine.state;
    },
    get rendered() {
      return engine.rendered;
    },
    get session() {
      return engine.session;
    },
  };

  return instance;
}

export { patternCount as PATTERN_COUNT };
