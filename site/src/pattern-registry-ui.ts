/**
 * Master-detail Pattern Registry browser for the docs page.
 * Source of truth: /registry/patterns.json (canonical generated registry).
 */
import { copyWithIconFeedback, setIconLabel } from "./icons/controls";

export interface RegistryCase {
  id: string;
  title: string;
  desc: string;
}

export interface RegistryPattern {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  subcategory: string | null;
  description: string;
  kind: string;
  effect: string;
  appearanceLifecycle: string;
  appearanceSettlement: string;
  expectedFinalAppearance?: string;
  supportedAppearanceTreatments: string[];
  supportedColorModes: string[];
  streamingCompatible: boolean;
  reviewBehavior: string;
  reducedMotion: string;
  themeSupport: string[];
  motionCapabilities?: {
    usesSpring?: boolean;
    spatial?: boolean;
    supportsMotionPresets?: boolean;
  };
  whenToUse?: string;
  whenNotToUse?: string[];
  documentationRef?: string;
}

interface RegistryPayload {
  version: string;
  patternCount: number;
  cases: RegistryCase[];
  patterns: RegistryPattern[];
}

const HASH_PREFIX = "pattern-";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightJs(code: string): string {
  // Escape only tag delimiters so string quotes remain matchable.
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paintKeywords = (chunk: string): string =>
    chunk.replace(
      /\b(import|from|const|await|function|return)\b/g,
      '<span class="tok-kw">$1</span>',
    );
  const out: string[] = [];
  const re = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(escaped))) {
    out.push(paintKeywords(escaped.slice(last, match.index)));
    out.push(
      `<span class="tok-str">${match[0].replace(/"/g, "&quot;")}</span>`,
    );
    last = match.index + match[0].length;
  }
  out.push(paintKeywords(escaped.slice(last)));
  return out.join("");
}

function patternHash(id: string): string {
  return `#${HASH_PREFIX}${id}`;
}

