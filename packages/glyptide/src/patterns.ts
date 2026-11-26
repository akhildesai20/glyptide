import casesData from "./data/cases.json";
import patternsData from "./data/patterns.json";
import type { CaseDefinition, CaseId, PatternDefinition } from "./types";

export const cases = casesData as CaseDefinition[];
export const patterns = patternsData as PatternDefinition[];

const byId = new Map(patterns.map((p) => [p.id, p]));
const byCase = new Map<CaseId, PatternDefinition[]>();

for (const p of patterns) {
  const list = byCase.get(p.caseId) ?? [];
  list.push(p);
  byCase.set(p.caseId, list);
}

/** Total registered patterns */
export const patternCount = patterns.length;

export function getPattern(id: string): PatternDefinition | undefined {
  return byId.get(id);
}

export function getPatternsByCase(caseId: CaseId): PatternDefinition[] {
  return byCase.get(caseId) ?? [];
}

export function getCase(caseId: CaseId): CaseDefinition | undefined {
  return cases.find((c) => c.id === caseId);
}

export function findPattern(
  caseId: CaseId,
  name: string,
): PatternDefinition | undefined {
  return patterns.find((p) => p.caseId === caseId && p.name === name);
}

export function searchPatterns(query: string): PatternDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return patterns;
  return patterns.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.effect.toLowerCase().includes(q) ||
      p.kind.toLowerCase().includes(q) ||
      (p.group && p.group.toLowerCase().includes(q)) ||
      p.caseId.includes(q),
  );
}

/** Slugify a pattern name the same way the registry was built */
export function patternId(caseId: string, name: string): string {
  return `${caseId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`;
}
