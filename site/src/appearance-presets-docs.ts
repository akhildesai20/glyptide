/**
 * Visual preset gallery for the docs Appearance article.
 * Replaces the plain name list under “Presets (18)” with live gradient swatches.
 */
import {
  DEFAULT_PRESET_ID,
  GRADIENT_DEMO_PRESET_ID,
  PALETTE_PRESETS,
  PRESET_CATEGORIES,
  palettePreviewGradient,
  type ThemeMode,
} from "glyptide";

function hintFor(id: string): string {
  if (id === DEFAULT_PRESET_ID) return "default";
  if (id === GRADIENT_DEMO_PRESET_ID) return "demos";
  return "";
}

function pageTheme(): ThemeMode {
  const t = document.documentElement.dataset.theme;
  return t === "dark" ? "dark" : "light";
}

/** Inject categorized gradient swatches after the Presets heading. */
export function mountAppearancePresetGallery(article: HTMLElement): void {
  if (article.querySelector(".docs-preset-gallery")) return;

  const heading = [...article.querySelectorAll("h2, h3")].find((h) =>
    /^Presets/i.test(h.textContent?.trim() ?? ""),
  );
  if (!heading) return;

  // Drop legacy plain-text name lists (kept briefly in older markdown).
  let sib = heading.nextElementSibling;
  while (sib && sib.tagName === "P") {
    const t = sib.textContent ?? "";
    const isNameList =
      /^\*\*(AI-inspired|Minimal|Expressive):\*\*/.test(sib.innerHTML) ||
      /^(AI-inspired|Minimal|Expressive):/.test(t.trim());
    if (!isNameList) break;
    const next = sib.nextElementSibling;
    sib.remove();
    sib = next;
  }

  let mode: ThemeMode = pageTheme();

  const head = document.createElement("div");
  head.className = "docs-preset-head";

  const switcher = document.createElement("div");
  switcher.className = "docs-preset-theme";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "Preset theme");

  const makeThemeBtn = (id: ThemeMode, label: string) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "docs-preset-theme-btn";
    btn.dataset.themeMode = id;
    btn.textContent = label;
    btn.setAttribute("aria-pressed", String(id === mode));
    btn.addEventListener("click", () => setMode(id));
    return btn;
  };

  switcher.append(makeThemeBtn("light", "Light"), makeThemeBtn("dark", "Dark"));

  heading.replaceWith(head);
  head.append(heading, switcher);

  const gallery = document.createElement("div");
  gallery.className = "docs-preset-gallery";
  gallery.setAttribute("role", "group");
  gallery.setAttribute("aria-label", "Appearance presets");
  gallery.dataset.themeMode = mode;

  const swatches: HTMLElement[] = [];

  for (const cat of PRESET_CATEGORIES) {
    const group = document.createElement("div");
    group.className = "docs-preset-group";

    const catLabel = document.createElement("p");
    catLabel.className = "docs-preset-cat";
    catLabel.textContent = cat.label;
    group.append(catLabel);

    const grid = document.createElement("div");
    grid.className = "docs-preset-grid";

    for (const preset of PALETTE_PRESETS.filter((p) => p.category === cat.id)) {
      const card = document.createElement("div");
      card.className = "docs-preset-card";
      card.dataset.presetId = preset.id;

      const swatch = document.createElement("span");
      swatch.className = "docs-preset-swatch";
      swatch.setAttribute("aria-hidden", "true");
      swatch.style.background = palettePreviewGradient(preset[mode]);
      swatches.push(swatch);

      const name = document.createElement("span");
      name.className = "docs-preset-name";
      const hint = hintFor(preset.id);
      name.textContent = hint ? `${preset.name} (${hint})` : preset.name;

      card.append(swatch, name);
      grid.append(card);
    }

    group.append(grid);
    gallery.append(group);
  }

  function setMode(next: ThemeMode) {
    mode = next;
    gallery.dataset.themeMode = mode;
    switcher.querySelectorAll<HTMLButtonElement>(".docs-preset-theme-btn").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.themeMode === mode));
    });
    let i = 0;
    for (const cat of PRESET_CATEGORIES) {
      for (const preset of PALETTE_PRESETS.filter((p) => p.category === cat.id)) {
        const el = swatches[i++];
        if (el) el.style.background = palettePreviewGradient(preset[mode]);
      }
    }
  }

  head.insertAdjacentElement("afterend", gallery);
}
