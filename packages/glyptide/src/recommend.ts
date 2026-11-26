import { appearanceCapabilities, defaultAppearanceConfig } from "./appearance";
import { appearanceLifecycleFor } from "./lifecycle";
import { getPatternsByCase, patterns } from "./patterns";
import type {
  AppearanceConfig,
  BufferKind,
  CaseId,
  PatternDefinition,
} from "./types";

export type RecommendUseCase = CaseId;
export type RecommendContentType =
  | "prose"
  | "code"
  | "list"
  | "table"
  | "checklist"
  | "outline"
  | "quote"
  | "mixed";

export interface RecommendInput {
  /** Generation use case */
  useCase: RecommendUseCase;
  /** Content shape (helps structured filtering) */
  contentType?: RecommendContentType;
  /** Prefer calm reading over decorative motion */
  readingComfort?: "high" | "medium" | "low";
  /** Prefer layout-stable patterns */
  layoutStability?: "high" | "medium" | "low";
  /** Prefer review before commit */
  needsReview?: boolean;
  /** Prefer streaming word/phrase cadence */
  streaming?: boolean;
  /** Limit results */
  limit?: number;
}

export interface PatternRecommendation {
  id: string;
  name: string;
  caseId: CaseId;
  kind: BufferKind;
  score: number;
  reasons: string[];
  appearanceLifecycle: ReturnType<typeof appearanceLifecycleFor>;
  appearanceCapabilities: ReturnType<typeof appearanceCapabilities>;
  defaultAppearance: AppearanceConfig;
  documentationRef: string;
}

function structuredGroupMatch(
  p: PatternDefinition,
  contentType: RecommendContentType | undefined,
): boolean {
  if (!contentType || contentType === "mixed" || contentType === "prose") return true;
  const g = (p.group || "").toLowerCase();
  switch (contentType) {
    case "code":
      return g === "code" || /code/i.test(p.name);
    case "list":
      return g === "lists" || /list/i.test(p.name);
    case "table":
      return g === "data" || /data|table/i.test(p.name);
    case "checklist":
      return g === "checklists" || /checklist/i.test(p.name);
    case "outline":
      return g === "outlines" || /outline/i.test(p.name);
    case "quote":
      return g === "quotes" || /quote/i.test(p.name);
    default:
      return true;
  }
}

function scorePattern(p: PatternDefinition, input: RecommendInput): {
  score: number;
  reasons: string[];
} {
  let score = 10;
  const reasons: string[] = [];

  if (p.caseId !== input.useCase) return { score: -1, reasons: [] };

  reasons.push(`Matches use case “${input.useCase}”.`);

  const reviewEffects = new Set([
    "ghost",
    "review",
    "diff",
    "worddiff",
    "addition",
  ]);
  const isReview = reviewEffects.has(p.effect);

  if (input.needsReview === true) {
    if (isReview) {
      score += 25;
      reasons.push("Supports explicit accept/discard review.");
    } else {
      score -= 15;
    }
  } else if (input.needsReview === false && isReview) {
    score -= 10;
  }

  if (input.streaming !== false) {
    if (p.kind === "all") {
      score -= 8;
      reasons.push("Buffers fully before reveal — less live streaming feel.");
    } else if (p.kind === "word" || p.kind === "phrase" || p.kind === "token") {
      score += 8;
      reasons.push(`Streams by ${p.kind}.`);
    }
  } else if (p.kind === "all") {
    score += 10;
    reasons.push("Atomic reveal preferred when streaming is not required.");
  }

  if (input.readingComfort === "high") {
    if (["spring", "fade", "none", "wipe"].includes(p.effect)) {
      score += 12;
      reasons.push("Restrained motion suited to reading.");
    }
    if (p.effect.startsWith("gradient") || p.effect === "emphasis") {
      score -= 6;
    }
  }

  if (input.layoutStability === "high") {
    if (["block", "all"].includes(p.kind) || p.effect === "block") {
      score += 8;
      reasons.push("Favors coherent block delivery.");
    }
    if (p.effect === "spring" && p.kind === "word") {
      score -= 4;
    }
  }

  if (!structuredGroupMatch(p, input.contentType)) {
    score -= 40;
  } else if (input.contentType && input.useCase === "structured") {
    score += 10;
    reasons.push(`Aligned with ${input.contentType} structured content.`);
  }

  // Prefer well-known defaults slightly
  if (p.id === "new-word-settle" || p.id === "insert-marked-insertion") {
    score += 3;
  }

  return { score, reasons };
}

/**
 * Deterministic pattern recommendations from curated metadata rules.
 * No network / LLM required.
 */
export function recommendPatterns(
  input: RecommendInput,
): PatternRecommendation[] {
  const limit = input.limit ?? 5;
  const pool =
    input.useCase != null ? getPatternsByCase(input.useCase) : patterns;

  const ranked = pool
    .map((p) => {
      const { score, reasons } = scorePattern(p, input);
      return { p, score, reasons };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id))
    .slice(0, limit);

  return ranked.map(({ p, score, reasons }) => {
    const appearanceLifecycle = appearanceLifecycleFor(
      p.effect,
      p.caseId,
      p.name,
    );
    const caps = appearanceCapabilities(p.effect, p.caseId, p.name);
    return {
      id: p.id,
      name: p.name,
      caseId: p.caseId,
      kind: p.kind,
      score,
      reasons,
      appearanceLifecycle,
      appearanceCapabilities: caps,
      defaultAppearance: defaultAppearanceConfig(p.effect, p.caseId, p.name),
      documentationRef: `#pattern-${p.id}`,
    };
  });
}
