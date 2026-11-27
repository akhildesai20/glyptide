import { mountAppearancePresetGallery } from "../appearance-presets-docs";
import { mountDesignGuide } from "../design-guide-ui";
import { integrateSectionHtml, mountIntegrate } from "../integrate";
import { learnWithAiHtml, mountLearnWithAi } from "../learn-with-ai";
import { renderMarkdown, wireDocsCopyButtons } from "../markdown";
import { mountPatternRegistry } from "../pattern-registry-ui";
import { bootPage } from "../shell";
import { setIconLabel } from "../icons/controls";

bootPage("docs");

const learnMount = document.getElementById("learnWithAiMount");
if (learnMount) {
  learnMount.outerHTML = learnWithAiHtml("docs", { wrap: false });
  mountLearnWithAi(document);
}

const integrateMount = document.getElementById("integrateMount");
if (integrateMount) {
  integrateMount.outerHTML = integrateSectionHtml({
    headingId: "integrate-heading",
  });
  mountIntegrate(document);
}

const DOCS: { id: string; path: string }[] = [
  { id: "getting-started", path: "/docs/getting-started.md" },
  { id: "streaming", path: "/docs/streaming.md" },
  { id: "appearance", path: "/docs/appearance.md" },
  { id: "accessibility", path: "/docs/accessibility.md" },
  { id: "api", path: "/docs/api.md" },
  { id: "changelog", path: "/docs/changelog.md" },
];

async function loadArticle(id: string, path: string): Promise<void> {
  const el = document.querySelector<HTMLElement>(`[data-docs-article="${id}"]`);
  if (!el) return;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(String(res.status));
    const md = await res.text();
    // Demote markdown H1→H2 so the page keeps a single document title.
    el.innerHTML = renderMarkdown(md).replace(
      /<(\/?)h([1-4])\b/g,
      (_, slash: string, n: string) => `<${slash}h${Math.min(6, Number(n) + 1)}`,
    );
    wireDocsCopyButtons(el);
    if (id === "appearance") mountAppearancePresetGallery(el);
  } catch {
    el.innerHTML = `<p class="hint">Could not load <a href="${path}">${path}</a>.</p>`;
  }
}

const registryHost = document.getElementById("patternRegistryMount");
const registryReady = registryHost
  ? mountPatternRegistry(registryHost)
  : Promise.resolve();

const designHost = document.getElementById("designGuideMount");
if (designHost) {
  const designCleanup = mountDesignGuide(designHost);
  window.addEventListener("pagehide", designCleanup, { once: true });
}

void Promise.all([
  ...DOCS.map((d) => loadArticle(d.id, d.path)),
  registryReady,
]).then(() => {
  // Re-apply hash scroll after content loads (pattern hashes handled by registry)
  const hash = location.hash.replace(/^#/, "");
  if (hash && !hash.startsWith("pattern-")) {
    const target = document.getElementById(hash) ?? document.querySelector(location.hash);
    target?.scrollIntoView({ block: "start" });
  } else if (hash.startsWith("pattern-") && registryHost) {
    registryHost.closest("#doc-patterns")?.scrollIntoView({ block: "start" });
  }
  syncActiveNav();
});

const sidebar = document.getElementById("docsSidebar");
const toggle = document.getElementById("docsNavToggle") as HTMLButtonElement | null;
if (toggle && sidebar) {
  setIconLabel(toggle, "menu", "Menu");
  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  sidebar.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 860px)").matches) {
        sidebar.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function syncActiveNav(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>("[data-docs-link]");
  const sections = [...links]
    .map((a) => {
      const href = a.getAttribute("href") || "";
      const id = href.startsWith("#") ? href.slice(1) : "";
      return { a, el: id ? document.getElementById(id) : null };
    })
    .filter((x) => x.el);

  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = (visible.target as HTMLElement).id;
      links.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
      });
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.2, 0.5] },
  );
  sections.forEach(({ el }) => el && obs.observe(el));
}
