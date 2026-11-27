import { test, expect } from "@playwright/test";

test.describe("Glyptide site", () => {
  test("loads hero and pattern count", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Glyptide");
    await expect(page.locator("#heroMeta")).toContainText("96 patterns");
  });

  test("home redirects playground query params", async ({ page }) => {
    await page.goto("/?case=new&pattern=new-word-settle");
    await expect(page).toHaveURL(/\/playground\/\?.*case=new/);
    await expect(page.locator("#play")).toBeVisible();
  });

  test("playground generate completes for word settle", async ({ page }) => {
    await page.goto("/playground/?case=new&pattern=new-word-settle");
    await page.locator("#play").click();
    await expect(page.locator("#status")).toHaveText("Generating", { timeout: 5000 });
    await expect(page.locator("#status")).toHaveText("Complete", { timeout: 45000 });
    const text = await page.locator("#output").innerText();
    expect(text.length).toBeGreaterThan(40);
  });

  test("theme switch persists across pages", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-theme-set="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/docs/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/playground/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("library cards render and play", async ({ page }) => {
    await page.goto("/playground/");
    await page.locator("#library").scrollIntoViewIfNeeded();
    const card = page.locator(".card").first();
    await expect(card).toBeVisible();
    await card.locator(".replay").click();
    await expect(card.locator(".replay")).toHaveText(/Stop|Replay/, { timeout: 10000 });
  });

  test("reduced motion checkbox resets surface", async ({ page }) => {
    await page.goto("/playground/");
    await page.locator("#reduce").check();
    await expect(page.locator("#status")).toHaveText("Ready");
  });

  test("keyboard review discard on Escape", async ({ page }) => {
    await page.goto("/playground/?case=continue&pattern=continue-ghost-suggestion");
    await page.locator("#play").click();
    await expect(page.locator("#status")).toHaveText("Review", { timeout: 45000 });
    await page.locator("#stage").focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("#status")).toHaveText("Ready");
  });

  test("appearance preset selector applies aurora", async ({ page }) => {
    await page.goto("/playground/?case=new&pattern=new-gradient-ink");
    await page.locator("#presetTrigger").click();
    await expect(page.locator("#presetPopover")).toBeVisible();
    await page.locator("#presetPopover .preset-item", { hasText: "Aurora" }).click();
    await expect(page.locator("#presetName")).toHaveText("Aurora");
    await page.locator("#play").click();
    await expect(page.locator("#status")).toHaveText("Complete", { timeout: 45000 });
  });

  test("theme switch updates preset variant without clearing selection", async ({
    page,
  }) => {
    await page.goto("/playground/?case=new&pattern=new-gradient-ink");
    await page.locator("#presetTrigger").click();
    await expect(page.locator("#presetPopover")).toBeVisible();
    await page
      .locator("#presetPopover .preset-item", { hasText: "Intelligence" })
      .click();
    await expect(page.locator("#presetName")).toHaveText("Intelligence");
    await page.locator('[data-theme-set="dark"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#presetName")).toHaveText("Intelligence");
    await expect(page.locator("#presetModeLabel")).toHaveText("Dark");
  });

  test("appearance gradient is transient on word settle", async ({ page }) => {
    await page.goto("/playground/?case=new&pattern=new-word-settle");
    await page.locator("#output").evaluate((el) => {
      (el as HTMLElement).style.color = "rgb(20, 80, 160)";
    });
    await page.locator("#colorDetails").scrollIntoViewIfNeeded();
    await page.locator("#colorModeSeg button", { hasText: "Gradient" }).click();
    await expect(
      page.locator("#colorModeSeg button[aria-pressed='true']"),
    ).toHaveText("Gradient");
    await page.locator("#play").click();
    await expect(page.locator("#status")).toHaveText("Generating", {
      timeout: 5000,
    });
    await expect(page.locator("#status")).toHaveText("Complete", {
      timeout: 45000,
    });
    await expect(page.locator("#output .grad-ink")).toHaveCount(0);
    await expect(page.locator("#output .appear-ink")).toHaveCount(0);
    const color = await page.locator("#output").evaluate((el) =>
      getComputedStyle(el).color,
    );
    expect(color).toBe("rgb(20, 80, 160)");
  });

  test("review-bound ghost keeps styling until discard", async ({ page }) => {
    await page.goto("/playground/?case=continue&pattern=continue-ghost-suggestion");
    await page.locator("#play").click();
    await expect(page.locator("#status")).toHaveText("Review", {
      timeout: 45000,
    });
    await expect(page.locator("#output .ghost")).toBeVisible();
    await page.locator("#reject").click();
    await expect(page.locator("#status")).toHaveText("Ready");
    await expect(page.locator("#output .ghost")).toHaveCount(0);
  });

  test("for AI page and llms.txt are available", async ({ page }) => {
    const llms = await page.request.get("/llms.txt");
    expect(llms.ok()).toBeTruthy();
    expect(await llms.text()).toContain("# Glyptide");
    const registry = await page.request.get("/registry/patterns.json");
    expect(registry.ok()).toBeTruthy();
    await page.goto("/for-ai.html");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Built for humans",
    );
  });

  test("docs page loads guides", async ({ page }) => {
    await page.goto("/docs/");
    await expect(
      page.getByRole("heading", { level: 1, name: /Get started with Glyptide/i }),
    ).toBeVisible();
    await expect(page.locator("#doc-getting-started")).toContainText(/Install|npm|repository/i, {
      timeout: 15000,
    });
    await expect(page.locator(".nav a[aria-current='page']")).toHaveText("Docs");
  });

  test("home has recipes and simple playground", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#recipes")).toBeVisible();
    await expect(page.locator("#playground")).toBeVisible();
    await expect(page.locator("#openFullPlayground")).toBeVisible();
    await expect(page.locator("#library")).toHaveCount(0);
    await expect(page.locator(".nav a[href='#library']")).toHaveCount(0);
  });

  test("structured pattern selector groups and searches", async ({ page }) => {
    await page.goto("/playground/?case=structured");
    await page.locator("#patternTrigger").click();
    await expect(page.locator("#patternPopover")).toBeVisible();
    await expect(page.locator(".pattern-group-head").first()).toBeVisible();
    await page.locator("#patternSearch").fill("checklist");
    await expect(page.locator(".pattern-option").first()).toBeVisible();
    await expect(
      page.locator(".pattern-group-head", { hasText: "Checklists" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#patternPopover")).toBeHidden();
  });

  test("open playground carries config from home", async ({ page }) => {
    await page.goto("/");
    await page.locator("#playground").scrollIntoViewIfNeeded();
    await page.locator("#caseTabs button", { hasText: "Continue writing" }).click();
    const href = await page.locator("#openFullPlayground").getAttribute("href");
    expect(href).toMatch(/\/playground\/\?/);
    expect(href).toMatch(/case=continue/);
    await page.locator("#openFullPlayground").click();
    await expect(page).toHaveURL(/\/playground\/\?.*case=continue/);
    await expect(page.locator("#status")).toBeVisible();
  });
});
