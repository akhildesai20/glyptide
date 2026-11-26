const KEY = "glyptide-theme";

export type ThemePref = "light" | "dark" | "system";

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function applyTheme(pref: ThemePref = getThemePref()): void {
  const resolved = resolve(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePref = pref;
  localStorage.setItem(KEY, pref);
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0A0A0A" : "#FAFAFA");
  window.dispatchEvent(new CustomEvent("glyptide-theme", { detail: { pref, resolved } }));
}

export function initTheme(): void {
  applyTheme(getThemePref());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
  });
}

export function syncThemeSwitch(): void {
  const pref = getThemePref();
  document.querySelectorAll<HTMLButtonElement>("[data-theme-set]").forEach((btn) => {
    const value = btn.dataset.themeSet as ThemePref;
    btn.setAttribute("aria-pressed", String(value === pref));
    btn.onclick = () => {
      applyTheme(value);
      syncThemeSwitch();
    };
  });
}
