import { test, expect } from "@playwright/test";
import { appearanceLifecycleFor, patterns } from "glyptide";

const CASES = [
  "new",
  "insert",
  "replace",
  "rewrite",
  "continue",
  "structured",
] as const;

/**
 * Registry-wide smoke under reduced motion + max delivery rate.
 * Verifies terminal state and that transient patterns leave no aesthetic paint.
 */
for (const caseId of CASES) {
  test.describe(`patterns · ${caseId}`, () => {
    test.setTimeout(120_000);

    test(`all ${caseId} patterns settle cleanly`, async ({ page }) => {
      const list = patterns.filter((p) => p.caseId === caseId);

      for (const p of list) {
        await page.goto(
          `/?case=${caseId}&pattern=${p.id}&speed=140&latency=0&scenario=steady`,
        );
        await page.locator("#reduce").check();

        // Keep samples short enough for CI while preserving structure markers
        const sample = page.locator("#sample");
        if (await sample.isVisible()) {
          const current = await sample.inputValue();
          if (current.length > 220) {
            await sample.fill(current.slice(0, 200).trimEnd() + "…");
          }
        }

        await page.locator("#play").click();
        await expect(page.locator("#status")).toHaveText(
          /Complete|Review|Stopped/,
          { timeout: 25_000 },
        );

        const meta = appearanceLifecycleFor(p.effect, p.caseId, p.name);
        if (meta.lifecycle === "transient") {
          await expect(
            page.locator(
              "#output .grad-ink, #output .grad-highlight, #output .grad-glow, #output .grad-underline, #output .appear-ink, #output .appear-highlight, #output .appear-glow",
            ),
          ).toHaveCount(0);
        }

        if (meta.lifecycle === "review-bound") {
          await expect(page.locator("#status")).toHaveText("Review");
          if (await page.locator("#reject").isVisible()) {
            await page.locator("#reject").click();
          } else {
            await page.locator("#stage").focus();
            await page.keyboard.press("Escape");
          }
          await expect(page.locator("#status")).toHaveText(/Ready|Complete/);
        }
      }
    });
  });
}
