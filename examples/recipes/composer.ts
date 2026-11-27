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
    text:
      "Streaming text should feel like reading, not like watching a progress bar. " +
      "Glyptide holds tokens just long enough for the eye to settle, then continues " +
      "at a pace that matches comprehension. When the upstream model pauses, the " +
      "presentation keeps draining what it already has so the surface never stalls. " +
      "Regenerate to try a different rhythm with the same intent.",
  });
  return g;
}

/** Regeneration = reset + start with new host-provided text */
export function regenerate(
  g: ReturnType<typeof createGlyptide>,
  nextText?: string,
) {
  g.reset();
  g.start({
    text:
      nextText ??
      "A regenerated draft keeps the same idea in a new cadence: clearer sentences, " +
        "steadier emphasis, and room for the reader to scan before the next phrase " +
        "arrives. Accept the motion as presentation only—the host owns the words.",
  });
}
