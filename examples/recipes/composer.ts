/**
 * AI Composer — draft, expand, alternatives via composition of primitives.
 * Host supplies rewritten text; Glyptide only presents it.
 */
import { createGlyptide } from "glyptide";

export function runComposerDraft(root: HTMLElement) {
  const g = createGlyptide({
    element: root,
    pattern: "new-sentence-checkpoint",
    latency: 120,
    motion: { preset: "fluid" },
  });
  g.start({
    text: "A short draft appears in sentences. Expand or regenerate with reset + start.",
  });
  return g;
}

/** Regeneration = reset + start with new host-provided text */
export function regenerate(
  g: ReturnType<typeof createGlyptide>,
  nextText: string,
) {
  g.reset();
  g.start({ text: nextText });
}
