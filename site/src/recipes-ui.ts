/**
 * Interactive recipe discovery tiles — runs offline mocks from examples/recipes.
 */
import type { GlyptideInstance } from "glyptide";
import { runChatRecipe } from "../../examples/recipes/chat";
import { runCodingRecipe } from "../../examples/recipes/coding";
import {
  regenerate,
  runComposerDraft,
} from "../../examples/recipes/composer";
import {
  runEditorInsert,
  runEditorReview,
} from "../../examples/recipes/editor";
import { runResearchRecipe } from "../../examples/recipes/research";
import {
  bindHoverAnim,
  createIcon,
  playRecipeIconAnim,
  type IconName,
} from "./icons";

export type RecipeId = "chat" | "editor" | "research" | "coding" | "composer";

interface RecipeDef {
  id: RecipeId;
  icon: IconName;
  title: string;
  description: string;
  source: string;
}

const RECIPES: RecipeDef[] = [
  {
    id: "chat",
    icon: "chat",
    title: "AI Chat",
    description: "Streaming responses, waiting states and interruption.",
    source: "examples/recipes/chat.ts",
  },
  {
    id: "editor",
    icon: "editor",
    title: "AI Editor",
    description: "Inline edits, suggestions and revision review.",
    source: "examples/recipes/editor.ts",
  },
  {
    id: "research",
    icon: "research",
    title: "AI Research",
    description: "Progressive sections and structured insights.",
    source: "examples/recipes/research.ts",
  },
  {
    id: "coding",
    icon: "coding",
    title: "AI Coding",
    description: "Code generation and line-by-line streaming.",
    source: "examples/recipes/coding.ts",
  },
  {
    id: "composer",
    icon: "composer",
    title: "AI Composer",
    description: "Draft, refine and regenerate content.",
    source: "examples/recipes/composer.ts",
  },
];

const GH_BASE =
  "https://github.com/akhildesai20/glyptide/blob/main/examples/recipes";

export function mountRecipesSection(section: HTMLElement): void {
  const gridEl = section.querySelector<HTMLElement>("#recipeGrid");
  const stageEl = section.querySelector<HTMLElement>("#recipeStage");
  const outEl = section.querySelector<HTMLElement>("#recipeOutput");
  const wait = section.querySelector<HTMLElement>("#recipeWaiting");
  const titleEl = section.querySelector<HTMLElement>("#recipeStageTitle");
  const sourceLink = section.querySelector<HTMLAnchorElement>("#recipeSourceLink");
  const replayBtn = section.querySelector<HTMLButtonElement>("#recipeReplay");
  if (!gridEl || !stageEl || !outEl) return;
  const grid = gridEl;
  const stage = stageEl;
  const out = outEl;

  let active: RecipeId | null = null;
  let instance: GlyptideInstance | null = null;
  let abort: AbortController | null = null;
  const cleanups: Array<() => void> = [];

  function destroyInstance(): void {
    abort?.abort();
    abort = null;
    try {
      instance?.destroy();
    } catch {
      /* ignore */
    }
    instance = null;
    out.replaceChildren();
    wait?.replaceChildren();
  }

  async function run(id: RecipeId): Promise<void> {
    destroyInstance();
    abort = new AbortController();
    const signal = abort.signal;
    out.className = "glyptide-document";
    if (id === "coding") out.classList.add("code");

    try {
      switch (id) {
        case "chat":
          instance = await runChatRecipe(out, signal);
          break;
        case "editor": {
          const mode =
            out.dataset.editorMode === "review" ? "review" : "insert";
          instance =
            mode === "review" ? runEditorReview(out) : runEditorInsert(out);
          out.dataset.editorMode = mode === "review" ? "insert" : "review";
          break;
        }
        case "research":
          instance = runResearchRecipe(out);
          break;
        case "coding":
          instance = runCodingRecipe(out);
          break;
        case "composer": {
          instance = runComposerDraft(out);
          break;
        }
      }
    } catch (err) {
      if (!signal.aborted) {
        out.textContent = "Unable to run recipe demo.";
        console.error(err);
      }
    }
  }

  function select(id: RecipeId, focusStage = true): void {
    active = id;
    const def = RECIPES.find((r) => r.id === id)!;
    stage.hidden = false;
    stage.dataset.recipe = id;
    if (titleEl) titleEl.textContent = def.title;
    if (sourceLink) {
      sourceLink.href = `${GH_BASE}/${id}.ts`;
      sourceLink.textContent = def.source;
    }
    grid.querySelectorAll<HTMLButtonElement>(".recipe-tile").forEach((btn) => {
      const on = btn.dataset.recipe === id;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("is-selected", on);
    });
    void run(id);
    if (focusStage) stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  grid.replaceChildren();
  for (const def of RECIPES) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "recipe-tile";
    tile.dataset.recipe = def.id;
    tile.setAttribute("aria-pressed", "false");
    tile.setAttribute(
      "aria-controls",
      "recipeStage",
    );

    const surface = document.createElement("div");
    surface.className = "recipe-tile-icon";
    surface.setAttribute("aria-hidden", "true");
    const svg = createIcon(def.icon, {
      size: "feature",
      strokeWidth: 1.35,
      anim: def.id,
      className: "recipe-feature-icon",
    });
    // Allow transforms on children
    svg.style.overflow = "visible";
    surface.append(svg);

    const body = document.createElement("div");
    body.className = "recipe-tile-body";
    const heading = document.createElement("div");
    heading.className = "recipe-tile-heading";
    const h = document.createElement("span");
    h.className = "recipe-tile-title";
    h.textContent = def.title;
    const arrow = createIcon("external", {
      size: "sm",
      className: "recipe-tile-arrow",
    });
    heading.append(h, arrow);
    const desc = document.createElement("p");
    desc.className = "recipe-tile-desc";
    desc.textContent = def.description;
    body.append(heading, desc);

    tile.append(surface, body);
    tile.addEventListener("click", () => select(def.id));
    cleanups.push(
      bindHoverAnim(tile, () => playRecipeIconAnim(svg, def.id)),
    );
    grid.append(tile);
  }

  replayBtn?.addEventListener("click", () => {
    if (!active) return;
    if (active === "composer" && instance) {
      regenerate(
        instance,
        "Regenerated draft: clearer sentences, same meaning, new rhythm.",
      );
      return;
    }
    void run(active);
  });

  // Expose for tests
  (section as HTMLElement & { __selectRecipe?: (id: RecipeId) => void }).__selectRecipe =
    select;
}
