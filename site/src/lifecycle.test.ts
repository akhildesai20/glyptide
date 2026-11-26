import { describe, expect, it } from "vitest";
import {
  appearanceLifecycleFor,
  patterns,
  TRANSIENT_APPEARANCE_CLASSES,
} from "glyptide";

describe("appearance lifecycle registry", () => {
  it("classifies every registered pattern", () => {
    expect(patterns.length).toBe(96);
    for (const p of patterns) {
      const meta = appearanceLifecycleFor(p.effect, p.caseId, p.name);
      expect(["transient", "persistent", "review-bound"]).toContain(
        meta.lifecycle,
      );
      expect(["piece", "generation", "accept", "none"]).toContain(
        meta.settlement,
      );
    }
  });

  it("marks review effects as review-bound", () => {
    for (const effect of ["ghost", "review", "diff", "worddiff", "addition"] as const) {
      expect(appearanceLifecycleFor(effect).lifecycle).toBe("review-bound");
      expect(appearanceLifecycleFor(effect).settlement).toBe("accept");
    }
  });

  it("keeps heading formatting persistent", () => {
    expect(appearanceLifecycleFor("heading").lifecycle).toBe("persistent");
  });

  it("treats gradient and emphasis as piece-settling transient", () => {
    for (const effect of [
      "gradientInk",
      "gradientHighlight",
      "gradientGlow",
      "gradientUnderline",
      "emphasis",
      "checkpoint",
    ] as const) {
      const meta = appearanceLifecycleFor(effect);
      expect(meta.lifecycle).toBe("transient");
      expect(meta.settlement).toBe("piece");
    }
  });

  it("treats colored insertion as generation-settling transient", () => {
    for (const effect of ["color", "underline", "replacementInk", "mark", "linebar"] as const) {
      const meta = appearanceLifecycleFor(effect);
      expect(meta.lifecycle).toBe("transient");
      expect(meta.settlement).toBe("generation");
    }
  });

  it("exports a non-empty transient class list", () => {
    expect(TRANSIENT_APPEARANCE_CLASSES.length).toBeGreaterThan(8);
    expect(TRANSIENT_APPEARANCE_CLASSES).toContain("grad-ink");
    expect(TRANSIENT_APPEARANCE_CLASSES).toContain("appear-highlight");
  });
});
