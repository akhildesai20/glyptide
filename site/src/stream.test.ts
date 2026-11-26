import { describe, expect, it, vi } from "vitest";
import {
  applyTextOperation,
  consumeTextStream,
  createGlyptide,
  GlyptideConfigError,
  normalizeSnapshot,
  pipeTextToGlyptide,
  recommendPatterns,
} from "glyptide";

describe("normalizeSnapshot", () => {
  it("append-only growth", () => {
    expect(normalizeSnapshot("Hi", "Hi there")).toEqual({
      type: "append",
      text: " there",
    });
  });

  it("duplicate → noop", () => {
    expect(normalizeSnapshot("Hi", "Hi")).toEqual({ type: "noop" });
  });

  it("divergent → replace", () => {
    expect(normalizeSnapshot("The colour is red.", "The colour is blue.")).toEqual({
      type: "replace",
      text: "The colour is blue.",
    });
  });

  it("shrinking → replace", () => {
    expect(normalizeSnapshot("Hello world", "Hello")).toEqual({
      type: "replace",
      text: "Hello",
    });
  });

  it("empty → replace", () => {
    expect(normalizeSnapshot("x", "")).toEqual({ type: "replace", text: "" });
  });

  it("applyTextOperation never appends a replace", () => {
    expect(
      applyTextOperation("The colour is red.", {
        type: "replace",
        text: "The colour is blue.",
      }),
    ).toBe("The colour is blue.");
  });
});

describe("consumeTextStream", () => {
  it("concatenates delta chunks", async () => {
    async function* src() {
      yield "Hel";
      yield "lo";
    }
    const parts: string[] = [];
    const text = await consumeTextStream(src(), {
      onChunk: (c) => parts.push(c),
    });
    expect(text).toBe("Hello");
    expect(parts.join("")).toBe("Hello");
  });

  it("dedupes append-only snapshot streams", async () => {
    async function* src() {
      yield "Hi";
      yield "Hi there";
    }
    const parts: string[] = [];
    const text = await consumeTextStream(src(), {
      mode: "snapshot",
      onChunk: (c) => parts.push(c),
    });
    expect(text).toBe("Hi there");
    expect(parts).toEqual(["Hi", " there"]);
  });

  it("does not append divergent snapshots", async () => {
    async function* src() {
      yield "The colour is red.";
      yield "The colour is blue.";
    }
    const chunks: string[] = [];
    const replaces: string[] = [];
    const ops: string[] = [];
    const text = await consumeTextStream(src(), {
      mode: "snapshot",
      onChunk: (c) => chunks.push(c),
      onReplace: (t) => replaces.push(t),
      onOperation: (op) => ops.push(op.type),
    });
    expect(text).toBe("The colour is blue.");
    expect(chunks.join("")).not.toContain("red.The");
    expect(chunks).toEqual(["The colour is red."]);
    expect(replaces).toEqual(["The colour is blue."]);
    expect(ops).toEqual(["append", "replace"]);
  });

  it("handles shrinking snapshots via replace", async () => {
    async function* src() {
      yield "Hello world";
      yield "Hello";
    }
    const replaces: string[] = [];
    const text = await consumeTextStream(src(), {
      mode: "snapshot",
      onReplace: (t) => replaces.push(t),
    });
    expect(text).toBe("Hello");
    expect(replaces).toEqual(["Hello"]);
  });

  it("handles duplicate snapshots as noop", async () => {
    async function* src() {
      yield "Same";
      yield "Same";
    }
    const ops: string[] = [];
    const text = await consumeTextStream(src(), {
      mode: "snapshot",
      onOperation: (op) => ops.push(op.type),
    });
    expect(text).toBe("Same");
    expect(ops).toEqual(["append", "noop"]);
  });

  it("handles empty snapshots", async () => {
    async function* src() {
      yield "Gone";
      yield "";
    }
    const text = await consumeTextStream(src(), { mode: "snapshot" });
    expect(text).toBe("");
  });

  it("handles unicode divergent snapshots", async () => {
    async function* src() {
      yield "नमस्ते दुनिया";
      yield "नमस्ते मित्र";
    }
    const text = await consumeTextStream(src(), { mode: "snapshot" });
    expect(text).toBe("नमस्ते मित्र");
  });
});

