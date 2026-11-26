import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetAbortListenerStats,
  __abortListenerAdds,
  __abortListenerRemoves,
  consumeTextStream,
  createGlyptide,
  createIncrementalSplitter,
  createStreamIngress,
  GlyptideConfigError,
  pipeTextToGlyptide,
  splitText,
} from "glyptide";

afterEach(() => {
  document.body.replaceChildren();
  __resetAbortListenerStats();
});

function mount(opts: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  el.className = "host-card";
  document.body.append(el);
  const g = createGlyptide({
    element: el,
    pattern: "new-word-settle",
    reduce: true,
    motion: { preset: "instant", revealMs: 0 },
    latency: 0,
    ...opts,
  });
  return { el, g };
}

describe("abort listener cleanup", () => {
  it("does not accumulate listeners across 10k chunks", async () => {
    __resetAbortListenerStats();
    const ac = new AbortController();
    async function* src() {
      for (let i = 0; i < 10_000; i++) yield "x";
    }
    const text = await consumeTextStream(src(), { signal: ac.signal });
    expect(text.length).toBe(10_000);
    // Adds may occur per race, but each must be removed
    expect(__abortListenerAdds).toBe(__abortListenerRemoves);
    expect(__abortListenerAdds - __abortListenerRemoves).toBe(0);
  });

  it("cleans up when aborted mid-stream", async () => {
    __resetAbortListenerStats();
    const ac = new AbortController();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    async function* src() {
      yield "a";
      await gate;
      yield "b";
    }
    const p = consumeTextStream(src(), { signal: ac.signal });
    await vi.waitFor(() => expect(__abortListenerAdds).toBeGreaterThan(0));
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    release();
    await new Promise((r) => setTimeout(r, 5));
    expect(__abortListenerAdds).toBe(__abortListenerRemoves);
  });
});

describe("generation session isolation", () => {
  it("ignores delayed chunks after stop", async () => {
    const { el, g } = mount();
    const session = g.beginStream();
    g.append("hello ", session);
    g.stop();
    g.append("STALE", session);
    expect(g.rendered).not.toContain("STALE");
    expect(el.textContent).not.toContain("STALE");
    g.destroy();
  });

  it("ignores delayed chunks after reset", () => {
    const { g } = mount();
    const session = g.beginStream();
    g.append("one", session);
    g.reset();
    g.append("two", session);
    expect(g.rendered).not.toContain("two");
    g.destroy();
  });

  it("ignores delayed chunks after destroy", () => {
    const { el, g } = mount();
    const session = g.beginStream();
    g.append("alive", session);
    g.destroy();
    g.append("ghost", session);
    expect(el.textContent).not.toContain("ghost");
  });

  it("does not auto-restart from Stopped without beginStream", () => {
    const { g } = mount();
    g.beginStream();
    g.append("a");
    g.stop();
    expect(g.state).toBe("Stopped");
    g.append("restart");
    expect(g.rendered).not.toContain("restart");
    g.destroy();
  });

  it("stream B invalidates stream A", async () => {
    const { g } = mount({ config: { catchUp: "flush" } });
    const a = g.beginStream();
    g.append("AAA ", a);
    const b = g.beginStream();
    g.append("BBB ", b);
    g.append("fromA", a);
    expect(g.rendered).toContain("BBB");
    expect(g.rendered).not.toContain("fromA");
    expect(g.rendered).not.toContain("AAA");
    g.finish(b);
    g.destroy();
  });
});

describe("incremental cross-chunk segmentation", () => {
  it("buffers incomplete words across chunks", () => {
    const s = createIncrementalSplitter("word");
    expect(s.push("Hel")).toEqual([]);
    expect(s.push("lo wo")).toEqual(["Hello "]);
    // Completing "wo"+"rld." may emit the finished word immediately
    expect(s.push("rld.").join("") + s.flush().join("")).toBe("world.");
  });

  it("different partitions yield same final text", () => {
    const source = "Hello world.";
    const partitions = [
      ["Hello ", "world."],
      ["Hel", "lo wo", "rld."],
      [...source],
    ];
    for (const parts of partitions) {
      const s = createIncrementalSplitter("word");
      let out = "";
      for (const p of parts) out += s.push(p).join("");
      out += s.flush().join("");
      expect(out).toBe(source);
    }
  });

  it("preserves unicode emoji ZWJ across splits", () => {
    const emoji = "👨‍👩‍👧‍👦";
    const bytes = [...emoji];
    const s = createIncrementalSplitter("token");
    let out = "";
    for (const ch of bytes) out += s.push(ch).join("");
    out += s.flush().join("");
    expect(out).toBe(emoji);
  });
});

