import { describe, expect, it } from "vitest";
import {
  appearanceCapabilities,
  defaultAppearanceConfig,
  getPatternsByCase,
  resolveVisualTreatment,
} from "glyptide";
import { filterGroups, groupPatterns } from "./pattern-select";

describe("appearance capabilities", () => {
  it("allows gradient on word settle and new responses", () => {
    const caps = appearanceCapabilities("spring", "new", "Word settle");
    expect(caps.colorModes).toContain("gradient");
    expect(caps.treatments).toEqual(
      expect.arrayContaining(["ink", "highlight", "underline", "glow"]),
    );
  });

  it("keeps dedicated gradient effects as gradient defaults", () => {
    const cfg = defaultAppearanceConfig("gradientInk", "new", "Gradient ink");
    expect(cfg.colorMode).toBe("gradient");
    expect(cfg.treatment).toBe("ink");
    expect(appearanceCapabilities("gradientInk", "new").dedicatedGradient).toBe(
      true,
    );
  });

  it("limits semantic review effects to ink", () => {
    const caps = appearanceCapabilities("ghost", "continue", "Ghost suggestion");
    expect(caps.colorModes).toEqual(["default", "solid"]);
    expect(caps.treatments).toEqual(["ink"]);
    expect(caps.preservesSemanticColors).toBe(true);
  });

  it("limits code patterns to ink and underline", () => {
    const caps = appearanceCapabilities("fade", "structured", "Code line stream");
    expect(caps.treatments).toEqual(["ink", "underline"]);
    expect(caps.preservesSyntaxHighlight).toBe(true);
  });

  it("resolves solid highlight without gradient animation", () => {
    const v = resolveVisualTreatment(
      "spring",
      { colorMode: "solid", treatment: "highlight", intensity: 0.8 },
      false,
    );
    expect(v.solidOnly).toBe(true);
    expect(v.animateGradient).toBe(false);
    expect(v.className).toContain("appear-highlight");
  });

  it("resolves animated gradient ink", () => {
    const v = resolveVisualTreatment(
      "spring",
      {
        colorMode: "gradient",
        treatment: "ink",
        gradientMotion: "animated",
      },
      false,
    );
    expect(v.className).toBe("grad-ink");
    expect(v.animateGradient).toBe(true);
  });

  it("respects reduced motion for gradient travel", () => {
    const v = resolveVisualTreatment(
      "gradientInk",
      { colorMode: "default", treatment: "ink" },
      true,
    );
    expect(v.animateGradient).toBe(false);
  });
});

describe("structured pattern groups", () => {
  it("groups structured patterns from the registry", () => {
    const groups = groupPatterns(getPatternsByCase("structured"));
    expect(groups.map((g) => g.id)).toEqual([
      "Lists",
      "Code",
      "Sections",
      "Checklists",
      "Data",
      "Outlines",
      "Quotes",
      "Explanations",
    ]);
    expect(groups.reduce((n, g) => n + g.patterns.length, 0)).toBe(35);
  });

  it("hides empty groups when filtering", () => {
    const groups = groupPatterns(getPatternsByCase("structured"));
    const filtered = filterGroups(groups, "checklist");
    expect(filtered.every((g) => g.patterns.length > 0)).toBe(true);
    expect(filtered.some((g) => /check/i.test(g.label))).toBe(true);
  });

  it("searches category names", () => {
    const groups = groupPatterns(getPatternsByCase("structured"));
    const filtered = filterGroups(groups, "quotations");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("Quotes");
  });
});
