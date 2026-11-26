import type { PatternDefinition } from "glyptide";

export interface PatternGroup {
  id: string;
  label: string;
  patterns: { pattern: PatternDefinition; index: number }[];
}

/** Display labels for structured groups from the registry */
const GROUP_LABELS: Record<string, string> = {
  Lists: "Lists",
  Code: "Code blocks",
  Sections: "Document sections",
  Checklists: "Checklists",
  Data: "Tables",
  Outlines: "Hierarchical outlines",
  Quotes: "Quotations",
  Explanations: "Explanations",
};

const GROUP_ORDER = [
  "Lists",
  "Code",
  "Sections",
  "Checklists",
  "Data",
  "Outlines",
  "Quotes",
  "Explanations",
];

export function groupPatterns(
  patterns: PatternDefinition[],
): PatternGroup[] {
  const hasGroups = patterns.some((p) => p.group);
  if (!hasGroups) {
    return [
      {
        id: "all",
        label: "",
        patterns: patterns.map((pattern, index) => ({ pattern, index })),
      },
    ];
  }

  const map = new Map<string, PatternGroup>();
  patterns.forEach((pattern, index) => {
    const id = pattern.group || "Other";
    if (!map.has(id)) {
      map.set(id, {
        id,
        label: GROUP_LABELS[id] || id,
        patterns: [],
      });
    }
    map.get(id)!.patterns.push({ pattern, index });
  });

  const ordered: PatternGroup[] = [];
  for (const id of GROUP_ORDER) {
    const g = map.get(id);
    if (g) ordered.push(g);
  }
  for (const [id, g] of map) {
    if (!GROUP_ORDER.includes(id)) ordered.push(g);
  }
  return ordered;
}

export function filterGroups(
  groups: PatternGroup[],
  query: string,
): PatternGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      patterns: g.patterns.filter(
        ({ pattern }) =>
          pattern.name.toLowerCase().includes(q) ||
          pattern.description.toLowerCase().includes(q) ||
          pattern.kind.toLowerCase().includes(q) ||
          pattern.effect.toLowerCase().includes(q) ||
          (g.label && g.label.toLowerCase().includes(q)) ||
          (pattern.group && pattern.group.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.patterns.length > 0);
}

interface MountOptions {
  root: HTMLElement;
  getPatterns: () => PatternDefinition[];
  getSelectedIndex: () => number;
  onSelect: (index: number) => void;
  /** When true, show grouped UI with search */
  grouped: boolean;
}

/**
 * Accessible combobox pattern selector with optional category groups.
 */
