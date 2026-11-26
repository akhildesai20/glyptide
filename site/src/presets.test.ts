import { describe, expect, it } from "vitest";
import {
  PALETTE_PRESETS,
  classifyContrast,
  contrastRatioHex,
  getPreset,
  meetsAA,
  worstGradientContrast,
} from "glyptide";

const LIGHT_BG = "#FFFFFF";
const DARK_BG = "#111111";

describe("palette presets", () => {
  it("includes exactly 18 curated presets", () => {
    expect(PALETTE_PRESETS).toHaveLength(18);
  });

  it("has graphite, intelligence, and aurora", () => {
    expect(getPreset("graphite")?.category).toBe("minimal");
    expect(getPreset("intelligence")?.category).toBe("ai");
    expect(getPreset("aurora")?.category).toBe("expressive");
  });

  it("keeps independent light and dark values", () => {
    for (const p of PALETTE_PRESETS) {
      expect(p.light.ink).not.toBe(p.dark.ink);
      expect(p.light.highlight).not.toBe(p.dark.highlight);
    }
  });

  it("meets AA ink contrast on light and dark surfaces for all presets", () => {
    const failures: string[] = [];
    for (const p of PALETTE_PRESETS) {
      for (const theme of ["light", "dark"] as const) {
        const bg = theme === "light" ? LIGHT_BG : DARK_BG;
        const ratio = contrastRatioHex(p[theme].ink, bg);
        if (ratio == null || !meetsAA(ratio)) {
          failures.push(
            `${p.id}/${theme} ink ${p[theme].ink} vs ${bg} = ${ratio?.toFixed(2)}`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("samples gradient intermediates for expressive presets", () => {
    const aurora = getPreset("aurora")!;
    const light = worstGradientContrast(
      [aurora.light.ink, aurora.light.gradientMiddle, aurora.light.gradientEnd],
      LIGHT_BG,
    );
    const dark = worstGradientContrast(
      [aurora.dark.ink, aurora.dark.gradientMiddle, aurora.dark.gradientEnd],
      DARK_BG,
    );
    expect(light).not.toBeNull();
    expect(dark).not.toBeNull();
    expect(classifyContrast(light!.ratio)).not.toBe("fail");
    expect(classifyContrast(dark!.ratio)).not.toBe("fail");
  });
});
