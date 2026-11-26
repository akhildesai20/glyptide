import { describe, expect, it, vi } from "vitest";
import { createStreamIngress, resolveMotion } from "glyptide";

describe("createStreamIngress", () => {
  it("bounds the queue under pace policy without discarding text", () => {
    const ingress = createStreamIngress({ maxQueue: 8, policy: "pace" });
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) {
      const immediate = ingress.push([`u${i}|`]);
      seen.push(...immediate);
    }
    seen.push(...ingress.flush());
    expect(ingress.size).toBe(0);
    expect(seen.join("")).toBe(
      Array.from({ length: 20 }, (_, i) => `u${i}|`).join(""),
    );
    // Queue never exceeds bound during push (coalesce keeps length ≤ maxQueue)
    const again = createStreamIngress({ maxQueue: 8, policy: "pace" });
    for (let i = 0; i < 20; i++) again.push([`x${i}`]);
    expect(again.size).toBeLessThanOrEqual(8);
  });

  it("flushes remaining units", () => {
    const ingress = createStreamIngress({ policy: "pace" });
    // pace returns one unit from push; rest stay queued
    const immediate = ingress.push(["a", "b", "c"]);
    expect(immediate).toEqual(["a"]);
    expect(ingress.flush().join("")).toBe("bc");
    expect(ingress.size).toBe(0);
  });

  it("fires stall after idle", () => {
    let now = 1000;
    const onStall = vi.fn();
    const ingress = createStreamIngress({
      stallMs: 100,
      onStall,
      now: () => now,
    });
    ingress.push(["x"]);
    now = 1200;
    expect(ingress.checkStall()).toBe(true);
    expect(onStall).toHaveBeenCalled();
  });
});

describe("resolveMotion", () => {
  it("applies natural defaults", () => {
    const m = resolveMotion();
    expect(m.preset).toBe("natural");
    expect(m.revealMs).toBeGreaterThan(0);
  });

  it("allows overrides", () => {
    const m = resolveMotion({ preset: "instant", revealMs: 12 });
    expect(m.preset).toBe("instant");
    expect(m.revealMs).toBe(12);
  });
});
