import { test, expect } from "@playwright/test";

/**
 * Visual regression subset — soft gate.
 * Run with VISUAL=1 (and optionally --update-snapshots) so default CI stays green
 * until baselines are committed.
 */
test.describe("visual regression subset", () => {
  test.skip(!process.env.VISUAL, "Set VISUAL=1 to run screenshot baselines");
  test.use({ reducedMotion: "reduce" });

  for (const pattern of [
    "new-word-settle",
    "new-progressive-emphasis",
    "insert-reserved-gap",
    "replace-review-in-place",
  ]) {
    test(`final frame ${pattern}`, async ({ page }) => {
      await page.goto(
        `/playground/?case=new&pattern=${pattern}&speed=200&latency=0&scenario=steady`,
      );
      await page.locator("#play").click();
      await page.waitForSelector(
        "#status:has-text('Complete'), #status:has-text('Review'), #status:has-text('Stopped')",
        { timeout: 20000 },
      );
      const stage = page.locator(".stage").first();
      await expect(stage).toHaveScreenshot(`${pattern}-final.png`, {
        animations: "disabled",
        maxDiffPixels: 120,
      });
    });
  }
});
