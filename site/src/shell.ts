/**
 * Shared site chrome — header, footer, theme boot, GitHub icon labels.
 */
import { hydrateIcons } from "./icons";
import { setIconLabel } from "./icons/controls";
import { initTheme, syncThemeSwitch } from "./theme";

export type SitePage = "home" | "playground" | "docs" | "for-ai";

const GH = "https://github.com/akhildesai20/glyptide";

const NAV: { href: string; label: string; page?: SitePage; external?: boolean }[] = [
  { href: "/playground/", label: "Playground", page: "playground" },
  { href: "/docs/", label: "Docs", page: "docs" },
  { href: "/for-ai.html", label: "For AI", page: "for-ai" },
  { href: GH, label: "GitHub", external: true },
];

function themeSwitchHtml(): string {
  return `<div class="theme-switch" role="group" aria-label="Color theme">
    <button type="button" data-theme-set="light" title="Light" aria-label="Light theme">
      <span data-icon="sun" data-icon-size="md" aria-hidden="true"></span>
    </button>
    <button type="button" data-theme-set="system" title="System" aria-label="System theme">
      <span data-icon="monitor" data-icon-size="md" aria-hidden="true"></span>
    </button>
    <button type="button" data-theme-set="dark" title="Dark" aria-label="Dark theme">
      <span data-icon="moon" data-icon-size="md" aria-hidden="true"></span>
    </button>
  </div>`;
}

export function headerHtml(page: SitePage): string {
  const links = NAV.map((item) => {
    const attrs = [
      `href="${item.href}"`,
      item.page === page ? 'aria-current="page"' : "",
      item.external ? 'rel="noopener noreferrer" target="_blank"' : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<a ${attrs}>${item.label}</a>`;
  }).join("\n          ");

  return `<header class="site-header">
      <div class="wrap header-inner">
        <a class="wordmark" href="/" aria-label="Glyptide home">
          <span class="mark" aria-hidden="true"></span>
          Glyptide
        </a>
        <nav class="nav" aria-label="Primary">
          ${links}
        </nav>
        <div class="header-actions">
          ${themeSwitchHtml()}
        </div>
      </div>
    </header>`;
}

export function footerHtml(): string {
  return `<footer class="site-footer">
      <div class="wrap footer-grid">
        <div class="footer-brand">
          <a class="wordmark footer-wordmark" href="/" aria-label="Glyptide home">
            <span class="mark" aria-hidden="true"></span>
            Glyptide
          </a>
          <p class="footer-tagline">Every word, intentionally in motion.</p>
        </div>
        <div class="footer-col">
          <h2 class="footer-heading">Explore</h2>
          <ul class="footer-links">
            <li><a href="/playground/">Playground</a></li>
            <li><a href="/playground/#library">Pattern Library</a></li>
            <li><a href="/#recipes">Recipes</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h2 class="footer-heading">Developers</h2>
          <ul class="footer-links">
            <li><a href="/docs/">Documentation</a></li>
            <li><a href="/docs/#doc-api">API reference</a></li>
            <li><a href="/for-ai.html">For AI</a></li>
            <li><a href="/docs/#doc-changelog">Changelog</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h2 class="footer-heading">Project</h2>
          <ul class="footer-links">
            <li><a href="${GH}" rel="noopener noreferrer" target="_blank">GitHub</a></li>
            <li><a href="${GH}/blob/main/CONTRIBUTING.md" rel="noopener noreferrer" target="_blank">Contributing</a></li>
            <li><a href="${GH}/issues" rel="noopener noreferrer" target="_blank">Report an issue</a></li>
            <li><a href="${GH}/blob/main/LICENSE" rel="noopener noreferrer" target="_blank">MIT License</a></li>
          </ul>
        </div>
      </div>
      <div class="wrap footer-bottom">
        <span>Designed and built by Akhil Desai.</span>
        <span>Inspired by <a href="https://github.com/kasturibuilds/generative-loaders" rel="noopener noreferrer" target="_blank">Generative Loaders</a>.</span>
      </div>
    </footer>`;
}

/** Theme boot script — keep inline in HTML head; duplicated here for reference only. */
export const THEME_BOOT_SCRIPT = `(function () {
  try {
    var t = localStorage.getItem("glyptide-theme") || "system";
    var dark =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.themePref = t;
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();`;

/**
 * Replace placeholders or inject into [data-site-header] / [data-site-footer].
 * Prefer static HTML in pages that already include chrome; this helps for-ai updates.
 */
export function mountShell(page: SitePage): void {
  const headerHost = document.querySelector("[data-site-header]");
  if (headerHost) headerHost.outerHTML = headerHtml(page);
  const footerHost = document.querySelector("[data-site-footer]");
  if (footerHost) footerHost.outerHTML = footerHtml();

  initTheme();
  hydrateIcons(document);
  syncThemeSwitch();

  document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]').forEach((a) => {
    if (a.querySelector(".g-icon")) return;
    if (/github\.com/i.test(a.href) && a.textContent?.trim() === "GitHub") {
      setIconLabel(a, "github", "GitHub");
    }
  });
}

export function bootPage(page: SitePage): void {
  mountShell(page);
}