describe("UTF-8 decoding across chunk boundaries", () => {
  const samples: Record<string, string> = {
    ascii: "Hello Glyptide",
    latin: "café naïve",
    marathi: "नमस्कार",
    hindi: "नमस्ते",
    arabic: "مرحبا",
    japanese: "こんにちは",
    chinese: "你好世界",
    emoji: "😀🚀",
    skinTone: "👋🏽",
    zwj: "👨‍👩‍👧‍👦",
    combining: "e\u0301",
  };

  function utf8Chunks(text: string): Uint8Array[] {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes, (b) => new Uint8Array([b]));
  }

  for (const [name, text] of Object.entries(samples)) {
    it(`async iterable splits every byte: ${name}`, async () => {
      async function* src() {
        for (const c of utf8Chunks(text)) yield c;
      }
      const out = await consumeTextStream(src());
      expect(out).toBe(text);
      expect(out.includes("\uFFFD")).toBe(false);
    });

    it(`ReadableStream splits every byte: ${name}`, async () => {
      const chunks = utf8Chunks(text);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const c of chunks) controller.enqueue(c);
          controller.close();
        },
      });
      const out = await consumeTextStream(stream);
      expect(out).toBe(text);
    });
  }

  it("preserves order for mixed string and binary pieces", async () => {
    async function* src() {
      yield "A";
      yield new TextEncoder().encode("B");
      yield "C";
    }
    expect(await consumeTextStream(src())).toBe("ABC");
  });
});

describe("cancellation", () => {
  it("aborts a blocked async iterable promptly", async () => {
    const ac = new AbortController();
    let resolveWait!: () => void;
    const wait = new Promise<void>((r) => {
      resolveWait = r;
    });
    let sawPartial!: () => void;
    const gotPartial = new Promise<void>((r) => {
      sawPartial = r;
    });
    async function* src() {
      yield "partial";
      await wait;
      yield "late";
    }
    const chunks: string[] = [];
    const p = consumeTextStream(src(), {
      signal: ac.signal,
      onChunk: (c) => {
        chunks.push(c);
        if (c === "partial") sawPartial();
      },
    });
    await gotPartial;
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    resolveWait();
    await new Promise((r) => setTimeout(r, 10));
    expect(chunks).toEqual(["partial"]);
    expect(chunks).not.toContain("late");
  });

  it("cancels a blocked ReadableStream reader", async () => {
    const ac = new AbortController();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let n = 0;
    const stream = new ReadableStream<string>({
      async pull(controller) {
        n += 1;
        if (n === 1) {
          controller.enqueue("partial");
          return;
        }
        await gate;
        controller.enqueue("late");
        controller.close();
      },
    });
    const chunks: string[] = [];
    const p = consumeTextStream(stream, {
      signal: ac.signal,
      onChunk: (c) => chunks.push(c),
    });
    await vi.waitFor(() => expect(chunks).toEqual(["partial"]));
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    release();
    await new Promise((r) => setTimeout(r, 10));
    expect(chunks).not.toContain("late");
  });

  it("rejects when already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(
      consumeTextStream(["x"], { signal: ac.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("pipeTextToGlyptide + DOM", () => {
  function mount() {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      latency: 0,
      motion: { preset: "instant", revealMs: 0 },
      reduce: true,
    });
    return { el, g };
  }

  it("keeps logical text and DOM in sync for divergent snapshots", async () => {
    const { el, g } = mount();
    async function* src() {
      yield "The colour is red.";
      yield "The colour is blue.";
    }
    const text = await pipeTextToGlyptide(g, src(), { mode: "snapshot" });
    expect(text).toBe("The colour is blue.");
    expect(g.rendered).toBe("The colour is blue.");
    expect(el.textContent).toBe("The colour is blue.");
    expect(el.textContent).not.toContain("red.The");
    g.destroy();
    el.remove();
  });

  it("replaces shrinking snapshots in the DOM", async () => {
    const { el, g } = mount();
    async function* src() {
      yield "Hello world";
      yield "Hello";
    }
    await pipeTextToGlyptide(g, src(), { mode: "snapshot" });
    expect(g.rendered).toBe("Hello");
    expect(el.textContent).toBe("Hello");
    g.destroy();
    el.remove();
  });

  it("stops DOM mutation after abort during pipe", async () => {
    const { el, g } = mount();
    const ac = new AbortController();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    async function* src() {
      yield "one ";
      await gate;
      yield "two";
    }
    const p = pipeTextToGlyptide(g, src(), { signal: ac.signal });
    await Promise.resolve();
    ac.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(el.textContent).not.toContain("two");
    g.destroy();
    el.remove();
  });
});

describe("instance isolation", () => {
  it("does not share waiting indicators under the same parent", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const a = document.createElement("div");
    const b = document.createElement("div");
    parent.append(a, b);
    const ga = createGlyptide({ element: a, pattern: "new-word-settle" });
    const gb = createGlyptide({ element: b, pattern: "new-token-stream" });
    const waits = parent.querySelectorAll(".glyptide-waiting");
    expect(waits.length).toBe(2);
    expect(waits[0]).not.toBe(waits[1]);
    ga.destroy();
    expect(parent.querySelectorAll(".glyptide-waiting").length).toBe(1);
    gb.destroy();
    expect(parent.querySelectorAll(".glyptide-waiting").length).toBe(0);
    parent.remove();
  });

  it("palette updates do not cross instances", () => {
    const parent = document.createElement("div");
    document.body.append(parent);
    const a = document.createElement("div");
    const b = document.createElement("div");
    parent.append(a, b);
    const ga = createGlyptide({
      element: a,
      pattern: "new-word-settle",
      colors: { ink: "#112233" },
    });
    const gb = createGlyptide({
      element: b,
      pattern: "new-word-settle",
      colors: { ink: "#445566" },
    });
    const beforeB = b.style.getPropertyValue("--gen");
    ga.setAppearance({ colors: { ink: "#998877" } });
    const afterA = a.style.getPropertyValue("--gen");
    const afterB = b.style.getPropertyValue("--gen");
    expect(afterA).not.toBe(afterB);
    expect(afterB).toBe(beforeB);
    ga.destroy();
    gb.destroy();
    parent.remove();
  });
});

describe("configuration validation", () => {
  it("throws on unknown pattern ids", () => {
    const el = document.createElement("div");
    document.body.append(el);
    expect(() =>
      createGlyptide({ element: el, pattern: "does-not-exist-xyz" }),
    ).toThrow(GlyptideConfigError);
    el.remove();
  });

  it("throws on invalid theme", () => {
    const el = document.createElement("div");
    expect(() =>
      createGlyptide({
        element: el,
        // @ts-expect-error intentional
        theme: "neon",
      }),
    ).toThrow(GlyptideConfigError);
  });

  it("throws on NaN speed", () => {
    const el = document.createElement("div");
    expect(() => createGlyptide({ element: el, speed: Number.NaN })).toThrow(
      GlyptideConfigError,
    );
  });

  it("accepts a valid pattern", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({ element: el, pattern: "new-word-settle" });
    expect(g.state).toBe("Ready");
    g.destroy();
    el.remove();
  });
});

describe("safe text rendering", () => {
  it("renders HTML-like text as text nodes", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
      motion: { preset: "instant", revealMs: 0 },
    });
    g.append('<script>alert(1)</script><img onerror="x">');
    g.finish();
    expect(el.querySelector("script")).toBeNull();
    expect(el.innerHTML).toContain("&lt;script&gt;");
    expect(g.rendered).toContain("<script>");
    g.destroy();
    el.remove();
  });
});

