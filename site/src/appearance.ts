import {
  DEFAULT_PRESET_ID,
  GRADIENT_DEMO_PRESET_ID,
  defaultAppearanceConfig,
  getPreset,
  getPresetOrDefault,
  isValidHex,
  normalizeHex,
  palettePreviewGradient,
  type AppearanceColorMode,
  type AppearanceConfig,
  type AppearanceTreatment,
  type CaseId,
  type Effect,
  type GenerationPalette,
  type GradientMotion,
  type ThemeAwarePalette,
  type ThemeMode,
} from "glyptide";
import { getThemePref, type ThemePref } from "./theme";

const STORAGE_KEY = "glyptide-appearance-v2";

export type PaletteMode = "preset" | "custom";

export interface AppearanceState {
  version: 2;
  presetId: string;
  paletteMode: PaletteMode;
  custom: {
    light: GenerationPalette | null;
    dark: GenerationPalette | null;
  };
  /** Decoupled visual appearance */
  colorMode: AppearanceColorMode;
  treatment: AppearanceTreatment;
  intensity: number;
  gradientDirection: number;
  gradientMotion: GradientMotion;
}

const DEFAULT_STATE: AppearanceState = {
  version: 2,
  presetId: DEFAULT_PRESET_ID,
  paletteMode: "preset",
  custom: { light: null, dark: null },
  colorMode: "default",
  treatment: "ink",
  intensity: 1,
  gradientDirection: 110,
  gradientMotion: "animated",
};

function clonePalette(p: GenerationPalette): GenerationPalette {
  return { ...p };
}

function validPalette(p: unknown): p is GenerationPalette {
  if (!p || typeof p !== "object") return false;
  const o = p as GenerationPalette;
  return (
    isValidHex(o.ink) &&
    isValidHex(o.highlight) &&
    isValidHex(o.gradientMiddle) &&
    isValidHex(o.gradientEnd)
  );
}

export function loadAppearance(): AppearanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("glyptide-appearance-v1");
    if (!raw) return { ...DEFAULT_STATE, custom: { light: null, dark: null } };
    const parsed = JSON.parse(raw) as Partial<AppearanceState> & {
      version?: number;
      mode?: string;
    };
    const presetId =
      typeof parsed.presetId === "string" && getPreset(parsed.presetId)
        ? parsed.presetId
        : DEFAULT_PRESET_ID;
    const paletteMode: PaletteMode =
      parsed.paletteMode === "custom" || parsed.mode === "custom"
        ? "custom"
        : "preset";
    return {
      version: 2,
      presetId,
      paletteMode,
      custom: {
        light: validPalette(parsed.custom?.light) ? parsed.custom!.light : null,
        dark: validPalette(parsed.custom?.dark) ? parsed.custom!.dark : null,
      },
      colorMode:
        parsed.colorMode === "solid" || parsed.colorMode === "gradient"
          ? parsed.colorMode
          : "default",
      treatment:
        parsed.treatment === "highlight" ||
        parsed.treatment === "underline" ||
        parsed.treatment === "glow"
          ? parsed.treatment
          : "ink",
      intensity:
        typeof parsed.intensity === "number"
          ? Math.max(0, Math.min(1, parsed.intensity))
          : 1,
      gradientDirection:
        typeof parsed.gradientDirection === "number"
          ? parsed.gradientDirection
          : 110,
      gradientMotion: parsed.gradientMotion === "static" ? "static" : "animated",
    };
  } catch {
    return { ...DEFAULT_STATE, custom: { light: null, dark: null } };
  }
}

export function saveAppearance(state: AppearanceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function resolvedThemeMode(
  sitePref: ThemePref = getThemePref(),
): ThemeMode {
  if (sitePref === "light" || sitePref === "dark") return sitePref;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function activePalette(
  state: AppearanceState,
  theme: ThemeMode,
): GenerationPalette {
  if (state.paletteMode === "custom" && state.custom[theme]) {
    return clonePalette(state.custom[theme]!);
  }
  return clonePalette(getPresetOrDefault(state.presetId)[theme]);
}

export function themeAwarePalette(state: AppearanceState): ThemeAwarePalette {
  return {
    light: activePalette(state, "light"),
    dark: activePalette(state, "dark"),
  };
}

export function appearanceConfigFromState(state: AppearanceState): AppearanceConfig {
  return {
    colorMode: state.colorMode,
    treatment: state.treatment,
    intensity: state.intensity,
    gradientDirection: state.gradientDirection,
    gradientMotion: state.gradientMotion,
  };
}

export function selectPreset(
  state: AppearanceState,
  presetId: string,
): AppearanceState {
  if (!getPreset(presetId)) return state;
  return {
    ...state,
    presetId,
    paletteMode: "preset",
    custom: { light: null, dark: null },
  };
}

export function setToken(
  state: AppearanceState,
  theme: ThemeMode,
  key: keyof GenerationPalette,
  value: string,
): AppearanceState {
  const hex = normalizeHex(value);
  if (!hex) return state;
  const base = activePalette(state, theme);
  const next = { ...base, [key]: hex };
  return {
    ...state,
    paletteMode: "custom",
    custom: { ...state.custom, [theme]: next },
  };
}

export function resetToken(
  state: AppearanceState,
  theme: ThemeMode,
  key: keyof GenerationPalette,
): AppearanceState {
  const origin = getPresetOrDefault(state.presetId)[theme];
  const current = activePalette(state, theme);
  const next = { ...current, [key]: origin[key] };
  const fullyOrigin =
    next.ink === origin.ink &&
    next.highlight === origin.highlight &&
    next.gradientMiddle === origin.gradientMiddle &&
    next.gradientEnd === origin.gradientEnd;
  if (fullyOrigin) {
    return {
      ...state,
      paletteMode: state.custom[theme === "light" ? "dark" : "light"]
        ? "custom"
        : "preset",
      custom: { ...state.custom, [theme]: null },
    };
  }
  return {
    ...state,
    paletteMode: "custom",
    custom: { ...state.custom, [theme]: next },
  };
}

export function resetToPreset(state: AppearanceState): AppearanceState {
  return {
    ...state,
    paletteMode: "preset",
    custom: { light: null, dark: null },
  };
}

export function resetToDefaults(): AppearanceState {
  return {
    ...DEFAULT_STATE,
    custom: { light: null, dark: null },
  };
}

/** Align appearance defaults when switching to a dedicated gradient pattern */
export function syncAppearanceForPattern(
  state: AppearanceState,
  effect: Effect,
  caseId: CaseId,
  patternName: string,
): AppearanceState {
  const defaults = defaultAppearanceConfig(effect, caseId, patternName);
  // Only auto-switch when user is on Default mode — don't clobber intentional choices
  if (state.colorMode !== "default") return state;
  return {
    ...state,
    treatment: defaults.treatment,
    gradientMotion: defaults.gradientMotion ?? "animated",
  };
}

export function suggestPresetForEffect(effect: string): string {
  if (effect.startsWith("gradient") || effect === "shimmer") {
    return GRADIENT_DEMO_PRESET_ID;
  }
  return DEFAULT_PRESET_ID;
}

export function previewCss(state: AppearanceState, theme: ThemeMode): string {
  return palettePreviewGradient(activePalette(state, theme));
}

export { DEFAULT_PRESET_ID, GRADIENT_DEMO_PRESET_ID };
