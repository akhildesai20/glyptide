/** Use-case category identifiers */
export type CaseId =
  | "new"
  | "insert"
  | "replace"
  | "rewrite"
  | "continue"
  | "structured";

/** How incoming text is buffered before reveal */
export type BufferKind =
  | "token"
  | "word"
  | "phrase"
  | "sentence"
  | "paragraph"
  | "line"
  | "all";

/** Visual / interaction effect applied to revealed chunks */
export type Effect =
  | "none"
  | "spring"
  | "fade"
  | "wipe"
  | "block"
  | "mark"
  | "review"
  | "ghost"
  | "color"
  | "underline"
  | "addition"
  | "placeholder"
  | "cursor"
  | "guide"
  | "emphasis"
  | "skeleton"
  | "checkpoint"
  | "ink"
  | "replacementInk"
  | "diff"
  | "worddiff"
  | "linebar"
  | "shimmer"
  | "gradientInk"
  | "gradientHighlight"
  | "gradientGlow"
  | "gradientUnderline"
  | "rowAccent"
  | "rowFocus"
  | "heading";

export type StreamScenario = "steady" | "bursts" | "stall" | "interrupt";

export type EngineState =
  | "Ready"
  | "Waiting"
  | "Generating"
  | "Waiting for text"
  | "Paused"
  | "Interrupted"
  | "Review"
  | "Complete"
  | "Stopped";

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system" | "inherit";

export type PaletteCategory = "ai" | "minimal" | "expressive";

export interface GenerationPalette {
  ink: string;
  highlight: string;
  gradientMiddle: string;
  gradientEnd: string;
}

export interface ThemeAwarePalette {
  light: GenerationPalette;
  dark: GenerationPalette;
}

export interface PalettePreset {
  id: string;
  name: string;
  category: PaletteCategory;
  light: GenerationPalette;
  dark: GenerationPalette;
}

/** Flat colors applied to a single resolved theme (engine internal) */
export interface GenerationColors {
  ink?: string;
  highlight?: string;
  middle?: string;
  end?: string;
}

/** Which generation color controls a pattern needs */
export type ColorControlKey = "ink" | "highlight" | "gradientMiddle" | "gradientEnd";

export interface ColorControlNeeds {
  ink: boolean;
  highlight: boolean;
  gradientMiddle: boolean;
  gradientEnd: boolean;
}

/** Aesthetic color mode — independent of pattern motion */
export type AppearanceColorMode = "default" | "solid" | "gradient";

/** Visual treatment applied to incoming / modified content */
export type AppearanceTreatment = "ink" | "highlight" | "underline" | "glow";

export type GradientMotion = "static" | "animated";

/**
 * How generation treatments relate to finished content.
 * Aesthetic presets never override this — they only style the temporary phase.
 */
export type AppearanceLifecycle = "transient" | "persistent" | "review-bound";

/** When transient treatments clear */
export type AppearanceSettlement =
  | "piece"
  | "generation"
  | "accept"
  | "none";

export interface AppearanceConfig {
  colorMode: AppearanceColorMode;
  treatment: AppearanceTreatment;
  /** 0–1 visual strength for highlights / glows */
  intensity?: number;
  /** Gradient angle in degrees */
  gradientDirection?: number;
  gradientMotion?: GradientMotion;
}

export interface AppearanceCapabilities {
  colorModes: AppearanceColorMode[];
  treatments: AppearanceTreatment[];
  allowsGradientMotion: boolean;
  preservesSemanticColors: boolean;
  preservesSyntaxHighlight: boolean;
  dedicatedGradient: boolean;
  defaultTreatment: AppearanceTreatment;
  defaultGradientMotion: GradientMotion;
}

export interface PatternDefinition {
  id: string;
  caseId: CaseId;
  name: string;
  kind: BufferKind;
  effect: Effect;
  description: string;
  index: number;
  group: string | null;
  sample: string;
  source: string;
  /**
   * Optional registry override. When omitted, derived from `effect`
   * via `appearanceLifecycleFor`.
   */
  appearanceLifecycle?: AppearanceLifecycle;
  appearanceSettlement?: AppearanceSettlement;
}