describe("host DOM ownership", () => {
  it("preserves host inline styles and does not wipe host classes on destroy beyond glyptide", () => {
    const el = document.createElement("div");
    el.className = "host-card";
    el.style.fontFamily = "Georgia, serif";
    el.style.color = "rgb(12, 34, 56)";
    el.style.lineHeight = "1.7";
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
    });
    g.append("Hello");
    g.finish();
    g.destroy();
    expect(el.classList.contains("host-card")).toBe(true);
    expect(el.style.fontFamily).toContain("Georgia");
    expect(el.style.color).toContain("12");
    expect(el.style.lineHeight).toBe("1.7");
    el.remove();
  });
});

describe("recommendPatterns", () => {
  it("returns new-case reading-friendly patterns", () => {
    const recs = recommendPatterns({
      useCase: "new",
      readingComfort: "high",
      limit: 3,
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.every((r) => r.caseId === "new")).toBe(true);
    expect(recs[0].reasons.length).toBeGreaterThan(0);
  });

  it("prefers review patterns when needed", () => {
    const recs = recommendPatterns({
      useCase: "continue",
      needsReview: true,
      limit: 5,
    });
    expect(recs.some((r) => r.id.includes("ghost"))).toBe(true);
  });
});

describe("lifecycle events", () => {
  it("emits stream-end before settled for non-review patterns", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
      motion: { preset: "instant", revealMs: 0 },
    });
    const events: string[] = [];
    g.on("*", (e) => events.push(e));
    g.append("Hi");
    g.finish();
    expect(events).toContain("stream-end");
    expect(events).toContain("settled");
    expect(events.indexOf("stream-end")).toBeLessThan(events.indexOf("settled"));
    g.destroy();
    el.remove();
  });

  it("goes to review without settled for review-bound patterns", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "replace-review-in-place",
      reduce: true,
      motion: { preset: "instant", revealMs: 0 },
      config: {
        source: "Keep [[old]] end",
        text: "new",
      },
    });
    const events: string[] = [];
    g.on("*", (e) => events.push(e));
    g.append("new");
    g.finish();
    expect(events).toContain("stream-end");
    expect(events).toContain("review");
    expect(events).not.toContain("settled");
    g.destroy();
    el.remove();
  });
});

// silence unused in case vitest tree-shakes
void vi;
