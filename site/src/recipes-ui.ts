/**
 * Interactive recipe discovery tiles — contextual shells over offline examples/recipes.
 */
import type { GlyptideInstance } from "glyptide";
import { runChatRecipe } from "../../examples/recipes/chat";
import { runCodingRecipe } from "../../examples/recipes/coding";
import {
  regenerate,
  runComposerDraft,
} from "../../examples/recipes/composer";
import { runEditorReview } from "../../examples/recipes/editor";
import { runResearchRecipe } from "../../examples/recipes/research";
import chatSource from "../../examples/recipes/chat.ts?raw";
import codingSource from "../../examples/recipes/coding.ts?raw";
import composerSource from "../../examples/recipes/composer.ts?raw";
import editorSource from "../../examples/recipes/editor.ts?raw";
import researchSource from "../../examples/recipes/research.ts?raw";
import {
  bindHoverAnim,
  createIcon,
  playRecipeIconAnim,
  type IconName,
} from "./icons";
import { copyWithIconFeedback, setIconLabel } from "./icons/controls";

export type RecipeId = "chat" | "editor" | "research" | "coding" | "composer";

interface RecipeDef {
  id: RecipeId;
  icon: IconName;
  title: string;
  description: string;
  sourcePath: string;
  sourceText: string;
}

const RECIPES: RecipeDef[] = [
  {
    id: "chat",
    icon: "chat",
    title: "Chat",
    description: "Stream conversational responses.",
    sourcePath: "chat.ts",
    sourceText: chatSource,
  },
  {
    id: "editor",
    icon: "editor",
    title: "Editor",
    description: "Insert, rewrite and review text.",
    sourcePath: "editor.ts",
    sourceText: editorSource,
  },
  {
    id: "research",
    icon: "research",
    title: "Research",
    description: "Generate structured insights.",
    sourcePath: "research.ts",
    sourceText: researchSource,
  },
  {
    id: "coding",
    icon: "coding",
    title: "Coding",
    description: "Stream code line by line.",
    sourcePath: "coding.ts",
    sourceText: codingSource,
  },
  {
    id: "composer",
    icon: "composer",
    title: "Composer",
    description: "Draft, refine and regenerate.",
    sourcePath: "composer.ts",
    sourceText: composerSource,
  },
];

const GH_BASE =
  "https://github.com/akhildesai20/glyptide/blob/main/examples/recipes";

const CODE_LINES = [
  "function pace(tokens) {",
  "  return tokens.map(reveal);",
  "}",
];

interface ShellRefs {
  out: HTMLElement;
  wait: HTMLElement | null;
  stopBtn: HTMLButtonElement | null;
  acceptBtn: HTMLButtonElement | null;
  rejectBtn: HTMLButtonElement | null;
  regenerateBtn: HTMLButtonElement | null;
  statusEl: HTMLElement | null;
}

function setStopVisible(btn: HTMLButtonElement, visible: boolean): void {
  btn.classList.toggle("is-visible", visible);
  btn.setAttribute("aria-hidden", String(!visible));
  btn.tabIndex = visible ? 0 : -1;
  if (!visible) btn.blur();
}

