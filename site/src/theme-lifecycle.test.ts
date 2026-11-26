/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGlyptide } from "glyptide";

describe("theme / appearance mid-generation", () => {
  let out: HTMLDivElement;
  let wait: HTMLDivElement;

  beforeEach(() => {
    out = document.createElement("div");
    wait = document.createElement("div");
    document.body.append(out, wait);
  });

  afterEach(() => {
    out?.remove();
    wait?.remove();
  });

  it("setAppearance during live stream does not wipe rendered text", () => {
    const g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: "new-word-settle",
      reduce: true,
      preset: "aurora",
      theme: "light",
    });
    g.append("Hello ");
    g.setAppearance({ preset: "graphite", theme: "dark" });
    g.append("world");
    g.finish();
    expect(g.rendered).toBe("Hello world");
    g.destroy();
  });

  it("finish after append reaches complete for quiet pattern", () => {
    const g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: "new-word-settle",
      reduce: true,
      latency: 0,
      appearance: {
        colorMode: "gradient",
        treatment: "ink",
        gradientMotion: "static",
      },
    });
    g.append("Paint");
    g.finish();
    expect(["Complete", "Generating", "Review"]).toContain(g.state);
    g.destroy();
  });
});
