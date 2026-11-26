/**
 * Normalized text operations for stream consumption.
 * Append never represents a replacement.
 */

export type TextOperation =
  | { type: "append"; text: string }
  | { type: "replace"; text: string }
  | { type: "noop" };

/** Longest common prefix length on a code-unit boundary safe for BMP+surrogates */
export function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  // Do not split a surrogate pair
  if (i > 0 && i < a.length && i < b.length) {
    const c = a.charCodeAt(i - 1);
    if (c >= 0xd800 && c <= 0xdbff) i -= 1;
  }
  return i;
}

/**
 * Normalize a snapshot against previously rendered text.
 * - append-only growth → append suffix
 * - duplicate → noop
 * - shrink (new is prefix) → replace with shorter text
 * - divergent → replace with full snapshot
 * - empty → replace with ""
 */
export function normalizeSnapshot(
  previous: string,
  snapshot: string,
): TextOperation {
  if (snapshot === previous) return { type: "noop" };
  if (snapshot === "") return { type: "replace", text: "" };
  if (previous === "") return { type: "append", text: snapshot };
  if (snapshot.startsWith(previous)) {
    return { type: "append", text: snapshot.slice(previous.length) };
  }
  // Shrinking or divergent — never append a full replacement as a delta
  return { type: "replace", text: snapshot };
}

export function applyTextOperation(
  previous: string,
  op: TextOperation,
): string {
  if (op.type === "noop") return previous;
  if (op.type === "append") return previous + op.text;
  return op.text;
}
