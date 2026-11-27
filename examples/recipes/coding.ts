/**
 * AI Coding Assistant — code stream + replacement review (mock).
 */
import { createGlyptide } from "glyptide";

const SNIPPET = `function pace(tokens) {
  return tokens.map(reveal);
}
`;

export function runCodingRecipe(root: HTMLElement) {
  const g = createGlyptide({
    element: root,
    pattern: "structured-code-line-stream",
    latency: 80,
    motion: { preset: "precise" },
  });
  g.start({ text: SNIPPET });
  return g;
}
