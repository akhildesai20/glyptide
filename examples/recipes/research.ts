/**
 * AI Research Assistant — progressive sections + citations (mock structured).
 */
import { createGlyptide } from "glyptide";

const SECTIONS = `## Findings
Streaming Markdown belongs to the host renderer.

## References
1. Streamdown — host-owned AST
2. Glyptide — text motion only
`;

export function runResearchRecipe(root: HTMLElement) {
  const g = createGlyptide({
    element: root,
    pattern: "structured-outline-hierarchy",
    latency: 100,
    motion: { preset: "editorial" },
  });
  g.start({ text: SECTIONS });
  return g;
}
