import fs from "fs";
import path from "path";

const root = path.resolve("packages/glyptide/dist");
const files = [
  "index.js",
  "index.cjs",
  "patterns.js",
  "presets.js",
  "glyptide.iife.js",
  "styles.css",
];

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

console.log("Glyptide bundle sizes\n");
let total = 0;
for (const f of files) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) {
    console.log(`  missing  ${f}`);
    continue;
  }
  const size = fs.statSync(p).size;
  total += size;
  console.log(`  ${kb(size).padStart(8)}  ${f}`);
}
console.log(`\n  ${kb(total).padStart(8)}  total listed`);
