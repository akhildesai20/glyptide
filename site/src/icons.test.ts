import { describe, expect, it } from "vitest";
import { ACTION_ICONS, ICONS, createIcon, hydrateIcons } from "./icons";
import { setIconLabel } from "./icons/controls";

describe("icon catalog", () => {
  it("includes all mapped action icons", () => {
    for (const name of Object.values(ACTION_ICONS)) {
      expect(ICONS[name]).toBeTruthy();
      expect(ICONS[name].length).toBeGreaterThan(0);
    }
  });

  it("renders svg with aria-hidden by default", () => {
    const svg = createIcon("play", { size: "md" });
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.dataset.icon).toBe("play");
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("hydrates data-icon placeholders", () => {
    const host = document.createElement("div");
    host.innerHTML = `<span data-icon="search" data-icon-size="sm" aria-hidden="true"></span>`;
    hydrateIcons(host);
    const svg = host.querySelector("svg.g-icon");
    expect(svg?.dataset.icon).toBe("search");
  });

  it("keeps button labels when swapping icons", () => {
    const btn = document.createElement("button");
    setIconLabel(btn, "copy", "Copy");
    expect(btn.textContent?.replace(/\s+/g, " ").trim()).toBe("Copy");
    expect(btn.querySelector("[data-icon='copy']")).toBeTruthy();
    setIconLabel(btn, "copied", "Copied");
    expect(btn.textContent?.replace(/\s+/g, " ").trim()).toBe("Copied");
    expect(btn.querySelector("[data-icon='copied']")).toBeTruthy();
  });
});
