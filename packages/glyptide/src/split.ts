import type { BufferKind } from "./types";

type SegmenterLike = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (
    locales?: string | string[],
    options?: { granularity?: "grapheme" | "word" | "sentence" },
  ) => SegmenterLike & {
    segment: (input: string) => Iterable<{ segment: string; isWordLike?: boolean }>;
  };
};

function getSegmenter(
  granularity: "grapheme" | "sentence",
): SegmenterLike | null {
  const IntlRef = Intl as IntlWithSegmenter;
  if (typeof Intl === "undefined" || typeof IntlRef.Segmenter !== "function") {
    return null;
  }
  return new IntlRef.Segmenter(undefined, { granularity });
}

/**
 * Split text into reveal units. Uses Intl.Segmenter when available
 * for sentence and grapheme granularity; falls back for older browsers.
 */
export function splitText(text: string, kind: BufferKind): string[] {
  if (!text) return [];
  if (kind === "all") return [text];

  if (kind === "paragraph") {
    return text.match(/[\s\S]+?(?:\n\s*\n|$)/g) || [text];
  }

  if (kind === "line") {
    return text.match(/[^\n]*\n|[^\n]+$/g) || [];
  }

  if (kind === "sentence") {
    const segmenter = getSegmenter("sentence");
    if (segmenter) {
      return Array.from(segmenter.segment(text), (x) => x.segment);
    }
    return text.match(/[^.!?]+(?:[.!?]+\s*|$)|[.!?]+/g) || [];
  }

  // Prefer Intl word segmentation for CJK / scripts without spaces
  const wordSegmenter = (() => {
    const IntlRef = Intl as IntlWithSegmenter;
    if (typeof Intl === "undefined" || typeof IntlRef.Segmenter !== "function") {
      return null;
    }
    try {
      return new IntlRef.Segmenter(undefined, { granularity: "word" });
    } catch {
      return null;
    }
  })();

  const words = (() => {
    if (!wordSegmenter) return text.match(/\S+\s*|\s+/g) || [];
    const segs = Array.from(wordSegmenter.segment(text), (x) => x.segment);
    const out: string[] = [];
    for (const s of segs) {
      if (!s) continue;
      // Coalesce whitespace onto previous unit (Latin UX + CJK-safe words)
      if (/^\s+$/.test(s) && out.length) out[out.length - 1] += s;
      else out.push(s);
    }
    return out.length ? out : [text];
  })();
  if (kind === "word") return words;

  if (kind === "token") {
    const segmenter = getSegmenter("grapheme");
    const graphemes = segmenter
      ? Array.from(segmenter.segment(text), (x) => x.segment)
      : Array.from(text);
    const chunks: string[] = [];
    for (let i = 0; i < graphemes.length; i += 3) {
      chunks.push(graphemes.slice(i, i + 3).join(""));
    }
    return chunks;
  }

  // phrase: groups of ~4 words
  const phrases: string[] = [];
  for (let i = 0; i < words.length; i += 4) {
    phrases.push(words.slice(i, i + 4).join(""));
  }
  return phrases;
}
