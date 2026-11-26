/**
 * Optional host rendering boundary.
 * Glyptide animates text/nodes the host supplies — it does not parse Markdown.
 *
 * Hosts using Streamdown (or similar) should:
 * 1. Parse / stream Markdown themselves.
 * 2. Mark block roots or text nodes for Glyptide to pace/reveal.
 * 3. Avoid double animation (one layer paces, one paints).
 */

export interface RenderAdapterContext {
  /** Root element Glyptide was bound to */
  element: HTMLElement;
  /** Abort / teardown */
  signal?: AbortSignal;
}

export interface RenderAdapter {
  /** Called before Glyptide mutates content for a generation */
  prepare?(ctx: RenderAdapterContext): void;
  /**
   * Optional: host commits structured DOM for `text`.
   * Return true if the host handled rendering (Glyptide should only animate).
   */
  commit?(ctx: RenderAdapterContext, text: string): boolean;
  /** Cleanup host-side listeners / nodes */
  destroy?(ctx: RenderAdapterContext): void;
}

/** No-op adapter — Glyptide owns plain text rendering */
export const passthroughRenderAdapter: RenderAdapter = {
  commit() {
    return false;
  },
};
