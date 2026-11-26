import type { CaseId, Effect } from "./types";

/**
 * How aesthetic / generation treatments relate to the finished document.
 *
 * - transient: temporary communication of generation; must clear to inherited styles
 * - persistent: intentional lasting formatting (e.g. heading weight)
 * - review-bound: visible until accept / reject
 */
export type AppearanceLifecycle = "transient" | "persistent" | "review-bound";

/**
 * When transient treatments settle / clear.
 * Review-bound uses accept (and reject restores source).
 */
export type AppearanceSettlement =
  | "piece"
  | "generation"
  | "accept"
  | "none";

export interface AppearanceLifecycleMeta {
  lifecycle: AppearanceLifecycle;
  settlement: AppearanceSettlement;
}

const REVIEW_EFFECTS = new Set<Effect>([
  "ghost",
  "review",
  "diff",
  "worddiff",
  "addition",
]);

/** Piece-level transient cues — earlier chunks settle while later ones still generate */
const PIECE_TRANSIENT = new Set<Effect>([
  "emphasis",
  "checkpoint",
  "guide",
  "rowAccent",
  "rowFocus",
  "ink",
  "gradientInk",
  "gradientHighlight",
  "gradientGlow",
  "gradientUnderline",
]);

/** Held until the full generation finishes, then cleared */
const GENERATION_TRANSIENT = new Set<Effect>([
  "color",
  "underline",
  "replacementInk",
  "mark",
  "linebar",
]);

/**
 * Source of truth for appearance lifecycle — used by engine, playground,
 * exports, and tests. Aesthetic colorMode / presets never override this.
 */
export function appearanceLifecycleFor(
  effect: Effect,
  _caseId?: CaseId,
  _patternName?: string,
): AppearanceLifecycleMeta {
  if (REVIEW_EFFECTS.has(effect)) {
    return { lifecycle: "review-bound", settlement: "accept" };
  }
  if (effect === "heading") {
    // Intentional weight on headings / headers — keep after generation
    return { lifecycle: "persistent", settlement: "none" };
  }
  if (PIECE_TRANSIENT.has(effect)) {
    return { lifecycle: "transient", settlement: "piece" };
  }
  if (GENERATION_TRANSIENT.has(effect)) {
    return { lifecycle: "transient", settlement: "generation" };
  }
  // Motion-only / quiet delivery: layered aesthetic treatments are transient.
  // Prefer piece settlement so earlier words clear while later ones still arrive.
  return { lifecycle: "transient", settlement: "piece" };
}

/** Resolve lifecycle, honoring optional registry overrides on a pattern. */
export function resolveAppearanceLifecycle(pattern: {
  effect: Effect;
  caseId?: CaseId;
  name?: string;
  appearanceLifecycle?: AppearanceLifecycle;
  appearanceSettlement?: AppearanceSettlement;
}): AppearanceLifecycleMeta {
  const derived = appearanceLifecycleFor(
    pattern.effect,
    pattern.caseId,
    pattern.name,
  );
  return {
    lifecycle: pattern.appearanceLifecycle ?? derived.lifecycle,
    settlement: pattern.appearanceSettlement ?? derived.settlement,
  };
}

export function isReviewBoundEffect(effect: Effect): boolean {
  return REVIEW_EFFECTS.has(effect);
}

/** CSS classes that communicate temporary generation / appearance */
export const TRANSIENT_APPEARANCE_CLASSES = [
  "grad-ink",
  "grad-highlight",
  "grad-glow",
  "grad-underline",
  "appear-ink",
  "appear-highlight",
  "appear-glow",
  "appear-underline",
  "ink",
  "underlined",
  "active-guide",
  "checkpoint-active",
  "row-accent",
  "row-focus",
] as const;

/** Inline properties Glyptide may set for temporary treatments */
const TRANSIENT_STYLE_PROPS = [
  "background-position",
  "background-size",
  "background-image",
  "background",
  "background-clip",
  "-webkit-background-clip",
  "-webkit-text-fill-color",
  "color",
  "background-color",
  "text-shadow",
  "box-shadow",
  "text-decoration",
  "text-decoration-color",
  "opacity",
  "filter",
  "transform",
  "mask-image",
  "--appear-intensity",
  "--appear-angle",
] as const;

/**
 * Strip temporary generation / appearance styling from an element tree.
 * Does not rewrite text nodes or host typography classes (e.g. .code).
 * Does not clear `font-weight` so persistent heading emphasis survives.
 */
export function clearTransientAppearance(
  root: ParentNode,
  _options: { preservePersistent?: boolean } = {},
): void {
  const nodes = [
    ...(root instanceof Element ? [root] : []),
    ...Array.from(root.querySelectorAll("*")),
  ];

  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) continue;

    for (const cls of TRANSIENT_APPEARANCE_CLASSES) {
      el.classList.remove(cls);
    }

    for (const prop of TRANSIENT_STYLE_PROPS) {
      el.style.removeProperty(prop);
    }
  }
}

/** Clear only piece-level transient classes on a single piece element */
export function settlePieceAppearance(el: HTMLElement): void {
  for (const cls of TRANSIENT_APPEARANCE_CLASSES) {
    el.classList.remove(cls);
  }
  for (const prop of TRANSIENT_STYLE_PROPS) {
    el.style.removeProperty(prop);
  }
}
