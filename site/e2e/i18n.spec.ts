import { test, expect } from "@playwright/test";

test.describe("language & motion panel", () => {
  test("switches Urdu and English samples swiftly", async ({ page }) => {
    await page.goto("/?case=new&pattern=new-word-settle&latency=0&speed=140");
    await page.locator("#langUr").click();
    await expect(page.locator("#sample")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#sample")).toHaveAttribute("lang", "ur");
    await expect(page.locator("#output")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("#langUr")).toHaveAttribute("aria-pressed", "true");

    await page.locator("#langEn").click();
    await expect(page.locator("#sample")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#sample")).toHaveAttribute("lang", "en");
    await expect(page.locator("#output")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("#langEn")).toHaveAttribute("aria-pressed", "true");
  });

  test("motion preset updates hint and survives generate", async ({ page }) => {
    await page.goto("/?case=new&pattern=new-word-settle&latency=0&speed=140");
    await page.locator("#reduce").uncheck();
    await page.locator("#motionPreset").selectOption("instant");
    await expect(page.locator("#motionHint")).toContainText(/No piece animation|Instant/i);
    await page.locator("#sample").fill("Short test for motion.");
    await page.locator("#play").click();
    await expect(page.locator("#status")).toHaveText(/Complete|Stopped|Review/, {
      timeout: 20000,
    });
    await expect(page.locator("#motionPreset")).toHaveValue("instant");
  });
});
