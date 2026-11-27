import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Glyptide, type GlyptideHandle } from "./index";

afterEach(() => {
  document.body.replaceChildren();
});

describe("React adapter Strict Mode & reactivity", () => {
  it("double mount/unmount does not leak waiting nodes", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const props = {
      pattern: "new-word-settle",
      reduce: true,
      latency: 0,
      motion: { preset: "instant" as const, revealMs: 0 },
    };
    root.render(createElement(Glyptide, props));
    await new Promise((r) => setTimeout(r, 20));
    root.render(null as unknown as React.ReactNode);
    await new Promise((r) => setTimeout(r, 20));
    root.render(createElement(Glyptide, props));
    await new Promise((r) => setTimeout(r, 20));
    expect(host.querySelectorAll(".glyptide-waiting").length).toBe(1);
    root.unmount();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelectorAll(".glyptide-waiting").length).toBe(0);
  });

  it("preserves session across speed/reduce hot updates", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let handle: GlyptideHandle | null = null;

    function App(props: { speed: number; reduce: boolean }) {
      const ref = useRef<GlyptideHandle>(null);
      return createElement(Glyptide, {
        ref: (h: GlyptideHandle | null) => {
          handle = h;
          (ref as { current: GlyptideHandle | null }).current = h;
        },
        pattern: "new-word-settle",
        speed: props.speed,
        reduce: props.reduce,
        latency: 0,
        motion: { preset: "instant", revealMs: 0 },
      });
    }

    root.render(createElement(App, { speed: 40, reduce: false }));
    await new Promise((r) => setTimeout(r, 30));
    expect(handle).toBeTruthy();
    const session = handle!.beginStream();
    handle!.append("Keep ", session);
    const sessionBefore = handle!.session;
    root.render(createElement(App, { speed: 120, reduce: true }));
    await new Promise((r) => setTimeout(r, 30));
    // Same pattern → same instance; session still owned
    expect(handle!.session).toBe(sessionBefore);
    handle!.append("going", sessionBefore);
    handle!.finish(sessionBefore);
    await vi.waitFor(() => expect(handle!.state).toBe("Complete"));
    expect(handle!.rendered).toContain("Keep");
    expect(handle!.rendered).toContain("going");
    root.unmount();
  });

  it("cleans up onEvent listeners on unmount", async () => {
    const onEvent = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    root.render(
      createElement(Glyptide, {
        pattern: "new-word-settle",
        reduce: true,
        latency: 0,
        autoPlay: true,
        text: "Hello events",
        motion: { preset: "instant", revealMs: 0 },
        onEvent,
      }),
    );
    await vi.waitFor(() => expect(onEvent).toHaveBeenCalled(), { timeout: 2000 });
    root.unmount();
    const n = onEvent.mock.calls.length;
    await new Promise((r) => setTimeout(r, 40));
    expect(onEvent.mock.calls.length).toBe(n);
  });
});
