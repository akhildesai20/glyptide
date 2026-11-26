import type { BufferKind } from "./types";
import { splitText } from "./split";

/**
 * Incremental cross-chunk segmentation.
 * Retains an incomplete trailing boundary until a complete unit can be emitted,
 * then flushes remainder on stream end.
 */
export interface IncrementalSplitter {
  push: (chunk: string) => string[];
  flush: () => string[];
  clear: () => void;
  readonly pending: string;
}

function endsWithIncompleteSurrogate(text: string): boolean {
  if (!text.length) return false;
  const c = text.charCodeAt(text.length - 1);
  return c >= 0xd800 && c <= 0xdbff;
}

/**
 * Heuristic: for word/phrase modes, hold a trailing run that has no
 * terminating whitespace yet (likely mid-word across chunks).
 */
function splitCompleteWords(buffer: string): { units: string[]; rest: string } {
  if (!buffer) return { units: [], rest: "" };
  if (endsWithIncompleteSurrogate(buffer)) {
    return { units: [], rest: buffer };
  }
  const parts = splitText(buffer, "word");
  if (!parts.length) return { units: [], rest: buffer };

  // If buffer ends with whitespace, all parts are complete
  if (/\s$/.test(buffer)) {
    return { units: parts, rest: "" };
  }
  // Hold the last part as incomplete word
  if (parts.length === 1) return { units: [], rest: buffer };
  const rest = parts[parts.length - 1];
  return { units: parts.slice(0, -1), rest };
}

function splitCompleteSentences(
  buffer: string,
): { units: string[]; rest: string } {
  if (!buffer) return { units: [], rest: "" };
  const parts = splitText(buffer, "sentence");
  if (!parts.length) return { units: [], rest: buffer };
  // Complete if last unit ends with sentence terminator
  const last = parts[parts.length - 1];
  if (/[.!?…]["')\]]*\s*$/.test(last) || parts.length === 1 && /[.!?…]/.test(last) && /[.!?]$/.test(last.trimEnd())) {
    // If buffer clearly ends mid-sentence (no terminator on last), hold it
    if (!/[.!?…]["')\]]*\s*$/.test(buffer) && !/\n\s*\n$/.test(buffer)) {
      if (parts.length === 1) return { units: [], rest: buffer };
      return { units: parts.slice(0, -1), rest: parts[parts.length - 1] };
    }
    return { units: parts, rest: "" };
  }
  if (parts.length === 1) return { units: [], rest: buffer };
  return { units: parts.slice(0, -1), rest: last };
}

function splitCompleteParagraphs(
  buffer: string,
): { units: string[]; rest: string } {
  if (!buffer) return { units: [], rest: "" };
  const parts = splitText(buffer, "paragraph");
  if (!parts.length) return { units: [], rest: buffer };
  if (/\n\s*\n$/.test(buffer)) return { units: parts, rest: "" };
  if (parts.length === 1) return { units: [], rest: buffer };
  return { units: parts.slice(0, -1), rest: parts[parts.length - 1] };
}

function splitCompleteLines(
  buffer: string,
): { units: string[]; rest: string } {
  if (!buffer) return { units: [], rest: "" };
  const parts = splitText(buffer, "line");
  if (!parts.length) return { units: [], rest: buffer };
  if (/\n$/.test(buffer)) return { units: parts, rest: "" };
  if (parts.length === 1) return { units: [], rest: buffer };
  return { units: parts.slice(0, -1), rest: parts[parts.length - 1] };
}

function splitCompleteGraphemes(
  buffer: string,
): { units: string[]; rest: string } {
  if (!buffer) return { units: [], rest: "" };
  if (endsWithIncompleteSurrogate(buffer)) {
    return { units: [], rest: buffer };
  }
  // Grapheme-complete units via splitText token (groups of graphemes) —
  // hold nothing except orphan high surrogate (handled above).
  // For true grapheme safety we emit all but keep empty rest.
  const units = splitText(buffer, "token");
  return { units, rest: "" };
}

export function createIncrementalSplitter(kind: BufferKind): IncrementalSplitter {
  let pending = "";

  function extract(buffer: string): { units: string[]; rest: string } {
    if (!buffer) return { units: [], rest: "" };
    if (kind === "all") {
      // Atomic patterns: retain everything until flush()
      return { units: [], rest: buffer };
    }
    if (kind === "token") return splitCompleteGraphemes(buffer);
    if (kind === "sentence") return splitCompleteSentences(buffer);
    if (kind === "paragraph") return splitCompleteParagraphs(buffer);
    if (kind === "line") return splitCompleteLines(buffer);
    if (kind === "phrase") {
      const { units, rest } = splitCompleteWords(buffer);
      if (!units.length) return { units: [], rest };
      // Re-group complete words into phrases of ~4
      const phrases: string[] = [];
      for (let i = 0; i < units.length; i += 4) {
        const slice = units.slice(i, i + 4);
        if (slice.length < 4 && i + 4 >= units.length) {
          // Hold incomplete phrase at end
          return {
            units: phrases,
            rest: slice.join("") + rest,
          };
        }
        phrases.push(slice.join(""));
      }
      return { units: phrases, rest };
    }
    // word (default)
    return splitCompleteWords(buffer);
  }

  return {
    push(chunk: string) {
      if (!chunk) return [];
      pending += chunk;
      const { units, rest } = extract(pending);
      pending = rest;
      return units;
    },
    flush() {
      if (!pending) return [];
      const out = kind === "all" ? [pending] : splitText(pending, kind);
      pending = "";
      return out.length ? out : [];
    },
    clear() {
      pending = "";
    },
    get pending() {
      return pending;
    },
  };
}
