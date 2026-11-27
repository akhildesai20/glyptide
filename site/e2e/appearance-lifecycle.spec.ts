import { test, expect } from "@playwright/test";
import { appearanceLifecycleFor, patterns } from "glyptide";

/**
 * Animated appearance settlement — samples each lifecycle with reduce OFF.
 * Complements the reduced-motion 96-pattern smoke in patterns.spec.ts.
 */
const SAMPLES = [
  // transient piece
  "new-word-settle",
  "new-gradient-ink",
  // persistent-ish heading
  "structured-heading-weight",
  // review-bound
  "continue-ghost-suggestion",
  "replace-review-in-place",
].filter((id) => patterns.some((p) => p.id === id));

test.describe("appearance lifecycle with motion", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const id of SAMPLES) {
      test(`${theme} · ${id} settles computed styles`, async ({ page }) => {
        const p = patterns.find((x) => x.id === id)!;
        const meta = appearanceLifecycleFor(p.effect, p.caseId, p.name);
        await page.goto(
          `/playground/?case=${p.caseId}&pattern=${id}&speed=100&latency=0&scenario=steady`,
        );
        await page.locator(`[data-theme-set="${theme}"]`).click();
        // Ensure reduce is OFF so aesthetic classes can paint
        if (await page.locator("#reduce").isChecked()) {
          await page.locator("#reduce").uncheck();
        }
        await page.locator("#output").evaluate((el) => {
          (el as HTMLElement).style.color = "rgb(20, 80, 160)";
        });
        await page.locator("#play").click();
        await expect(page.locator("#status")).toHaveText(
          /Complete|Review|Stopped/,
          { timeout: 45_000 },
        );

        if (meta.lifecycle === "transient") {
          await expect(
            page.locator(
              "#output .grad-ink, #output .grad-highlight, #output .grad-glow, #output .appear-ink",
            ),
          ).toHaveCount(0);
          const color = await page.locator("#output").evaluate((el) =>
            getComputedStyle(el).color,
          );
          expect(color).toBe("rgb(20, 80, 160)");
        }

        if (meta.lifecycle === "review-bound") {
          await expect(page.locator("#status")).toHaveText("Review");
          // Chrome still present until accept/discard
          const hasReviewChrome = await page
            .locator("#output .ghost, #output .oldstrike, #output .proposed, #output .added")
            .count();
          expect(hasReviewChrome).toBeGreaterThan(0);
          if (await page.locator("#reject").isVisible()) {
            await page.locator("#reject").click();
          } else {
            await page.locator("#stage").focus();
            await page.keyboard.press("Escape");
          }
          await expect(page.locator("#status")).toHaveText(/Ready|Complete/);
        }
      });
    }
  }
});
