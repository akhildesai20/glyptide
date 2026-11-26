/**
 * AI Document Editor — insert / replace / review accept-reject (mock).
 */
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

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
    pattern: "replace-ghost-rewrite",
    latency: 150,
    config: {
      source: "Ship [[fast]] and break things.",
      text: "carefully",
    },
  });
  g.start();
  return g;
}
