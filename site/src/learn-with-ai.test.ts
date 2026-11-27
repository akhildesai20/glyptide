import { describe, expect, it } from "vitest";
import {
  LEARN_WITH_AI_PROMPT_VERSION,
  buildLearnWithAiPrompt,
  siteOrigin,
} from "./learn-with-ai-prompt";

describe("learn-with-ai prompt", () => {
  it("keeps a stable version and absolute docs links for the deployment origin", () => {
    expect(LEARN_WITH_AI_PROMPT_VERSION).toBeGreaterThan(0);
    const prompt = buildLearnWithAiPrompt("https://example.com");
    expect(prompt).toContain("https://example.com/docs/ai-integrate.md");
    expect(prompt).toContain("https://example.com/llms.txt");
    expect(prompt).toContain("https://example.com/docs/getting-started.md");
    expect(prompt).toContain("https://example.com/registry/patterns.json");
    expect(prompt).toContain("https://example.com/skills/glyptide/SKILL.md");
    expect(prompt).toContain("not on public npm yet");
    expect(prompt).toContain("createGlyptide");
    expect(prompt).toContain("Do not invent");
    expect(prompt).toContain("site/");
    expect(prompt).not.toMatch(/npm install glyptide@/);
  });

  it("normalizes trailing slashes on origin", () => {
    expect(siteOrigin("https://example.com/")).toBe("https://example.com");
    expect(buildLearnWithAiPrompt("https://example.com/")).toContain(
      "https://example.com/for-ai.html",
    );
  });

  it("defaults to the canonical production site when origin is empty", () => {
    const prompt = buildLearnWithAiPrompt("");
    expect(prompt).toContain("https://glyptide.vercel.app/docs/ai-integrate.md");
    expect(prompt).toContain("https://glyptide.vercel.app/llms.txt");
  });
});
