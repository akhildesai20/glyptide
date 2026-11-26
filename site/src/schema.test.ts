import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { patterns, appearanceLifecycleFor } from "glyptide";

const publicDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);

describe("generated AI assets", () => {
  it("exposes registry matching runtime pattern count", () => {
    const registryPath = path.join(publicDir, "registry/patterns.json");
    if (!fs.existsSync(registryPath)) {
      expect.fail("Run npm run generate:ai-docs before tests");
    }
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    expect(registry.patternCount).toBe(patterns.length);
    expect(registry.patterns).toHaveLength(patterns.length);
    for (const p of registry.patterns) {
      const life = appearanceLifecycleFor(p.effect, p.category, p.name);
      expect(p.appearanceLifecycle).toBe(life.lifecycle);
    }
  });

  it("ships JSON schemas with required keys", () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(publicDir, "schemas/config.json"), "utf8"),
    );
    const appearance = JSON.parse(
      fs.readFileSync(path.join(publicDir, "schemas/appearance.json"), "utf8"),
    );
    expect(config.properties.caseId.enum).toContain("structured");
    expect(appearance.properties.colorMode.enum).toEqual([
      "default",
      "solid",
      "gradient",
    ]);
  });

  it("includes llms.txt title and registry link", () => {
    const llms = fs.readFileSync(path.join(publicDir, "llms.txt"), "utf8");
    expect(llms.startsWith("# Glyptide")).toBe(true);
    expect(llms).toContain("/registry/patterns.json");
    expect(llms).toContain("/skills/glyptide/SKILL.md");
  });
});
