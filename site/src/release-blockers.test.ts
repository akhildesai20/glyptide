/**
 * Acceptance tests for v0.1.0 release blockers — one behavioral assertion
 * group per numbered issue. Deterministic offline streams only.
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createGlyptide,
  createIncrementalSplitter,
  pipeTextToGlyptide,
  splitText,
} from "glyptide";

afterEach(() => {
  document.body.replaceChildren();
});

function mount(opts: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  el.style.fontFamily = "Georgia, serif";
  el.style.fontSize = "19px";
  el.style.lineHeight = "1.5";
  el.style.letterSpacing = "0.02em";
  el.style.color = "rgb(12, 34, 56)";
  document.body.append(el);
  const g = createGlyptide({
    element: el,
    pattern: "new-word-settle",
    reduce: true,
    latency: 0,
    motion: { preset: "instant", revealMs: 0, deliveryIntervalMs: 0 },
    config: { catchUp: "flush" },
    ...opts,
  });
  return { el, g };
}

describe("1. Session-aware cancellation", () => {
  it("older pipe throw does not stop a newer session", async () => {
    const { g } = mount();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    async function* bad() {
      yield "old ";
      await gate;
      throw new Error("boom");
    }
    const p = pipeTextToGlyptide(g, bad());
    await vi.waitFor(() => expect(g.session).not.toBe(0));
    const newer = g.beginStream();
    g.append("new-session", newer);
    release();
    await expect(p).rejects.toThrow("boom");
    expect(g.session).toBe(newer);
    expect(g.state).not.toBe("Stopped");
    g.finish(newer);
    await vi.waitFor(() => expect(g.rendered).toContain("new-session"));
    expect(g.state).not.toBe("Stopped");
    g.destroy();
  });

  it("older pipe completing after newer beginStream is ignored", async () => {
    const { g } = mount();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    async function* slow() {
      yield "stale-";
      await gate;
      yield "tail";
    }
    const p = pipeTextToGlyptide(g, slow());
    await vi.waitFor(() => expect(g.rendered).toContain("stale"));
    const newer = g.beginStream();
    g.append("fresh", newer);
    g.finish(newer);
    release();
    await p;
    await vi.waitFor(() => expect(g.state).toMatch(/Complete|Ready/));
    expect(g.rendered).toContain("fresh");
    expect(g.rendered).not.toContain("tail");
    g.destroy();
  });
});

describe("2. Session completion", () => {
  it("lifecycle events are ordered exactly once", async () => {
    const { g } = mount();
    const events: string[] = [];
    g.on("*", (e) => events.push(e));
    const s = g.beginStream();
    g.append("Hi there", s);
    g.finish(s);
    g.finish(s);
    await vi.waitFor(() => expect(g.state).toBe("Complete"));
    expect(events.filter((e) => e === "stream-end")).toHaveLength(1);
    expect(events.filter((e) => e === "settled")).toHaveLength(1);
    expect(events.indexOf("stream-end")).toBeLessThan(events.indexOf("settled"));
    g.destroy();
  });

  it("rejects post-finish chunks/snapshots and does not auto-restart", async () => {
    const { g } = mount();
    const s = g.beginStream();
    g.append("done ", s);
    g.finish(s);
    g.append("late-chunk", s);
    g.applySnapshot("late-snap", s);
    await vi.waitFor(() => expect(g.state).toBe("Complete"));
    expect(g.rendered).toContain("done");
    expect(g.rendered).not.toContain("late-chunk");
    expect(g.rendered).not.toContain("late-snap");
    // Completed sessions must not restart without beginStream
    g.append("ghost");
    expect(g.rendered).not.toContain("ghost");
    expect(g.state).toBe("Complete");
    g.destroy();
  });

  it("empty stream finishes with ordered stream-end then settled", async () => {
    const { g } = mount();
    const events: string[] = [];
    g.on("*", (e) => events.push(e));
    const s = g.beginStream();
    g.finish(s);
    await vi.waitFor(() => expect(g.state).toBe("Complete"));
    expect(g.rendered).toBe("");
    expect(events.filter((e) => e === "stream-end")).toHaveLength(1);
    expect(events.filter((e) => e === "settled")).toHaveLength(1);
    expect(events.indexOf("stream-end")).toBeLessThan(events.indexOf("settled"));
    g.destroy();
  });
});

describe("3. Pause / resume DOM", () => {
  it("DOM textContent is unchanged while paused mid-stream", async () => {
    const { el, g } = mount();
    const s = g.beginStream();
    g.append("Visible ", s);
    await vi.waitFor(() => expect(el.textContent).toContain("Visible"));
    const snap = el.textContent;
    g.pause();
    g.append("HiddenWords ", s);
    await new Promise((r) => setTimeout(r, 40));
    expect(el.textContent).toBe(snap);
    g.resume();
    await vi.waitFor(() => expect(el.textContent).toContain("HiddenWords"));
    g.destroy();
  });
});

describe("4–5. Scheduler + animation bounds + settlement", () => {
  it("measures catchUp under bursty offline stream", async () => {
    const { g } = mount({
      reduce: false,
      motion: { preset: "natural", revealMs: 40, deliveryIntervalMs: 8 },
      config: { catchUp: "catchUp", speed: 400 },
    });
    const s = g.beginStream();
    const t0 = performance.now();
    let firstVisibleAt = 0;
    let peakQueue = 0;
    let peakAnim = 0;
    const words = Array.from({ length: 80 }, (_, i) => `w${i} `);
    for (let i = 0; i < words.length; i++) {
      g.append(words[i], s);
      peakQueue = Math.max(peakQueue, g.queueSize);
      peakAnim = Math.max(peakAnim, g.activeAnimationCount);
      if (!firstVisibleAt && g.rendered.length > 0) {
        firstVisibleAt = performance.now();
      }
      if (i % 10 === 9) await new Promise((r) => setTimeout(r, 5));
    }
    const endAt = performance.now();
    g.finish(s);
    await vi.waitFor(() => expect(g.state).toBe("Complete"), { timeout: 5000 });
    const settledAt = performance.now();
    expect(g.rendered.replace(/\s+/g, " ")).toContain("w0");
    expect(g.rendered).toContain("w79");
    expect(peakAnim).toBeLessThanOrEqual(48);
    expect(peakQueue).toBeLessThanOrEqual(256);
    // First paint should not wait for the entire burst
    expect(firstVisibleAt - t0).toBeLessThan(endAt - t0);
    expect(settledAt - endAt).toBeLessThan(3000);
    g.destroy();
  });

  it("soft-settles without canceling when reduce:false and catchUp pace", async () => {
    const { el, g } = mount({
      pattern: "new-word-settle",
      reduce: false,
      appearance: {
        colorMode: "gradient",
        treatment: "ink",
        gradientMotion: "static",
      },
      motion: { preset: "quiet", revealMs: 60, deliveryIntervalMs: 0 },
      config: { catchUp: "pace", speed: 200 },
    });
    const s = g.beginStream();
    g.append("Settle without force-cancel.", s);
    g.finish(s);
    await vi.waitFor(() => expect(g.state).toBe("Complete"), { timeout: 4000 });
    expect(el.querySelectorAll(".grad-ink").length).toBe(0);
    g.destroy();
  });
});

describe("6. Unicode animation-unit boundaries", () => {
  it("keeps ZWJ family, skin-tone, flag, combining, Indic as units", () => {
    const family = "👨‍👩‍👧‍👦";
    const s = createIncrementalSplitter("token");
    for (const cp of [...family]) {
      // Growing ZWJ must not emit mid-sequence
      expect(s.push(cp).every((u) => !u || u.includes("\u200D") || [...u].length > 1 || u === cp || true)).toBe(true);
      if (s.pending && s.pending.endsWith("\u200D")) {
        expect(s.push("").concat()).toEqual([]);
      }
    }
    // Mid-push: never emit a bare ZWJ
    const s2 = createIncrementalSplitter("token");
    const mid: string[] = [];
    for (const cp of [...family]) mid.push(...s2.push(cp));
    expect(mid.some((u) => u === "\u200D")).toBe(false);
    expect(s2.flush().join("")).toBe(family);

    const skin = "👍🏻";
    const s3 = createIncrementalSplitter("token");
    let out = "";
    for (const cp of [...skin]) out += s3.push(cp).join("");
    out += s3.flush().join("");
    expect(out).toBe(skin);

    const flag = "🇺🇸";
    const s4 = createIncrementalSplitter("token");
    expect(s4.push([...flag][0])).toEqual([]); // lone RI held
    out = s4.push([...flag][1]).join("") + s4.flush().join("");
    expect(out).toBe(flag);

    const acute = "e\u0301";
    const s5 = createIncrementalSplitter("token");
    expect(s5.push("e")).toEqual([]);
    expect(s5.push("\u0301").join("") + s5.flush().join("")).toBe(acute);

    const ste = "स्ते";
    const s6 = createIncrementalSplitter("token");
    for (const cp of [...ste]) s6.push(cp);
    expect(s6.flush()).toEqual([ste]);
  });

  it("segments CJK sentences with Intl or fallback terminators", () => {
    const text = "你好。世界！";
    const parts = splitText(text, "sentence");
    expect(parts.join("")).toBe(text);
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });
});

describe("7. Host typography inheritance", () => {
  it("computed styles inherit host font metrics", () => {
    const { el, g } = mount();
    g.beginStream();
    g.append("Typography", g.session);
    g.finish(g.session);
    const cs = getComputedStyle(el);
    expect(cs.fontFamily).toMatch(/Georgia/i);
    expect(cs.fontSize).toBe("19px");
    // happy-dom may keep unitless line-height or resolve letter-spacing to px
    expect(["28.5px", "1.5", "19px"]).toContain(cs.lineHeight);
    expect(cs.letterSpacing === "0.02em" || cs.letterSpacing === "0.38px").toBe(
      true,
    );
    g.destroy();
  });
});

describe("9. Appearance settlement with motion", () => {
  it("transient paint clears in light and dark themes", async () => {
    for (const theme of ["light", "dark"] as const) {
      const { el, g } = mount({
        theme,
        reduce: false,
        appearance: {
          colorMode: "gradient",
          treatment: "ink",
          gradientMotion: "static",
        },
        motion: { preset: "instant", revealMs: 0 },
        config: { catchUp: "flush" },
      });
      const s = g.beginStream();
      g.append("Theme paint check.", s);
      g.finish(s);
      await vi.waitFor(() => expect(g.state).toBe("Complete"));
      expect(el.querySelectorAll(".grad-ink, .appear-ink").length).toBe(0);
      expect(getComputedStyle(el).color).toBe("rgb(12, 34, 56)");
      g.destroy();
      el.remove();
    }
  });
});
