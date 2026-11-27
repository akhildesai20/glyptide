/**
 * AI Document Editor — insert / replace / review accept-reject (mock).
 */
import { createGlyptide } from "glyptide";

export function runEditorInsert(root: HTMLElement) {
  const g = createGlyptide({
    element: root,
    pattern: "insert-reserved-gap",
    reduce: false,
    latency: 200,
    config: {
      source: "Design systems need [[consistent]] motion language.",
      text: "predictable",
    },
  });
  g.start();
  return g;
}

export function runEditorReview(root: HTMLElement) {
  const g = createGlyptide({
    element: root,
    pattern: "replace-review-in-place",
    latency: 150,
    config: {
      source:
        "Ship [[fast]] and break things. Motion should feel deliberate when text is rewritten.",
      text: "carefully",
    },
  });
  g.start();
  return g;
}
