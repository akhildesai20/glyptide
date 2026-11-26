#!/usr/bin/env node
/**
 * Generate docs/pattern-inventory.md from the registry + lifecycle helpers.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const patterns = JSON.parse(
  fs.readFileSync(
    path.join(root, "packages/glyptide/src/data/patterns.json"),
    "utf8",
  ),
);

const REVIEW = new Set(["ghost", "review", "diff", "worddiff", "addition"]);
const PIECE = new Set([
  "emphasis",
  "checkpoint",
  "guide",
  "rowAccent",
  "rowFocus",
  "ink",
  "gradientInk",
  "gradientHighlight",
  "gradientGlow",
  "gradientUnderline",
]);
const GENERATION = new Set([
  "color",
  "underline",
  "replacementInk",
  "mark",
  "linebar",
]);

function lifecycleFor(effect) {
  if (REVIEW.has(effect)) return { lifecycle: "review-bound", settlement: "accept" };
  if (effect === "heading") return { lifecycle: "persistent", settlement: "none" };
  if (PIECE.has(effect)) return { lifecycle: "transient", settlement: "piece" };
  if (GENERATION.has(effect)) return { lifecycle: "transient", settlement: "generation" };
  return { lifecycle: "transient", settlement: "generation" };
}

const lines = [
  "# Pattern inventory",
  "",
  `Generated from \`patterns.json\` (${patterns.length} patterns). Do not hand-edit — run \`node scripts/generate-pattern-inventory.mjs\`.`,
  "",
  "| ID | Name | Case | Kind | Effect | Lifecycle | Settlement |",
  "|----|------|------|------|--------|-----------|------------|",
];

for (const p of patterns) {
  const meta = lifecycleFor(p.effect);
  const life = p.appearanceLifecycle ?? meta.lifecycle;
  const settle = p.appearanceSettlement ?? meta.settlement;
  lines.push(
    `| \`${p.id}\` | ${p.name} | ${p.caseId} | ${p.kind} | ${p.effect} | ${life} | ${settle} |`,
  );
}

lines.push(
  "",
  "## Notes",
  "",
  "- Display names are not behavioral keys; engine branches use pattern ids via `pattern-flags.ts`.",
  "- Aesthetic colorMode never overrides lifecycle.",
  "- Reduced motion: registry e2e sweeps all ids with `reduce: true`.",
  "",
);

const out = path.join(root, "docs/pattern-inventory.md");
fs.writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out} (${patterns.length} patterns)`);
