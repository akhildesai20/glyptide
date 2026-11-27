#!/usr/bin/env node
/**
 * Approximate token footprint of AI-facing integration resources.
 * Heuristic: tokens ≈ ceil(chars / 4). Not a model tokenizer.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  ["minimal", "docs/ai-integrate.md"],
  ["skill", "skills/glyptide/SKILL.md"],
  ["llms", "site/public/llms.txt"],
  ["agents", "AGENTS.md"],
  ["api", "docs/api.md"],
  ["streaming", "docs/streaming.md"],
  ["design", "design.md"],
  ["llms-full", "site/public/llms-full.txt"],
  ["pkg-readme", "packages/glyptide/README.md"],
];

function tokens(chars) {
  return Math.ceil(chars / 4);
}

const rows = [];
for (const [label, rel] of FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    rows.push({ label, rel, chars: 0, tokens: 0, missing: true });
    continue;
  }
  const chars = fs.readFileSync(abs, "utf8").length;
  rows.push({ label, rel, chars, tokens: tokens(chars), missing: false });
}

const minimal = rows.find((r) => r.label === "minimal");
const stack = ["minimal", "skill", "llms", "pkg-readme"]
  .map((l) => rows.find((r) => r.label === l))
  .filter(Boolean);
const stackTokens = stack.reduce((s, r) => s + r.tokens, 0);
const full = rows.find((r) => r.label === "llms-full");

console.log("AI context footprint (approx tokens ≈ chars/4)\n");
for (const r of rows) {
  const flag = r.missing ? " MISSING" : "";
  console.log(
    `${r.label.padEnd(12)} ${String(r.tokens).padStart(6)} tok  ${String(r.chars).padStart(7)} B  ${r.rel}${flag}`,
  );
}
console.log(
  `\nRecommended first load (brief+skill+llms+pkg README): ~${stackTokens} tokens`,
);
if (minimal && full) {
  console.log(
    `vs llms-full alone: ~${full.tokens} tokens (avoid unless exhaustive ids needed)`,
  );
  console.log(
    `Savings vs full dump: ~${Math.max(0, full.tokens - stackTokens)} tokens`,
  );
}
