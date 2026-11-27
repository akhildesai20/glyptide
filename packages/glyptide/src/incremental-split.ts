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

const TOKEN_GRAPHEMES = 3;

type SegmenterLike = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (
    locales?: string | string[],
    options?: { granularity?: "grapheme" },
  ) => SegmenterLike;
};

function endsWithIncompleteSurrogate(text: string): boolean {
  if (!text.length) return false;
  const c = text.charCodeAt(text.length - 1);
  return c >= 0xd800 && c <= 0xdbff;
}

/** Grapheme clusters via Intl.Segmenter when available; else code points. */
function graphemeClusters(text: string): string[] {
  if (!text) return [];
  const IntlRef = Intl as IntlWithSegmenter;
  if (typeof Intl !== "undefined" && typeof IntlRef.Segmenter === "function") {
    const segmenter = new IntlRef.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), (x) => x.segment);
  }
  return Array.from(text);
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

/**
 * True when the trailing cluster may still grow (ZWJ sequences, skin tones,
 * regional-indicator pairs, combining marks). Stable Latin/CJK graphemes return false
 * so slow streams are not delayed by one cluster indefinitely.
 */
function isExtensibleCluster(cluster: string): boolean {
  if (!cluster) return false;
  if (endsWithIncompleteSurrogate(cluster)) return true;
  if (cluster.endsWith("\u200D")) return true; // ZWJ join
  if (cluster.endsWith("\uFE0F")) return true; // emoji presentation may precede ZWJ
  // Lone regional indicator (flags need a pair)
  const cps = [...cluster];
  if (cps.length === 1) {
    const cp = cps[0].codePointAt(0)!;
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return true;
  }
  // Trailing combining mark / virama — may attach more
  const last = cps[cps.length - 1];
  const lastCp = last.codePointAt(0)!;
  if (
    (lastCp >= 0x0300 && lastCp <= 0x036f) ||
    (lastCp >= 0x1ab0 && lastCp <= 0x1aff) ||
    (lastCp >= 0x1dc0 && lastCp <= 0x1dff) ||
    (lastCp >= 0x20d0 && lastCp <= 0x20ff) ||
    (lastCp >= 0xfe20 && lastCp <= 0xfe2f) ||
    lastCp === 0x094d || // Devanagari virama
    lastCp === 0x09cd ||
    lastCp === 0x0a4d ||
    lastCp === 0x0acd ||
    lastCp === 0x0b4d ||
    lastCp === 0x0bcd ||
    lastCp === 0x0c4d ||
    lastCp === 0x0ccd ||
    lastCp === 0x0d4d
  ) {
    return true;
  }
  return false;
}

/**
 * Token mode groups grapheme clusters (default 3).
 * Hold only an *extensible* trailing cluster (ZWJ / RI / combining / virama).
 * Engine stall flush still releases held content on slow streams.
 */
function splitCompleteGraphemes(
  buffer: string,
): { units: string[]; rest: string } {
  if (!buffer) return { units: [], rest: "" };
  if (endsWithIncompleteSurrogate(buffer)) {
    return { units: [], rest: buffer };
  }
  const graphemes = graphemeClusters(buffer);
  if (!graphemes.length) return { units: [], rest: "" };
  const last = graphemes[graphemes.length - 1] ?? "";
  const holdLast = isExtensibleCluster(last);
  const complete = holdLast ? graphemes.slice(0, -1) : graphemes;
  const held = holdLast ? last : "";
  if (!complete.length) return { units: [], rest: buffer };
  const units: string[] = [];
  let i = 0;
  for (; i + TOKEN_GRAPHEMES <= complete.length; i += TOKEN_GRAPHEMES) {
    units.push(complete.slice(i, i + TOKEN_GRAPHEMES).join(""));
  }
  const rest = complete.slice(i).join("") + held;
  return { units, rest };
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
