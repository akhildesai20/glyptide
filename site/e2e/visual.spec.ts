import { test, expect } from "@playwright/test";
import { patterns } from "glyptide";

/**
 * Visual regression subset — soft gate.
 * Run with VISUAL=1 (and optionally --update-snapshots) so default CI stays green
 * until baselines are committed.
 */
test.describe("visual regression subset", () => {
  test.skip(!process.env.VISUAL, "Set VISUAL=1 to run screenshot baselines");
  test.use({ reducedMotion: "reduce" });

  const cases: { id: string; caseId: string }[] = [
    "new-word-settle",
    "new-progressive-emphasis",
    "insert-reserved-gap",
    "replace-review-in-place",
  ].map((id) => {
    const p = patterns.find((x) => x.id === id);
    if (!p) throw new Error(`Unknown visual pattern ${id}`);
    return { id, caseId: p.caseId };
  });

  for (const { id, caseId } of cases) {
    test(`final frame ${id}`, async ({ page }) => {
      await page.goto(
        `/playground/?case=${caseId}&pattern=${id}&speed=200&latency=0&scenario=steady`,
      );
      await page.locator("#play").click();
      await page.waitForSelector(
        "#status:has-text('Complete'), #status:has-text('Review'), #status:has-text('Stopped')",
        { timeout: 20000 },
      );
      const stage = page.locator(".stage").first();
      await expect(stage).toHaveScreenshot(`${id}-final.png`, {
        animations: "disabled",
        maxDiffPixels: 120,
      });
    });
  }
});
