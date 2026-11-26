/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGlyptide, createEventBus, PATTERN } from "glyptide";

describe("createEventBus", () => {
  it("supports wildcard and unsubscribe", () => {
    const bus = createEventBus();
    const seen: string[] = [];
    const off = bus.on("*", (e) => seen.push(e));
    bus.emit("waiting");
    bus.emit("complete");
    off();
    bus.emit("stopped");
    expect(seen).toEqual(["waiting", "complete"]);
  });
});

describe("createGlyptide streaming API", () => {
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

  it("applySnapshot appends only the suffix", () => {
    const g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: "new-word-settle",
      reduce: true,
      latency: 0,
    });
    g.applySnapshot("Hi");
    g.applySnapshot("Hi there");
    g.finish();
    expect(g.rendered).toBe("Hi there");
    g.destroy();
  });

  it("cancels simulator when append arrives (dual-feed)", () => {
    const g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: "new-word-settle",
      reduce: true,
      latency: 5000,
      speed: 10,
    });
    g.start({ text: "Simulated long text that should not fully play" });
    expect(g.state).toBe("Waiting");
    g.append("Live ");
    g.append("chunk");
    g.finish();
    expect(g.rendered).toContain("Live");
    expect(g.rendered).toContain("chunk");
    g.destroy();
  });

  it("on() emits first-content and settled", () => {
    const events: string[] = [];
    const g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: PATTERN.tokenStream,
      reduce: true,
      latency: 0,
    });
    g.on("*", (e) => events.push(e));
    g.append("Hello");
    g.finish();
    expect(events).toContain("first-content");
    expect(events).toContain("stream-end");
    expect(events).toContain("settled");
    g.destroy();
  });

  it("AbortSignal stops generation", () => {
    const ac = new AbortController();
    const g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: "new-word-settle",
      reduce: true,
      latency: 0,
      signal: ac.signal,
    });
    g.start({ text: "Abort me please with enough words" });
    ac.abort();
    expect(g.state).toBe("Stopped");
    g.destroy();
  });

  it("destroy removes owned waiting node", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const el = document.createElement("div");
    host.append(el);
    const g = createGlyptide({
      element: el,
      pattern: "new-word-settle",
      reduce: true,
    });
    expect(host.querySelector(".glyptide-waiting")).toBeTruthy();
    g.destroy();
    expect(host.querySelector(".glyptide-waiting")).toBeNull();
    host.remove();
  });
});