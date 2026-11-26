/**
 * Stable pattern-id capability flags.
 * Prefer these over display-name string compares in the engine.
 */

export const PATTERN = {
  reservedGap: "insert-reserved-gap",
  blockByBlock: "rewrite-block-by-block",
  tokenStream: "new-token-stream",
  caretInsertion: "insert-caret-insertion",
  dataHeaderFirst: "structured-data-header-first",
  outlineHierarchy: "structured-outline-hierarchy",
  nextParagraph: "continue-next-paragraph",
  paragraphSuggestion: "continue-paragraph-suggestion",
} as const;

export type KnownPatternId = (typeof PATTERN)[keyof typeof PATTERN];

/** Code / data monospace surfaces in structured case */
export function isCodeSurfacePattern(
  patternId: string | undefined,
  patternName?: string,
): boolean {
  if (patternId) {
    return (
      patternId.startsWith("structured-code-") ||
      patternId.startsWith("structured-data-") ||
      patternId.startsWith("structured-buffered-")
    );
  }
  return !!patternName && /^(Code|Data|Buffered code|Buffered data)/.test(patternName);
}

export function isReservedGap(patternId?: string, patternName?: string): boolean {
  return patternId === PATTERN.reservedGap || patternName === "Reserved gap";
}

export function isBlockByBlock(patternId?: string, patternName?: string): boolean {
  return (
    patternId === PATTERN.blockByBlock || patternName === "Block-by-block"
  );
}

export function showsCaret(
  patternId?: string,
  patternName?: string,
  effect?: string,
): boolean {
  return (
    effect === "cursor" ||
    effect === "ghost" ||
    patternId === PATTERN.caretInsertion ||
    patternId === PATTERN.tokenStream ||
    patternName === "Caret insertion" ||
    patternName === "Token stream"
  );
}

export function isParagraphLeadIn(
  patternId?: string,
  patternName?: string,
): boolean {
  return (
    patternId === PATTERN.nextParagraph ||
    patternId === PATTERN.paragraphSuggestion ||
    patternName === "Next paragraph" ||
    patternName === "Paragraph suggestion"
  );
}

export function headingWeightMode(
  patternId?: string,
  patternName?: string,
): "data-header" | "outline" | "heuristic" {
  if (
    patternId === PATTERN.dataHeaderFirst ||
    patternName === "Data header first"
  ) {
    return "data-header";
  }
  if (
    patternId === PATTERN.outlineHierarchy ||
    patternName === "Outline hierarchy"
  ) {
    return "outline";
  }
  return "heuristic";
}
