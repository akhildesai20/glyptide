/** Deterministic stress fixtures for playground advanced mode */

export type StressKind = "stress-fast" | "stress-slow" | "stress-burst";

export function isStressScenario(scenario: string): scenario is StressKind {
  return (
    scenario === "stress-fast" ||
    scenario === "stress-slow" ||
    scenario === "stress-burst"
  );
}

/** Map stress UI options onto engine scenario + speed/latency overrides */
export function stressOverrides(kind: StressKind): {
  scenario: "steady" | "bursts" | "stall";
  speed: number;
  latency: number;
} {
  switch (kind) {
    case "stress-fast":
      return { scenario: "steady", speed: 140, latency: 0 };
    case "stress-slow":
      return { scenario: "steady", speed: 12, latency: 1200 };
    case "stress-burst":
      return { scenario: "bursts", speed: 90, latency: 400 };
  }
}
