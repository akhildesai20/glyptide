import {
  blendHighlight,
  contrastRatio,
  fixContrastInk,
  parseHex,
  toHex,
  type RGB,
} from "./contrast";
import {
  getPresetOrDefault,
  paletteToGenerationColors,
} from "./presets";
import type {
  GenerationColors,
  GenerationPalette,
  ThemeAwarePalette,
  ThemeMode,
  ThemePreference,
} from "./types";

export {
  classifyContrast,
  contrastRatio,
  contrastRatioHex,
  fixContrastInk,
  meetsAA,
  parseHex,
  toHex,
  worstGradientContrast,
} from "./contrast";

/**
 * Resolve host theme without mutating globals.
 * - light / dark: explicit
 * - system: prefers-color-scheme
 * - inherit: dataset.theme / color-scheme / body.dark / system
 */
export function resolveThemeMode(
  preference: ThemePreference = "inherit",
  root?: HTMLElement | null,
): ThemeMode {
  if (preference === "light" || preference === "dark") return preference;

  if (preference === "system") {
    if (typeof matchMedia === "function") {
      return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }

  // inherit
  if (typeof document !== "undefined") {
    const ds = document.documentElement.dataset.theme;
    if (ds === "dark" || ds === "light") return ds;
    if (document.body?.classList.contains("dark")) return "dark";
  }
  if (root) {
    const scheme = getComputedStyle(root).colorScheme;
    if (scheme === "dark") return "dark";
    if (scheme === "light") return "light";
  }
  if (typeof matchMedia === "function") {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function isDarkDocument(root?: HTMLElement | null): boolean {
  return resolveThemeMode("inherit", root) === "dark";
}

export function resolveGenerationColors(options: {
  theme?: ThemePreference;
  preset?: string | null;
  palette?: ThemeAwarePalette | null;
  colors?: GenerationColors | null;
  root?: HTMLElement | null;
}): { mode: ThemeMode; colors: GenerationColors; palette: GenerationPalette } {
  const mode = resolveThemeMode(options.theme ?? "inherit", options.root);

  if (options.palette) {
    const p = options.palette[mode];
    return { mode, colors: paletteToGenerationColors(p), palette: p };
  }

  if (options.preset) {
    const p = getPresetOrDefault(options.preset)[mode];
    return { mode, colors: paletteToGenerationColors(p), palette: p };
  }

  if (options.colors) {
    const p: GenerationPalette = {
      ink: options.colors.ink || getPresetOrDefault()[mode].ink,
      highlight: options.colors.highlight || getPresetOrDefault()[mode].highlight,
      gradientMiddle:
        options.colors.middle || getPresetOrDefault()[mode].gradientMiddle,
      gradientEnd: options.colors.end || getPresetOrDefault()[mode].gradientEnd,
    };
    return { mode, colors: paletteToGenerationColors(p), palette: p };
  }

  const p = getPresetOrDefault()[mode];
  return { mode, colors: paletteToGenerationColors(p), palette: p };
}

function pageBackground(dark: boolean): RGB {
  // Match site tokens approximately: light #FAFAFA / dark #0A0A0A — slightly
  // lifted for embedded surfaces (#FFFFFF / #111111).
  return dark ? [17, 17, 17] : [255, 255, 255];
}

/**
 * Apply generation color custom properties to output / waiting elements.
 * Scoped to the provided elements only — never mutates :root for generation colors.
 * Semantic tokens (--added, --removed, --selection) are left untouched.
 */
export function applyPalette(
  elements: HTMLElement[],
  colors: GenerationColors | null | undefined,
  dark: boolean,
  options: { autoFixInk?: boolean; targetContrast?: number } = {},
): void {
  const bg = pageBackground(dark);
  const target = options.targetContrast ?? 4.5;
  const autoFix = options.autoFixInk !== false;

  const ensureInk = (h: string | undefined): string | null => {
    const parsed = parseHex(h);
    if (!parsed) return null;
    if (!autoFix) return toHex(parsed);
    if (contrastRatio(parsed, bg) >= target) return toHex(parsed);
    return fixContrastInk(toHex(parsed), toHex(bg), target);
  };

  const ink = ensureInk(colors?.ink);
  const middle =
    ensureInk(colors?.middle) ||
    (dark ? "#D4D4D4" : "#525252");
  const end =
    ensureInk(colors?.end) ||
    (dark ? "#A3A3A3" : "#737373");

  const vars: [string, string | null][] = [
    ["--gen", ink],
    ["--glyptide-gen", ink],
    ["--glyptide-ink", ink],
    ["--glyptide-gradient-start", ink],
    ["--grad2", middle],
    ["--glyptide-grad2", middle],
    ["--glyptide-gradient-middle", middle],
    ["--grad3", end],
    ["--glyptide-grad3", end],
    ["--glyptide-gradient-end", end],
  ];

  for (const el of elements) {
    for (const [key, val] of vars) {
      if (val) el.style.setProperty(key, val);
      else el.style.removeProperty(key);
    }
  }

  const hiliteRaw = colors?.highlight;
  for (const el of elements) {
    if (hiliteRaw && parseHex(hiliteRaw)) {
      const blended = blendHighlight(hiliteRaw, bg, 0.28);
      el.style.setProperty("--hilite", blended);
      el.style.setProperty("--glyptide-hilite", blended);
      el.style.setProperty("--glyptide-highlight", blended);
    } else {
      el.style.removeProperty("--hilite");
      el.style.removeProperty("--glyptide-hilite");
      el.style.removeProperty("--glyptide-highlight");
    }
  }
}

/** Preview CSS gradient string for a palette (theme already resolved). */
export function palettePreviewGradient(palette: GenerationPalette): string {
  return `linear-gradient(120deg, ${palette.ink}, ${palette.gradientMiddle}, ${palette.gradientEnd})`;
}
