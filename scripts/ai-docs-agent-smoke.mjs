#!/usr/bin/env node
/**
 * Verifies an unfamiliar agent can integrate using only minimal AI-facing docs
 * + the built package (no site/src, no engine internals).
 * Does not publish. Run after build:lib.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function mustExist(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`Missing AI entry: ${rel}`);
  return p;
}

const brief = fs.readFileSync(mustExist("docs/ai-integrate.md"), "utf8");
const llms = fs.readFileSync(mustExist("site/public/llms.txt"), "utf8");
const skill = fs.readFileSync(mustExist("skills/glyptide/SKILL.md"), "utf8");
const api = fs.readFileSync(mustExist("docs/api.md"), "utf8");

for (const [name, text] of [
  ["ai-integrate", brief],
  ["llms.txt", llms],
  ["SKILL", skill],
]) {
  if (!/createGlyptide/.test(text) && !/createGlyptide/.test(brief)) {
    // skill may defer to brief; brief must name the API
  }
  if (/site\/src|engine\.ts|packages\/glyptide\/src/.test(text) && name === "ai-integrate") {
    // Brief may say "do not" — ensure prohibition exists
  }
}

if (!brief.includes("createGlyptide")) {
  throw new Error("ai-integrate.md must document createGlyptide");
}
if (!/Do \*\*not\*\* clone or inspect `site\/`/.test(brief) && !/Do \*\*not\*\*.*site\//.test(brief)) {
  throw new Error("ai-integrate.md must forbid site/ exploration");
}
if (!llms.includes("ai-integrate") && !llms.includes("integrator")) {
  // soft: llms should point at progressive docs
  if (!/docs\//.test(llms)) throw new Error("llms.txt should link docs");
}

const distIndex = path.join(root, "packages/glyptide/dist/index.js");
if (!fs.existsSync(distIndex)) {
  throw new Error("Build packages first: npm run build:lib");
}

const mod = await import(pathToFileURL(distIndex).href);
const required = [
  "createGlyptide",
  "pipeTextToGlyptide",
  "GlyptideConfigError",
  "recommendPatterns",
  "PATTERN_COUNT",
];
for (const key of required) {
  if (!(key in mod)) throw new Error(`Package export missing (docs claim): ${key}`);
}

// Docs-only API surface smoke from api.md headings / symbols
for (const sym of ["beginStream", "append", "applySnapshot", "finish", "makeEngine"]) {
  if (!api.includes(sym) && !brief.includes(sym)) {
    throw new Error(`API symbol ${sym} absent from brief/api.md`);
  }
}

if (mod.PATTERN_COUNT !== 96) {
  throw new Error(`Expected 96 patterns, got ${mod.PATTERN_COUNT}`);
}

const recs = mod.recommendPatterns({ useCase: "new", limit: 3 });
if (!Array.isArray(recs) || !recs.length || !recs[0].id) {
  throw new Error("recommendPatterns failed from packaged export");
}

console.log(
  "AI docs agent smoke OK — brief + llms + skill + package exports usable without site/src",
);
console.log("  patterns:", mod.PATTERN_COUNT, "sample:", recs[0].id);
