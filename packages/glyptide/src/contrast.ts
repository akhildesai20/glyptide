/** Lightweight contrast helpers — no external color library. */

export type RGB = [number, number, number];

export function parseHex(hex: string | undefined | null): RGB | null {
  if (!hex) return null;
  const h = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(h)) {
    return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
  }
  if (/^#[0-9a-f]{3}$/i.test(h)) {
    return [1, 2, 3].map((i) => {
      const c = h[i];
      return parseInt(c + c, 16);
    }) as RGB;
  }
  return null;
}

export function toHex([r, g, b]: RGB): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function relativeLuminance(rgb: RGB): number {
  return rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

export function contrastRatioHex(a: string, b: string): number | null {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return null;
  return contrastRatio(A, B);
}

export type ContrastLevel = "fail" | "aa-large" | "aa" | "aaa";

export function classifyContrast(ratio: number): ContrastLevel {
  if (ratio >= 7) return "aaa";
  if (ratio >= 4.5) return "aa";
  if (ratio >= 3) return "aa-large";
  return "fail";
}

export function meetsAA(ratio: number, largeText = false): boolean {
  return ratio >= (largeText ? 3 : 4.5);
}

/** Linear mix in sRGB (0–1 t) */
export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Sample gradient stops + intermediates; return the worst contrast vs background.
 */
export function worstGradientContrast(
  stops: string[],
  background: string,
  samplesPerSegment = 4,
): { ratio: number; color: string } | null {
  const bg = parseHex(background);
  if (!bg || stops.length === 0) return null;
  const parsed = stops.map(parseHex).filter(Boolean) as RGB[];
  if (parsed.length === 0) return null;

  let worst = { ratio: Infinity, color: toHex(parsed[0]) };
  for (let i = 0; i < parsed.length; i++) {
    const r = contrastRatio(parsed[i], bg);
    if (r < worst.ratio) worst = { ratio: r, color: toHex(parsed[i]) };
    if (i < parsed.length - 1) {
      for (let s = 1; s <= samplesPerSegment; s++) {
        const mixed = mixRgb(parsed[i], parsed[i + 1], s / (samplesPerSegment + 1));
        const cr = contrastRatio(mixed, bg);
        if (cr < worst.ratio) worst = { ratio: cr, color: toHex(mixed) };
      }
    }
  }
  return worst;
}

/**
 * Nudge ink toward black/white until contrast ≥ target against background.
 * Preserves hue approximately via channel scaling (transparent, optional Fix).
 */
export function fixContrastInk(
  ink: string,
  background: string,
  target = 4.5,
): string | null {
  let a = parseHex(ink);
  const bg = parseHex(background);
  if (!a || !bg) return null;
  if (contrastRatio(a, bg) >= target) return toHex(a);

  const bgLum = relativeLuminance(bg);
  const towardWhite = bgLum < 0.5;
  const end = towardWhite ? 255 : 0;

  for (let i = 0; i < 48 && contrastRatio(a, bg) < target; i++) {
    a = a.map((v) => Math.round(v + (end - v) * 0.1)) as RGB;
  }
  return toHex(a);
}

/** Soften a highlight against page background for readable tinted surfaces */
export function blendHighlight(
  highlight: string,
  background: RGB,
  amount = 0.22,
): string {
  const h = parseHex(highlight);
  if (!h) return highlight;
  const mixed = h.map((v, i) =>
    Math.round(background[i] * (1 - amount) + v * amount),
  ) as RGB;
  return `rgb(${mixed.join(",")})`;
}