function buildShell(id: RecipeId, host: HTMLElement): ShellRefs {
  host.replaceChildren();
  host.dataset.recipeShell = id;
  host.className = `recipe-stage-surface recipe-shell recipe-shell-${id}`;

  if (id === "chat") {
    host.innerHTML = `
      <div class="recipe-chat">
        <div class="recipe-chat-msg recipe-chat-user">
          <span class="recipe-chat-role">You</span>
          <p>How should streaming text feel in a chat UI?</p>
        </div>
        <div class="recipe-chat-msg recipe-chat-assistant">
          <div class="recipe-chat-meta">
            <span class="recipe-chat-role">Assistant</span>
            <span class="recipe-chat-status" data-recipe-status>Ready</span>
            <span class="recipe-chat-stop-slot">
              <button type="button" class="btn btn-ghost btn-sm" data-recipe-stop aria-hidden="true" tabindex="-1">Stop</button>
            </span>
          </div>
          <div class="glyptide-document" data-glyptide-out></div>
          <div class="glyptide-waiting" data-glyptide-wait hidden></div>
        </div>
      </div>`;
  } else if (id === "editor") {
    host.innerHTML = `
      <div class="recipe-editor">
        <div class="recipe-editor-chrome">
          <span class="recipe-editor-filename">brief.md</span>
          <div class="recipe-editor-actions">
            <button type="button" class="btn btn-secondary btn-sm" data-recipe-accept hidden>Accept</button>
            <button type="button" class="btn btn-ghost btn-sm" data-recipe-reject hidden>Discard</button>
          </div>
        </div>
        <div class="recipe-editor-body">
          <div class="glyptide-document" data-glyptide-out></div>
          <div class="glyptide-waiting" data-glyptide-wait hidden></div>
        </div>
      </div>`;
  } else if (id === "research") {
    host.innerHTML = `
      <div class="recipe-research">
        <header class="recipe-research-head">
          <p class="recipe-research-kicker">Research brief</p>
          <h4 class="recipe-research-title">Streaming presentation boundaries</h4>
        </header>
        <div class="recipe-research-body">
          <div class="glyptide-document" data-glyptide-out></div>
          <div class="glyptide-waiting" data-glyptide-wait hidden></div>
        </div>
      </div>`;
  } else if (id === "coding") {
    const gutters = CODE_LINES.map((_, i) => `<span>${i + 1}</span>`).join("");
    host.innerHTML = `
      <div class="recipe-code">
        <div class="recipe-code-chrome">
          <span class="recipe-code-dot" aria-hidden="true"></span>
          <span class="recipe-code-dot" aria-hidden="true"></span>
          <span class="recipe-code-dot" aria-hidden="true"></span>
          <span class="recipe-code-filename">pace.ts</span>
        </div>
        <div class="recipe-code-body">
          <div class="recipe-code-gutter" aria-hidden="true">${gutters}</div>
          <div class="recipe-code-pane">
            <div class="glyptide-document code" data-glyptide-out></div>
            <div class="glyptide-waiting" data-glyptide-wait hidden></div>
          </div>
        </div>
      </div>`;
  } else {
    host.innerHTML = `
      <div class="recipe-composer">
        <div class="recipe-composer-chrome">
          <span class="recipe-composer-label">Draft</span>
          <button type="button" class="btn btn-secondary btn-sm" data-recipe-regenerate>Regenerate</button>
        </div>
        <div class="recipe-composer-body">
          <div class="glyptide-document" data-glyptide-out></div>
          <div class="glyptide-waiting" data-glyptide-wait hidden></div>
        </div>
      </div>`;
  }

  return {
    out: host.querySelector("[data-glyptide-out]") as HTMLElement,
    wait: host.querySelector("[data-glyptide-wait]"),
    stopBtn: host.querySelector("[data-recipe-stop]"),
    acceptBtn: host.querySelector("[data-recipe-accept]"),
    rejectBtn: host.querySelector("[data-recipe-reject]"),
    regenerateBtn: host.querySelector("[data-recipe-regenerate]"),
    statusEl: host.querySelector("[data-recipe-status]"),
  };
}