export interface CaseDefinition {
  id: CaseId;
  title: string;
  desc: string;
  surface: string;
  source: string;
  text: string;
}

export interface GlyptideConfig {
  /** Use-case id controlling range / review behavior */
  caseId: CaseId;
  /** Display name used for a few pattern-specific branches */
  patternName: string;
  kind: BufferKind;
  effect: Effect;
  /** Existing document text; use [[...]] to mark editable range */
  source?: string;
  /** Incoming / replacement text */
  text: string;
  /** Approximate characters per second for simulated streaming */
  speed?: number;
  /** Initial latency before generation begins (ms) */
  latency?: number;
  scenario?: StreamScenario;
  reduce?: boolean;
  /** Resolved flat colors for the active theme (engine) */
  colors?: GenerationColors | null;
  /** Named curated preset id */
  preset?: string | null;
  /** Explicit theme-aware palettes (overrides preset when provided) */
  palette?: ThemeAwarePalette | null;
  /** How to resolve light/dark for generation colors */
  theme?: ThemePreference;
  /**
   * Keep gradient generation classes after the travel animation settles.
   * Useful for hero / showcase surfaces that should retain palette color.
   */
  persistGradient?: boolean;
  /** Decoupled aesthetic appearance (color mode + treatment) */
  appearance?: AppearanceConfig | null;
}

export interface CreateGlyptideOptions {
  /** Element that receives generated text */
  element: HTMLElement;
  /** Optional waiting / status element */
  waiting?: HTMLElement | null;
  /** Pattern id from the registry, or inline config */
  pattern?: string;
  /** Override / extend pattern defaults */
  config?: Partial<GlyptideConfig>;
  speed?: number;
  latency?: number;
  reduce?: boolean;
  /** @deprecated Prefer `preset` or theme-aware `palette` */
  colors?: GenerationColors | null;
  /** Curated preset id (e.g. "aurora") */
  preset?: string | null;
  /** Explicit light + dark generation palettes */
  palette?: ThemeAwarePalette | null;
  /** light | dark | system | inherit (host dataset/theme) */
  theme?: ThemePreference;
  onStatus?: (state: EngineState) => void;
  onAnnounce?: (message: string) => void;
  onChange?: (state: EngineState) => void;
}

export interface GlyptideInstance {
  /** Begin simulated generation with the current or provided config */
  start: (config?: Partial<GlyptideConfig>) => void;
  /** Append text from a real stream (no simulation) */
  append: (chunk: string) => void;
  /** Signal that real streaming has finished */
  finish: () => void;
  /** Reset surface to ready state */
  reset: (config?: Partial<GlyptideConfig>) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  accept: () => void;
  reject: () => void;
  /** Re-apply generation palette (e.g. after theme change) */
  palette: () => void;
  /** Update preset / palette / theme / appearance without restarting generation */
  setAppearance: (options: {
    preset?: string | null;
    palette?: ThemeAwarePalette | null;
    theme?: ThemePreference;
    colors?: GenerationColors | null;
    appearance?: AppearanceConfig | null;
  }) => void;
  /** Tear down timers, animations, and observers */
  destroy: () => void;
  readonly state: EngineState;
  readonly rendered: string;
}

export interface EngineCallbacks {
  out: HTMLElement;
  wait: HTMLElement;
  status?: (state: EngineState) => void;
  announce?: (message: string) => void;
  change?: (state: EngineState) => void;
}

/** Internal engine config (all fields resolved) */
export interface ResolvedConfig {
  caseId: CaseId;
  patternName: string;
  kind: BufferKind;
  effect: Effect;
  source: string;
  text: string;
  speed: number;
  latency: number;
  scenario: StreamScenario;
  reduce: boolean;
  colors: GenerationColors | null;
  preset: string | null;
  palette: ThemeAwarePalette | null;
  theme: ThemePreference;
  persistGradient: boolean;
  appearance: AppearanceConfig | null;
}
