import type {
  GenerationPalette,
  PaletteCategory,
  PalettePreset,
  ThemeMode,
} from "./types";

function p(
  id: string,
  name: string,
  category: PaletteCategory,
  light: [string, string, string, string],
  dark: [string, string, string, string],
): PalettePreset {
  const toPalette = ([ink, highlight, gradientMiddle, gradientEnd]: [
    string,
    string,
    string,
    string,
  ]): GenerationPalette => ({ ink, highlight, gradientMiddle, gradientEnd });
  return {
    id,
    name,
    category,
    light: toPalette(light),
    dark: toPalette(dark),
  };
}

/** Curated generation palettes — aesthetic only; semantic revision colors stay separate. */
export const PALETTE_PRESETS: PalettePreset[] = [
  // AI-inspired
  p(
    "intelligence",
    "Intelligence",
    "ai",
    ["#7047B8", "#EDE2FF", "#B83C83", "#B45309"],
    ["#C4A5FF", "#37264B", "#F49BCB", "#FFC18A"],
  ),
  p(
    "gemini",
    "Gemini",
    "ai",
    ["#3458C5", "#E2EAFF", "#8450C4", "#BC4278"],
    ["#91ADFF", "#232D50", "#C2A2FF", "#F39DC4"],
  ),
  p(
    "copilot",
    "Copilot",
    "ai",
    ["#1765A8", "#E0F0FF", "#A643A0", "#B85C17"],
    ["#7EC8FF", "#19364D", "#EAA0E5", "#FFBB80"],
  ),
  p(
    "terracotta",
    "Terracotta",
    "ai",
    ["#9E4D32", "#F6E5D9", "#B25D41", "#8A624B"],
    ["#E8A58D", "#422C23", "#F4B19B", "#DEC0A4"],
  ),
  p(
    "jade",
    "Jade",
    "ai",
    ["#08775D", "#DDF5E9", "#158066", "#237F84"],
    ["#65DDB2", "#163B31", "#7BE5BA", "#83D8E1"],
  ),
  p(
    "prism",
    "Prism",
    "ai",
    ["#385BC8", "#E9E5FF", "#9333B8", "#BA365C"],
    ["#94B0FF", "#352B53", "#D69BFF", "#FF96B2"],
  ),

  // Minimal / product
  p(
    "graphite",
    "Graphite",
    "minimal",
    ["#262626", "#E5E5E5", "#525252", "#737373"],
    ["#FAFAFA", "#303030", "#D4D4D4", "#A3A3A3"],
  ),
  p(
    "paper",
    "Paper",
    "minimal",
    ["#514C43", "#F0EDE6", "#75664D", "#8A785A"],
    ["#E0D7C7", "#363229", "#C5B89E", "#D3BD91"],
  ),
  p(
    "iris",
    "Iris",
    "minimal",
    ["#5145BD", "#E8E5FF", "#7256C9", "#4B66B3"],
    ["#ADA5FF", "#2D294D", "#C2ADFF", "#9EBBFF"],
  ),
  p(
    "electric",
    "Electric",
    "minimal",
    ["#1D4ED8", "#DBEAFE", "#4338CA", "#7C3AED"],
    ["#93B9FF", "#1C3158", "#A6A4FF", "#C8A0FF"],
  ),
  p(
    "sakura",
    "Sakura",
    "minimal",
    ["#A51D62", "#FCE7F3", "#BE3455", "#A447A0"],
    ["#FF9CCD", "#49263C", "#FFA0B1", "#EDA4E8"],
  ),
  p(
    "matcha",
    "Matcha",
    "minimal",
    ["#41652B", "#E8F0D9", "#617C23", "#3F7765"],
    ["#B5D995", "#303D24", "#D0DF83", "#97D9BD"],
  ),

  // Expressive
  p(
    "aurora",
    "Aurora",
    "expressive",
    ["#08786E", "#DCF5EF", "#3568BD", "#7946B7"],
    ["#65E5D1", "#183D3B", "#90BBFF", "#C7A2FF"],
  ),
  p(
    "sunset",
    "Sunset",
    "expressive",
    ["#B45309", "#FFF0D5", "#C2413C", "#AC2869"],
    ["#FFC477", "#493221", "#FF9E91", "#F99BCB"],
  ),
  p(
    "ocean",
    "Ocean",
    "expressive",
    ["#075985", "#E0F2FE", "#0E7490", "#0F766E"],
    ["#7BCBFF", "#1B364A", "#67DCEB", "#73E1CD"],
  ),
  p(
    "twilight",
    "Twilight",
    "expressive",
    ["#4338CA", "#EDE9FE", "#7E22CE", "#A13E79"],
    ["#A8ABFF", "#302747", "#CD99FF", "#F0A0CB"],
  ),
  p(
    "ember",
    "Ember",
    "expressive",
    ["#9A3412", "#FFEDD5", "#B91C1C", "#A16207"],
    ["#FFAD86", "#482B22", "#FF9292", "#F2CE78"],
  ),
  p(
    "botanical",
    "Botanical",
    "expressive",
    ["#166534", "#DCFCE7", "#047857", "#0E7490"],
    ["#90DDA4", "#203B2C", "#68DFC0", "#84DDEC"],
  ),
];

export const DEFAULT_PRESET_ID = "graphite";
export const SIGNATURE_PRESET_ID = "intelligence";
export const GRADIENT_DEMO_PRESET_ID = "aurora";

const byId = new Map(PALETTE_PRESETS.map((x) => [x.id, x]));

export const PRESET_CATEGORIES: { id: PaletteCategory; label: string }[] = [
  { id: "ai", label: "AI-inspired" },
  { id: "minimal", label: "Minimal" },
  { id: "expressive", label: "Expressive" },
];

export function getPreset(id: string): PalettePreset | undefined {
  return byId.get(id);
}

export function getPresetOrDefault(id?: string | null): PalettePreset {
  return (id && byId.get(id)) || byId.get(DEFAULT_PRESET_ID)!;
}

export function resolvePresetPalette(
  presetId: string | null | undefined,
  theme: ThemeMode,
): GenerationPalette {
  return getPresetOrDefault(presetId)[theme];
}

export function paletteToGenerationColors(
  palette: GenerationPalette,
): { ink: string; highlight: string; middle: string; end: string } {
  return {
    ink: palette.ink,
    highlight: palette.highlight,
    middle: palette.gradientMiddle,
    end: palette.gradientEnd,
  };
}

export function generationColorsToPalette(colors: {
  ink?: string;
  highlight?: string;
  middle?: string;
  end?: string;
}): GenerationPalette {
  return {
    ink: colors.ink || "#262626",
    highlight: colors.highlight || "#E5E5E5",
    gradientMiddle: colors.middle || "#525252",
    gradientEnd: colors.end || "#737373",
  };
}

export function presetsByCategory(category: PaletteCategory): PalettePreset[] {
  return PALETTE_PRESETS.filter((p) => p.category === category);
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHex(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1],
      g = v[2],
      b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}