export function mountPatternSelect(options: MountOptions): {
  refresh: () => void;
  setGrouped: (grouped: boolean) => void;
  close: () => void;
} {
  let grouped = options.grouped;
  let open = false;
  let activeIndex = -1;
  let filtered: PatternGroup[] = [];

  const root = options.root;
  root.classList.add("pattern-select");
  root.innerHTML = `
    <button type="button" class="pattern-trigger" id="patternTrigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="pattern-trigger-label" id="patternTriggerLabel">Select pattern</span>
      <span class="preset-caret" aria-hidden="true">▾</span>
    </button>
    <div class="pattern-popover" id="patternPopover" hidden>
      <label class="pattern-search-wrap">
        <span class="sr-only">Search patterns</span>
        <input type="search" class="pattern-search" id="patternSearch" placeholder="Search patterns…" autocomplete="off" />
      </label>
      <div class="pattern-list" id="patternList" role="listbox" tabindex="-1"></div>
    </div>
    <select id="pattern" class="pattern-native-fallback" aria-hidden="true" tabindex="-1"></select>
  `;

  const trigger = root.querySelector("#patternTrigger") as HTMLButtonElement;
  const label = root.querySelector("#patternTriggerLabel") as HTMLElement;
  const popover = root.querySelector("#patternPopover") as HTMLElement;
  const search = root.querySelector("#patternSearch") as HTMLInputElement;
  const list = root.querySelector("#patternList") as HTMLElement;
  const native = root.querySelector("#pattern") as HTMLSelectElement;

  function patterns(): PatternDefinition[] {
    return options.getPatterns();
  }

  function syncNative(): void {
    const listP = patterns();
    native.replaceChildren(
      ...listP.map((p, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = p.group ? `${p.group} — ${p.name}` : p.name;
        return o;
      }),
    );
    native.value = String(options.getSelectedIndex());
  }

  function syncLabel(): void {
    const p = patterns()[options.getSelectedIndex()];
    label.textContent = p ? p.name : "Select pattern";
  }

  function flatItems(): { pattern: PatternDefinition; index: number }[] {
    return filtered.flatMap((g) => g.patterns);
  }

  function renderList(): void {
    const groups = filterGroups(groupPatterns(patterns()), search.value);
    filtered = grouped ? groups : [{ id: "all", label: "", patterns: groups.flatMap((g) => g.patterns) }];
    list.replaceChildren();
    const selected = options.getSelectedIndex();
    activeIndex = -1;

    let flat = 0;
    for (const g of filtered) {
      if (grouped && g.label) {
        const head = document.createElement("div");
        head.className = "pattern-group-head";
        head.setAttribute("role", "presentation");
        head.innerHTML = `<span class="pattern-group-icon" aria-hidden="true"></span><span>${g.label}</span>`;
        list.append(head);
      }
      for (const { pattern, index } of g.patterns) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pattern-option";
        btn.setAttribute("role", "option");
        btn.setAttribute("aria-selected", String(index === selected));
        btn.dataset.index = String(index);
        btn.dataset.flat = String(flat);
        btn.innerHTML = `<span class="pattern-option-name">${pattern.name}</span><span class="pattern-option-meta">${pattern.kind}</span>`;
        if (index === selected) {
          activeIndex = flat;
          btn.classList.add("is-active");
        }
        btn.onclick = () => {
          options.onSelect(index);
          close();
          refresh();
        };
        list.append(btn);
        flat++;
      }
      if (grouped && g.label) {
        const div = document.createElement("div");
        div.className = "pattern-group-divider";
        div.setAttribute("role", "presentation");
        list.append(div);
      }
    }

    // Remove trailing divider
    const last = list.lastElementChild;
    if (last?.classList.contains("pattern-group-divider")) last.remove();

    if (!flatItems().length) {
      const empty = document.createElement("div");
      empty.className = "pattern-empty";
      empty.textContent = "No patterns match that search.";
      list.append(empty);
    }
  }

  function scrollActiveIntoView(): void {
    const el = list.querySelector(`[data-flat="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }

  function searchEnabled(): boolean {
    return grouped || patterns().length >= 12;
  }

  function openMenu(): void {
    open = true;
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search.value = "";
    renderList();
    // Ensure selected visible
    requestAnimationFrame(() => {
      const sel = list.querySelector('[aria-selected="true"]') as HTMLElement | null;
      sel?.scrollIntoView({ block: "nearest" });
      if (searchEnabled()) search.focus();
      else list.focus();
    });
  }

  function close(): void {
    open = false;
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  }

  function refresh(): void {
    syncNative();
    syncLabel();
    root.classList.toggle("is-grouped", grouped);
    search.parentElement!.hidden = !searchEnabled();
    if (open) renderList();
  }

  trigger.onclick = () => {
    if (open) close();
    else openMenu();
  };

  search.oninput = () => renderList();

  function moveActive(delta: number): void {
    const items = flatItems();
    if (!items.length) return;
    activeIndex = Math.max(0, Math.min(items.length - 1, activeIndex + delta));
    list.querySelectorAll(".pattern-option").forEach((n) => n.classList.remove("is-active"));
    list.querySelector(`[data-flat="${activeIndex}"]`)?.classList.add("is-active");
    scrollActiveIntoView();
  }

  function onMenuKey(e: KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems()[activeIndex];
      if (item) {
        options.onSelect(item.index);
        close();
        refresh();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  search.onkeydown = onMenuKey;
  list.onkeydown = onMenuKey;

  document.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener("pointerdown", (e) => {
    if (!open) return;
    if (!root.contains(e.target as Node)) close();
  });

  // Keep native select for form/export consumers that read #pattern
  native.onchange = () => {
    options.onSelect(+native.value);
    refresh();
  };

  refresh();

  return {
    refresh,
    setGrouped: (g) => {
      grouped = g;
      refresh();
    },
    close,
  };
}
