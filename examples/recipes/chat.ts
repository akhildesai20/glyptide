/**
 * AI Chat recipe — anticipation + streaming + cancel (mock stream, no provider).
 */
import { createGlyptide, pipeTextToGlyptide } from "glyptide";
import "glyptide/styles.css";

const SAMPLE =
  "Glyptide paces tokens for reading comfort while your model stream continues in the background.";

export async function runChatRecipe(root: HTMLElement, signal?: AbortSignal) {
  const out = root.querySelector<HTMLElement>("[data-glyptide-out]") ?? root;
  const g = createGlyptide({
    element: out,
    pattern: "new-word-settle",
    latency: 0,
    waitingThresholdMs: 180,
    stallMs: 2500,
    motion: { preset: "natural" },
    signal,
  });

  async function* mock() {
    for (const word of SAMPLE.split(/(\s+)/)) {
      await new Promise((r) => setTimeout(r, 28));
      if (signal?.aborted) return;
      yield word;
    }
  }

  await pipeTextToGlyptide(g, mock(), { mode: "delta", signal });
  return g;
}