describe("paced draining", () => {
  it("pace continues draining after a large chunk then pause in source", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
      motion: { preset: "instant", revealMs: 0, deliveryIntervalMs: 0 },
      config: { catchUp: "pace", speed: 1000 },
    });
    const session = g.beginStream();
    g.append("one two three four five six", session);
    // Allow drain timers
    await new Promise((r) => setTimeout(r, 50));
    g.finish(session);
    await new Promise((r) => setTimeout(r, 80));
    expect(g.rendered.replace(/\s+/g, " ").trim()).toContain("one");
    expect(g.rendered).toContain("six");
    g.destroy();
  });

  it("flush reveals promptly", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
      motion: { preset: "instant", revealMs: 0 },
      config: { catchUp: "flush" },
    });
    const session = g.beginStream();
    g.append("alpha beta gamma", session);
    g.finish(session);
    expect(g.rendered).toContain("gamma");
    g.destroy();
  });
});

describe("empty snapshot sync iterable", () => {
  it("preserves empty string as replacement", async () => {
    const text = await consumeTextStream(["Hello", ""], { mode: "snapshot" });
    expect(text).toBe("");
  });
});

describe("mixed string/binary boundary", () => {
  it("flushes decoder before a string chunk after partial UTF-8", async () => {
    // café = c3 a9 for é — send c3 then string "x" then a9 would be wrong;
    // policy: flush on string boundary so pending c3 becomes replacement/empty safely
    const c3 = new Uint8Array([0xc3]);
    async function* src() {
      yield "ca";
      yield c3;
      yield "X";
    }
    const out = await consumeTextStream(src());
    // After binary partial, string flushes decoder then appends X
    expect(out.startsWith("ca")).toBe(true);
    expect(out.includes("X")).toBe(true);
  });
});

describe("invalid stream source", () => {
  it("throws TypeError for unsupported sources", async () => {
    await expect(consumeTextStream(42 as never)).rejects.toBeInstanceOf(TypeError);
  });
});

describe("transactional setAppearance", () => {
  it("rejects invalid theme without mutating prior config", () => {
    const { g, el } = mount({ colors: { ink: "#112233" } });
    const before = el.style.getPropertyValue("--gen");
    expect(() =>
      g.setAppearance({ theme: "neon" as never }),
    ).toThrow(GlyptideConfigError);
    expect(el.style.getPropertyValue("--gen")).toBe(before);
    g.destroy();
  });
});

describe("CSS / DOM ownership", () => {
  it("does not style host .document elements outside glyptide", async () => {
    const host = document.createElement("div");
    host.className = "document";
    host.textContent = "host";
    document.body.append(host);
    // Importing styles in vitest is limited; assert class namespacing contract
    const { el, g } = mount();
    expect(el.classList.contains("glyptide-document")).toBe(true);
    expect(el.classList.contains("document")).toBe(false);
    expect(host.classList.contains("glyptide-document")).toBe(false);
    g.destroy();
    expect(el.classList.contains("glyptide-document")).toBe(false);
    expect(el.classList.contains("host-card")).toBe(true);
  });

  it("preserves host classes on destroy", () => {
    const el = document.createElement("div");
    el.className = "document host-shell";
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
    });
    expect(el.classList.contains("document")).toBe(true); // pre-existing kept
    g.destroy();
    expect(el.classList.contains("document")).toBe(true);
    expect(el.classList.contains("host-shell")).toBe(true);
    expect(el.classList.contains("glyptide-document")).toBe(false);
  });
});

describe("configurable stallMs", () => {
  it("honors disabled stall", () => {
    const ingress = createStreamIngress({ stallMs: 0 });
    ingress.push(["x"]);
    expect(ingress.checkSourceStall(false)).toBe(false);
  });

  it("detects stall only when visual queue is empty", () => {
    let now = 1000;
    const onStall = vi.fn();
    const ingress = createStreamIngress({
      stallMs: 100,
      onStall,
      now: () => now,
    });
    ingress.push(["a"]);
    now = 1200;
    expect(ingress.checkSourceStall(true)).toBe(false);
    expect(onStall).not.toHaveBeenCalled();
    expect(ingress.checkSourceStall(false)).toBe(true);
    expect(onStall).toHaveBeenCalledTimes(1);
  });

  it("setStallMs updates threshold", () => {
    let now = 0;
    const ingress = createStreamIngress({
      stallMs: 5000,
      now: () => now,
    });
    ingress.push(["a"]);
    ingress.setStallMs(50);
    now = 60;
    expect(ingress.checkSourceStall(false)).toBe(true);
  });
});

describe("splitText stability", () => {
  it("word split matches joined incremental flush for english", () => {
    const text = "Hello brave world";
    expect(splitText(text, "word").join("")).toBe(text);
  });
});

describe("ghost review lifecycle", () => {
  it("continue ghost settles to Review not Complete", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "continue-ghost-suggestion",
      reduce: true,
      latency: 0,
      motion: { preset: "instant", revealMs: 0 },
    });
    g.start({
      text: " Next sentence.",
      source: "Lead-in text.",
      reduce: true,
      latency: 0,
    });
    await vi.waitFor(() => expect(g.state).toMatch(/Review|Complete/), {
      timeout: 2000,
    });
    expect(g.state).toBe("Review");
    expect(el.querySelector(".ghost")).toBeTruthy();
    g.destroy();
  });
});
