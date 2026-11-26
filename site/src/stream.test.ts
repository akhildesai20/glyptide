import { describe, expect, it } from "vitest";
import { consumeTextStream, recommendPatterns } from "glyptide";

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

  it("dedupes snapshot streams", async () => {
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
