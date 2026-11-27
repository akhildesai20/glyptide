/**
 * Pre-release reliability regressions (streaming contracts, appearance paint,
 * announcements). Complements stream/stabilization suites.
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGlyptide,
  pipeTextToGlyptide,
} from "glyptide";

afterEach(() => {
  document.body.replaceChildren();
});

async function waitForState(
  g: { state: string; destroy: () => void },
  want: RegExp | string,
  ms = 2000,
) {
  const deadline = Date.now() + ms;
  const match =
    typeof want === "string"
      ? (s: string) => s === want
      : (s: string) => want.test(s);
  while (Date.now() < deadline) {
    if (match(g.state)) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`Timed out waiting for state ${want}; got ${g.state}`);
}

function mount(opts: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  el.style.color = "rgb(20, 80, 160)";
  document.body.append(el);
  const g = createGlyptide({
    element: el,
    pattern: "new-word-settle",
    reduce: true,
    latency: 0,
    motion: { preset: "instant", revealMs: 0, deliveryIntervalMs: 0 },
    ...opts,
  });
  return { el, g };
}

describe("pipe error / done contracts", () => {
  it("calls onError and not onDone when the upstream throws", async () => {
    const { el, g } = mount();
    const onError = vi.fn();
    const onDone = vi.fn();
    async function* src() {
      yield "partial ";
      throw new Error("upstream-fail");
    }
    await expect(
      pipeTextToGlyptide(g, src(), { onError, onDone }),
    ).rejects.toThrow("upstream-fail");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    expect(g.state).not.toBe("Complete");
    g.destroy();
    el.remove();
  });

  it("overlapping pipes: later session wins; late A chunks are ignored", async () => {
    const { el, g } = mount();
    let releaseA!: () => void;
    const gateA = new Promise<void>((r) => {
      releaseA = r;
    });
    async function* streamA() {
      yield "fromA ";
      await gateA;
      yield "lateA";
    }
    async function* streamB() {
      yield "fromB-only";
    }
    const pA = pipeTextToGlyptide(g, streamA());
    await Promise.resolve();
    const pB = pipeTextToGlyptide(g, streamB());
    await pB;
    releaseA();
    await expect(pA).resolves.toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(g.rendered).toContain("fromB");
    expect(g.rendered).not.toContain("lateA");
    g.destroy();
    el.remove();
  });
});

describe("announcements", () => {
  it("announces prepare and complete, not every token", () => {
    const messages: string[] = [];
    const { el, g } = mount({
      onAnnounce: (m: string) => messages.push(m),
    });
    g.beginStream();
    g.append("one ");
    g.append("two ");
    g.append("three");
    g.finish();
    expect(messages).toContain("Preparing text.");
    expect(messages).toContain("Generation complete.");
    expect(messages.length).toBeLessThan(6);
    g.destroy();
    el.remove();
  });
});

describe("appearance settlement with motion paint enabled", () => {
  it("clears transient gradient paint after Complete (reduce:false)", async () => {
    const { el, g } = mount({
      pattern: "new-gradient-ink",
      reduce: false,
      appearance: {
        colorMode: "gradient",
        treatment: "ink",
        gradientMotion: "static",
      },
      motion: { preset: "instant", revealMs: 0, deliveryIntervalMs: 0 },
      config: { catchUp: "flush" },
    });
    const session = g.beginStream();
    g.append("Gradient ink settles to host color.", session);
    g.finish(session);
    await waitForState(g, "Complete", 3000);
    expect(el.querySelectorAll(".grad-ink, .appear-ink").length).toBe(0);
    expect(getComputedStyle(el).color).toBe("rgb(20, 80, 160)");
    g.destroy();
    el.remove();
  });

  it("piece-lifecycle pattern does not leave gradient classes after Complete", async () => {
    const { el, g } = mount({
      pattern: "new-word-settle",
      reduce: false,
      appearance: {
        colorMode: "gradient",
        treatment: "ink",
        gradientMotion: "static",
      },
      motion: { preset: "instant", revealMs: 0, deliveryIntervalMs: 0 },
      config: { catchUp: "flush" },
    });
    const session = g.beginStream();
    g.append("Readable prose with transient paint.", session);
    g.finish(session);
    await waitForState(g, "Complete", 3000);
    expect(el.querySelectorAll(".grad-ink, .appear-ink, .grad-highlight").length).toBe(
      0,
    );
    g.destroy();
    el.remove();
  });
});

describe("animation queue bounds under catchUp", () => {
  it("keeps activeAnimationCount within cap while preserving full text", async () => {
    const { el, g } = mount({
      reduce: true,
      motion: { preset: "instant", revealMs: 0, deliveryIntervalMs: 0 },
      config: { catchUp: "catchUp", speed: 5000 },
    });
    const session = g.beginStream();
    const words = Array.from({ length: 120 }, (_, i) => `w${i}`).join(" ");
    g.append(words, session);
    expect(g.queueSize).toBeLessThanOrEqual(256);
    expect(g.activeAnimationCount).toBeLessThanOrEqual(48);
    g.finish(session);
    await waitForState(g, /Complete|Ready/, 5000);
    expect(g.rendered.replace(/\s+/g, " ")).toContain("w0");
    expect(g.rendered).toContain("w119");
    expect(g.activeAnimationCount).toBeLessThanOrEqual(48);
    g.destroy();
    el.remove();
  });
});
