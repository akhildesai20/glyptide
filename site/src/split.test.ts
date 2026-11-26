import { describe, expect, it } from "vitest";
import { splitText, patternCount, getPattern } from "glyptide";

describe("splitText", () => {
  it("splits words", () => {
    expect(splitText("Hello world ", "word")).toEqual(["Hello ", "world "]);
  });

  it("returns all as one chunk", () => {
    expect(splitText("abc", "all")).toEqual(["abc"]);
  });

  it("splits lines", () => {
    expect(splitText("a\nb\n", "line")).toEqual(["a\n", "b\n"]);
  });
});

describe("registry", () => {
  it("has 96 patterns", () => {
    expect(patternCount).toBe(96);
  });

  it("resolves word settle", () => {
    const p = getPattern("new-word-settle");
    expect(p?.effect).toBe("spring");
    expect(p?.kind).toBe("word");
  });
});