function parsePatternHash(hash: string): string | null {
  const h = hash.replace(/^#/, "");
  if (h.startsWith(HASH_PREFIX)) return h.slice(HASH_PREFIX.length);
  return null;
}

function matchesQuery(p: RegistryPattern, q: string): boolean {
  if (!q) return true;
  const hay = [
    p.id,
    p.name,
    p.description,
    p.kind,
    p.effect,
    p.category,
    p.categoryLabel,
    p.subcategory ?? "",
    p.appearanceLifecycle,
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

function buildExample(p: RegistryPattern): string {
  return `import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "${p.id}",
});

g.start({
  text: "Thoughtful motion makes interfaces feel alive.",
});`;
}

export async function mountPatternRegistry(root: HTMLElement): Promise<void> {
  let data: RegistryPayload;
  try {
    const res = await fetch("/registry/patterns.json");
    if (!res.ok) throw new Error(String(res.status));
    data = (await res.json()) as RegistryPayload;
  } catch {
    root.innerHTML =
      '<p class="hint">Could not load <a href="/registry/patterns.json">/registry/patterns.json</a>.</p>';
    return;
  }

  const { cases, patterns } = data;
  const byId = new Map(patterns.map((p) => [p.id, p]));
  const caseOrder = cases.map((c) => c.id);

  let query = "";
  const collapsed = new Map<string, boolean>();
  const collapsedSub = new Map<string, boolean>();
  for (const c of cases) collapsed.set(c.id, false);

  const fromHash =
    parsePatternHash(location.hash) ??
    (byId.has(location.hash.replace(/^#/, ""))
      ? location.hash.replace(/^#/, "")
      : null);
  let selectedId =
    (fromHash && byId.has(fromHash) ? fromHash : null) ??
    patterns[0]?.id ??
    "";

  root.classList.add("pattern-registry");
  root.innerHTML = `
    <header class="pattern-registry-head">
      <h2 class="pattern-registry-title">Pattern registry</h2>
      <p class="pattern-registry-lead">
        ${data.patternCount} patterns across ${cases.length} use cases.
        Machine-readable:
        <a href="/registry/patterns.json">patterns.json</a>
        ·
        <a href="/docs/patterns.md">patterns.md</a>
      </p>
    </header>
    <div class="pattern-registry-layout">
      <aside class="pattern-registry-side" aria-label="Pattern list">
        <div class="pattern-registry-search sticky-search">
          <label class="search-field">
            <span class="sr-only">Search patterns</span>
            <input type="search" id="prSearch" placeholder="Search patterns…" autocomplete="off" />
          </label>
        </div>
        <div class="pattern-registry-mobile" hidden>
          <label for="prMobileSelect" class="sr-only">Select pattern</label>
          <select id="prMobileSelect" class="pattern-registry-select"></select>
        </div>
        <div class="pattern-registry-tree" id="prTree" role="tree" aria-label="Patterns by use case"></div>
      </aside>
      <div class="pattern-registry-detail" id="prDetail" tabindex="-1" aria-live="polite"></div>
    </div>`;

  const searchEl = root.querySelector<HTMLInputElement>("#prSearch")!;
  const treeEl = root.querySelector<HTMLElement>("#prTree")!;
  const detailEl = root.querySelector<HTMLElement>("#prDetail")!;
  const mobileSelect = root.querySelector<HTMLSelectElement>("#prMobileSelect")!;
  const mobileWrap = root.querySelector<HTMLElement>(".pattern-registry-mobile")!;

  function filteredPatterns(): RegistryPattern[] {
    return patterns.filter((p) => matchesQuery(p, query));
  }

  function patternsForCase(caseId: string): RegistryPattern[] {
    return filteredPatterns().filter((p) => p.category === caseId);
  }

  function ensureExpandedForSelection(): void {
    const p = byId.get(selectedId);
    if (!p) return;
    collapsed.set(p.category, false);
    if (p.subcategory) collapsedSub.set(`${p.category}::${p.subcategory}`, false);
  }

  function expandMatches(): void {
    if (!query) return;
    for (const p of filteredPatterns()) {
      collapsed.set(p.category, false);
      if (p.subcategory) collapsedSub.set(`${p.category}::${p.subcategory}`, false);
    }
  }

  function syncHash(push: boolean): void {
    if (!selectedId) return;
    const next = patternHash(selectedId);
    if (location.hash === next) return;
    if (push) history.pushState({ pattern: selectedId }, "", next);
    else history.replaceState({ pattern: selectedId }, "", next);
  }

  function scrollSelectedIntoView(): void {
    const btn = treeEl.querySelector<HTMLElement>(
      `.pr-item.is-selected, [data-pattern-id="${selectedId.replace(/"/g, "")}"]`,
    );
    btn?.scrollIntoView({ block: "nearest" });
  }

  function renderMobileSelect(): void {
    const frag = document.createDocumentFragment();
    for (const c of cases) {
      const list = patternsForCase(c.id);
      if (!list.length) continue;
      const og = document.createElement("optgroup");
      og.label = `${c.title} (${list.length})`;
      const bySub = new Map<string, RegistryPattern[]>();
      for (const p of list) {
        const key = p.subcategory || "";
        if (!bySub.has(key)) bySub.set(key, []);
        bySub.get(key)!.push(p);
      }
      for (const [sub, items] of bySub) {
        for (const p of items) {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = sub ? `${sub} · ${p.name}` : p.name;
          if (p.id === selectedId) opt.selected = true;
          og.append(opt);
        }
      }
      frag.append(og);
    }
    mobileSelect.replaceChildren(frag);
    mobileSelect.value = selectedId;
  }

  function renderTree(): void {
    expandMatches();
    ensureExpandedForSelection();
    treeEl.replaceChildren();

    for (const caseId of caseOrder) {
      const c = cases.find((x) => x.id === caseId)!;
      const list = patternsForCase(caseId);
      if (query && !list.length) continue;

      const open = !collapsed.get(caseId);
      const details = document.createElement("div");
      details.className = "pr-case";
      details.dataset.case = caseId;

      const head = document.createElement("button");
      head.type = "button";
      head.className = "pr-case-head";
      head.setAttribute("aria-expanded", String(open));
      head.innerHTML = `<span class="pr-case-title">${escapeHtml(c.title)}</span><span class="pr-case-count">${list.length}</span>`;
      head.addEventListener("click", () => {
        collapsed.set(caseId, open);
        renderTree();
      });
      details.append(head);

      if (!open) {
        treeEl.append(details);
        continue;
      }

      const body = document.createElement("div");
      body.className = "pr-case-body";
      body.setAttribute("role", "group");

      if (caseId === "structured") {
        const groups = new Map<string, RegistryPattern[]>();
        for (const p of list) {
          const g = p.subcategory || "Other";
          if (!groups.has(g)) groups.set(g, []);
          groups.get(g)!.push(p);
        }
        for (const [group, items] of groups) {
          const subKey = `${caseId}::${group}`;
          const subOpen = !collapsedSub.get(subKey);
          const sub = document.createElement("div");
          sub.className = "pr-sub";
          const subHead = document.createElement("button");
          subHead.type = "button";
          subHead.className = "pr-sub-head";
          subHead.setAttribute("aria-expanded", String(subOpen));
          subHead.innerHTML = `<span>${escapeHtml(group)}</span><span class="pr-case-count">${items.length}</span>`;
          subHead.addEventListener("click", () => {
            collapsedSub.set(subKey, subOpen);
            renderTree();
          });
          sub.append(subHead);
          if (subOpen) {
            const ul = document.createElement("ul");
            ul.className = "pr-list";
            for (const p of items) ul.append(patternItem(p));
            sub.append(ul);
          }
          body.append(sub);
        }
      } else {
        const ul = document.createElement("ul");
        ul.className = "pr-list";
        for (const p of list) ul.append(patternItem(p));
        body.append(ul);
      }

      details.append(body);
      treeEl.append(details);
    }

    if (!treeEl.children.length) {
      const empty = document.createElement("p");
      empty.className = "pr-empty";
      empty.textContent = "No patterns match that search.";
      treeEl.append(empty);
    }

    renderMobileSelect();
    scrollSelectedIntoView();
  }

  function patternItem(p: RegistryPattern): HTMLLIElement {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pr-item";
    btn.dataset.patternId = p.id;
    btn.setAttribute("role", "treeitem");
    btn.setAttribute("aria-selected", String(p.id === selectedId));
    if (p.id === selectedId) btn.classList.add("is-selected");
    btn.textContent = p.name;
    btn.addEventListener("click", () => select(p.id, true));
    li.append(btn);
    return li;
  }

  function renderDetail(): void {
    const p = byId.get(selectedId);
    if (!p) {
      detailEl.innerHTML = `<p class="hint">Select a pattern.</p>`;
      return;
    }
    const c = cases.find((x) => x.id === p.category);
    const crumb = [c?.title ?? p.categoryLabel, p.subcategory].filter(Boolean);
    const treatments = p.supportedAppearanceTreatments?.length
      ? p.supportedAppearanceTreatments.join(", ")
      : "—";
    const modes = p.supportedColorModes?.length
      ? p.supportedColorModes.join(", ")
      : "—";
    const example = buildExample(p);
    const playgroundHref = `/playground/?case=${encodeURIComponent(p.category)}&pattern=${encodeURIComponent(p.id)}`;

    detailEl.innerHTML = `
      <nav class="pr-crumb" aria-label="Pattern category">${crumb
        .map((part) => `<span>${escapeHtml(part!)}</span>`)
        .join('<span class="pr-crumb-sep" aria-hidden="true">/</span>')}</nav>
      <h3 class="pr-name">${escapeHtml(p.name)}</h3>
      <p class="pr-desc">${escapeHtml(p.description)}</p>
      <div class="pr-id-row">
        <code class="pr-id" id="prIdValue">${escapeHtml(p.id)}</code>
        <button type="button" class="btn btn-ghost btn-sm" id="prCopyId">Copy</button>
      </div>
      <dl class="pr-meta">
        <div><dt>Kind</dt><dd><code>${escapeHtml(p.kind)}</code></dd></div>
        <div><dt>Effect</dt><dd><code>${escapeHtml(p.effect)}</code></dd></div>
        <div><dt>Lifecycle</dt><dd><code>${escapeHtml(p.appearanceLifecycle)}</code></dd></div>
        <div><dt>Settlement</dt><dd><code>${escapeHtml(p.appearanceSettlement)}</code></dd></div>
        <div><dt>Final appearance</dt><dd>${escapeHtml(p.expectedFinalAppearance ?? "inherited-host-styles")}</dd></div>
        <div><dt>Review</dt><dd>${escapeHtml(p.reviewBehavior)}</dd></div>
        <div><dt>Streaming</dt><dd>${p.streamingCompatible ? "Compatible" : "Not streaming-first"}</dd></div>
        <div><dt>Reduced motion</dt><dd>${escapeHtml(p.reducedMotion)}</dd></div>
      </dl>
      <section class="pr-section">
        <h4>Appearance</h4>
        <p class="pr-muted">Color modes: ${escapeHtml(modes)}</p>
        <p class="pr-muted">Treatments: ${escapeHtml(treatments)}</p>
        <p class="pr-muted">Themes: ${escapeHtml((p.themeSupport ?? []).join(", ") || "—")}</p>
        <p class="pr-muted">Motion presets: ${
          p.motionCapabilities?.supportsMotionPresets ? "Supported" : "Not applicable"
        }</p>
      </section>
      <section class="pr-section">
        <div class="pr-section-head">
          <h4>Implementation</h4>
          <div class="pr-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="prCopyCode">Copy code</button>
            <a class="btn btn-primary btn-sm" id="prOpenPlay" href="${playgroundHref}">Open in Playground</a>
          </div>
        </div>
        <pre class="code-block pr-code" tabindex="0"><code>${highlightJs(example)}</code></pre>
      </section>`;

    const copyId = detailEl.querySelector<HTMLButtonElement>("#prCopyId")!;
    const copyCode = detailEl.querySelector<HTMLButtonElement>("#prCopyCode")!;
    const openPlay = detailEl.querySelector<HTMLAnchorElement>("#prOpenPlay")!;
    setIconLabel(copyId, "copy", "Copy");
    setIconLabel(copyCode, "copy", "Copy code");
    setIconLabel(openPlay, "arrowRight", "Open in Playground");

    copyId.onclick = () =>
      void copyWithIconFeedback(copyId, p.id, {
        idleLabel: "Copy",
        successLabel: "Copied",
      });
    copyCode.onclick = () =>
      void copyWithIconFeedback(copyCode, example, {
        idleLabel: "Copy code",
        successLabel: "Copied",
      });
  }

  function select(id: string, pushHistory: boolean): void {
    if (!byId.has(id)) return;
    selectedId = id;
    ensureExpandedForSelection();
    renderTree();
    renderDetail();
    syncHash(pushHistory);
  }

  searchEl.addEventListener("input", () => {
    query = searchEl.value.trim();
    renderTree();
  });

  mobileSelect.addEventListener("change", () => {
    select(mobileSelect.value, true);
  });

  const mq = window.matchMedia("(max-width: 860px)");
  const syncMobile = () => {
    mobileWrap.hidden = !mq.matches;
    treeEl.hidden = mq.matches;
  };
  mq.addEventListener("change", syncMobile);
  syncMobile();

  treeEl.addEventListener("keydown", (e) => {
    const items = [
      ...treeEl.querySelectorAll<HTMLButtonElement>(".pr-item"),
    ];
    const idx = items.findIndex((b) => b.dataset.patternId === selectedId);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next =
        e.key === "ArrowDown"
          ? items[Math.min(items.length - 1, idx + 1)]
          : items[Math.max(0, idx - 1)];
      if (next?.dataset.patternId) {
        select(next.dataset.patternId, true);
        next.focus();
      }
    } else if (e.key === "Home" && items[0]) {
      e.preventDefault();
      select(items[0].dataset.patternId!, true);
      items[0].focus();
    } else if (e.key === "End" && items.length) {
      e.preventDefault();
      const last = items[items.length - 1];
      select(last.dataset.patternId!, true);
      last.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      const t = e.target as HTMLElement;
      if (t.classList.contains("pr-item")) {
        e.preventDefault();
        detailEl.focus();
      }
    }
  });

  function applyHashSelection(id: string, opts?: { clearSearch?: boolean }): void {
    if (!byId.has(id)) return;
    selectedId = id;
    if (opts?.clearSearch && query) {
      query = "";
      searchEl.value = "";
    }
    ensureExpandedForSelection();
    renderTree();
    renderDetail();
  }

  window.addEventListener("hashchange", () => {
    const id =
      parsePatternHash(location.hash) ??
      (byId.has(location.hash.replace(/^#/, ""))
        ? location.hash.replace(/^#/, "")
        : null);
    if (id && id !== selectedId && byId.has(id)) {
      applyHashSelection(id, { clearSearch: true });
      root.closest("#doc-patterns")?.scrollIntoView({ block: "start" });
    }
  });

  window.addEventListener("popstate", () => {
    const id =
      parsePatternHash(location.hash) ??
      (byId.has(location.hash.replace(/^#/, ""))
        ? location.hash.replace(/^#/, "")
        : null);
    if (id && byId.has(id) && id !== selectedId) {
      applyHashSelection(id, { clearSearch: true });
    }
  });

  ensureExpandedForSelection();
  renderTree();
  renderDetail();

  const rawHash = location.hash.replace(/^#/, "");
  const hashIsPattern =
    !!fromHash ||
    rawHash.startsWith(HASH_PREFIX) ||
    byId.has(rawHash);
  // Only claim the URL hash when it already addresses a pattern.
  // Preserve section hashes like #doc-patterns.
  if (hashIsPattern && selectedId) {
    syncHash(false);
  }
  if (fromHash && byId.has(fromHash)) {
    requestAnimationFrame(() => {
      root.closest("#doc-patterns")?.scrollIntoView({ block: "start" });
      scrollSelectedIntoView();
    });
  }
}