export function mountRecipesSection(section: HTMLElement): void {
  const gridEl = section.querySelector<HTMLElement>("#recipeGrid");
  const stageEl = section.querySelector<HTMLElement>("#recipeStage");
  const surfaceEl = section.querySelector<HTMLElement>("#recipeStageSurface");
  const titleEl = section.querySelector<HTMLElement>("#recipeStageTitle");
  const sourceLink = section.querySelector<HTMLAnchorElement>("#recipeSourceLink");
  const replayBtn = section.querySelector<HTMLButtonElement>("#recipeReplay");
  const copyBtn = section.querySelector<HTMLButtonElement>("#recipeCopy");
  if (!gridEl || !stageEl || !surfaceEl) return;
  const grid = gridEl;
  const stage = stageEl;
  const surface = surfaceEl;

  let active: RecipeId | null = null;
  let instance: GlyptideInstance | null = null;
  let abort: AbortController | null = null;
  let shell: ShellRefs | null = null;
  const cleanups: Array<() => void> = [];

  if (replayBtn) setIconLabel(replayBtn, "replay", "Replay");
  if (sourceLink) setIconLabel(sourceLink, "external", "View source");
  if (copyBtn) setIconLabel(copyBtn, "copy", "Copy implementation");

  function destroyInstance(): void {
    abort?.abort();
    abort = null;
    try {
      instance?.destroy();
    } catch {
      /* ignore */
    }
    instance = null;
  }

  function wireShellControls(id: RecipeId, refs: ShellRefs): void {
    if (refs.stopBtn) {
      setIconLabel(refs.stopBtn, "stop", "Stop");
      setStopVisible(refs.stopBtn, false);
      refs.stopBtn.onclick = () => {
        abort?.abort();
        instance?.stop();
        setStopVisible(refs.stopBtn!, false);
        if (refs.statusEl) refs.statusEl.textContent = "Stopped";
      };
    }
    if (refs.acceptBtn) {
      setIconLabel(refs.acceptBtn, "accept", "Accept");
      refs.acceptBtn.onclick = () => instance?.accept();
    }
    if (refs.rejectBtn) {
      setIconLabel(refs.rejectBtn, "reject", "Discard");
      refs.rejectBtn.onclick = () => instance?.reject();
    }
    if (refs.regenerateBtn) {
      setIconLabel(refs.regenerateBtn, "replay", "Regenerate");
      refs.regenerateBtn.onclick = () => {
        if (!instance || id !== "composer") return;
        regenerate(instance);
      };
    }
  }

  async function run(id: RecipeId): Promise<void> {
    destroyInstance();
    shell = buildShell(id, surface);
    wireShellControls(id, shell);
    abort = new AbortController();
    const signal = abort.signal;
    const { out, wait, stopBtn, acceptBtn, rejectBtn, statusEl } = shell;

    const syncState = (s: string) => {
      if (statusEl) statusEl.textContent = s;
      if (stopBtn) {
        setStopVisible(
          stopBtn,
          ["Waiting", "Generating", "Waiting for text"].includes(s),
        );
      }
      if (acceptBtn && rejectBtn) {
        const review = s === "Review";
        acceptBtn.hidden = !review;
        rejectBtn.hidden = !review;
      }
    };

    try {
      switch (id) {
        case "chat": {
          syncState("Generating");
          // Chat recipe targets [data-glyptide-out] inside root
          instance = await runChatRecipe(surface, signal);
          if (!signal.aborted) syncState("Complete");
          break;
        }
        case "editor": {
          instance = runEditorReview(out);
          instance.on("review", () => syncState("Review"));
          instance.on("complete", () => syncState("Complete"));
          instance.on("settled", () => syncState("Complete"));
          instance.on("stopped", () => syncState("Stopped"));
          const check = window.setInterval(() => {
            if (!instance) {
              clearInterval(check);
              return;
            }
            syncState(instance.state);
            if (["Complete", "Stopped", "Review"].includes(instance.state)) {
              clearInterval(check);
            }
          }, 120);
          break;
        }
        case "research":
          instance = runResearchRecipe(out);
          break;
        case "coding":
          instance = runCodingRecipe(out);
          break;
        case "composer":
          instance = runComposerDraft(out);
          break;
      }
      if (wait) wait.hidden = true;
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
      sourceLink.href = `${GH_BASE}/${def.sourcePath}`;
      setIconLabel(sourceLink, "external", "View source");
    }
    grid.querySelectorAll<HTMLButtonElement>(".recipe-tile").forEach((btn) => {
      const on = btn.dataset.recipe === id;
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("is-selected", on);
    });
    void run(id);
    if (focusStage) {
      stage.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  grid.replaceChildren();
  for (const def of RECIPES) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "recipe-tile";
    tile.dataset.recipe = def.id;
    tile.setAttribute("aria-pressed", "false");
    tile.setAttribute("aria-controls", "recipeStage");

    const surfaceIcon = document.createElement("div");
    surfaceIcon.className = "recipe-tile-icon";
    surfaceIcon.setAttribute("aria-hidden", "true");
    const svg = createIcon(def.icon, {
      size: "feature",
      strokeWidth: 1.5,
      anim: def.id,
      className: "recipe-feature-icon",
    });
    svg.style.overflow = "visible";
    surfaceIcon.append(svg);

    const body = document.createElement("div");
    body.className = "recipe-tile-body";
    const title = document.createElement("span");
    title.className = "recipe-tile-title";
    title.textContent = def.title;
    const desc = document.createElement("p");
    desc.className = "recipe-tile-desc";
    desc.textContent = def.description;
    body.append(title, desc);

    tile.append(surfaceIcon, body);
    tile.addEventListener("click", () => select(def.id));
    cleanups.push(bindHoverAnim(tile, () => playRecipeIconAnim(svg, def.id)));
    grid.append(tile);
  }

  replayBtn?.addEventListener("click", () => {
    if (active) void run(active);
  });

  copyBtn?.addEventListener("click", async () => {
    const def = RECIPES.find((r) => r.id === active);
    if (!def || !copyBtn) return;
    await copyWithIconFeedback(copyBtn, def.sourceText, {
      idleIcon: "copy",
      idleLabel: "Copy implementation",
      successLabel: "Copied",
    });
  });

  (section as HTMLElement & { __selectRecipe?: (id: RecipeId) => void }).__selectRecipe =
    select;
}
