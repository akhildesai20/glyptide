import fs from "fs";
import path from "path";
import zlib from "zlib";

const root = path.resolve("packages/glyptide/dist");
const files = [
  "index.js",
  "index.cjs",
  "patterns.js",
  "presets.js",
  "glyptide.iife.js",
  "styles.css",
  "engine.js",
];

/**
 * Gzip baselines (bytes) after Phase 1–2 modularization.
 * Fail CI if gzip grows > +10% vs these values. Remeasure with `npm run size`.
 */
/** Gzip baselines (bytes) after streaming/isolation/validation hardening. */
const GZIP_BUDGETS = {
  "index.js": 30998,
  "glyptide.iife.js": 26151,
  "styles.css": 2443,
  "patterns.js": 9636,
  "engine.js": 15346,
};

const FAIL_PCT = 0.1;
const failBudgets = process.argv.includes("--check-budgets");

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

console.log("Glyptide bundle sizes\n");
console.log(
  `  ${"file".padEnd(22)} ${"raw".padStart(10)} ${"gzip".padStart(10)} ${"brotli".padStart(10)}`,
);

let total = 0;
let failed = false;

for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.log(`  ${f.padEnd(22)} missing`);
    continue;
  }
  const buf = fs.readFileSync(p);
  const gz = zlib.gzipSync(buf, { level: 9 });
  let brLen = 0;
  try {
    brLen = zlib.brotliCompressSync(buf).length;
  } catch {
    brLen = 0;
  }
  total += buf.length;
  console.log(
    `  ${f.padEnd(22)} ${kb(buf.length).padStart(10)} ${kb(gz.length).padStart(10)} ${brLen ? kb(brLen).padStart(10) : "".padStart(10)}`,
  );

  const budget = GZIP_BUDGETS[f];
  if (failBudgets && budget != null && gz.length > budget * (1 + FAIL_PCT)) {
    console.error(
      `  BUDGET FAIL ${f}: gzip ${gz.length} > ${Math.floor(budget * (1 + FAIL_PCT))} (+10% of ${budget})`,
    );
    failed = true;
  }
}

console.log(`\n  ${kb(total).padStart(10)}  total raw listed`);
if (failBudgets && failed) process.exit(1);
