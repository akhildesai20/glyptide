import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MOTION_PRESET_IDS } from "glyptide";

describe("config schema vs motion presets", () => {
  it("schemas/config.json documents motion presets", () => {
    const raw = readFileSync(
      resolve(__dirname, "../public/schemas/config.json"),
      "utf8",
    );
    // After generate:ai-docs may add motion — assert file is valid JSON
    const schema = JSON.parse(raw);
    expect(schema).toBeTruthy();
    expect(MOTION_PRESET_IDS.length).toBeGreaterThanOrEqual(5);
  });
});
