#!/usr/bin/env node
/**
 * One-shot distribution size report (raw / gzip / brotli / packed / unpacked).
 * Not part of the publish surface — local/CI reporting only.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kb = (n) => `${(n / 1024).toFixed(2)} KB`;

function row(file, raw, gzip, brotli) {
  console.log(
    `  ${file.padEnd(22)} ${String(raw).padStart(10)} ${String(gzip).padStart(10)} ${String(brotli).padStart(10)}   ${kb(raw).padStart(10)} ${kb(gzip).padStart(10)} ${kb(brotli).padStart(10)}`,
  );
}

function reportDist(label, dir, files) {
  console.log(`\n${label}`);
  console.log(
    `  ${"file".padEnd(22)} ${"raw_B".padStart(10)} ${"gzip_B".padStart(10)} ${"brotli_B".padStart(10)}   ${"raw".padStart(10)} ${"gzip".padStart(10)} ${"brotli".padStart(10)}`,
  );
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    const gz = zlib.gzipSync(buf, { level: 9 });
    const br = zlib.brotliCompressSync(buf);
    row(f, buf.length, gz.length, br.length);
  }
}

function packInfo(pkgDir, name) {
  const out = execSync("npm pack --dry-run --json", {
    cwd: pkgDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const j = JSON.parse(out);
  const info = Array.isArray(j) ? j[0] : j;
  console.log(
    `  ${name}: packed=${info.size} B (${kb(info.size)}), unpacked=${info.unpackedSize} B (${kb(info.unpackedSize)}), files=${info.entryCount ?? info.filename}`,
  );
}

reportDist("glyptide dist (built ESM/CJS/IIFE/CSS — already minified by tsup)", path.join(root, "packages/glyptide/dist"), [
  "index.js",
  "index.cjs",
  "patterns.js",
  "presets.js",
  "glyptide.iife.js",
  "styles.css",
  "engine.js",
]);

reportDist("@glyptide/react dist", path.join(root, "packages/glyptide-react/dist"), [
  "index.js",
  "index.cjs",
]);

console.log("\nnpm pack (distributable tarball)");
packInfo(path.join(root, "packages/glyptide"), "glyptide@0.1.0");
packInfo(path.join(root, "packages/glyptide-react"), "@glyptide/react@0.1.0");
console.log(
  "\nNote: dist JS/CSS from tsup is the published minified form; no separate unminified ship artifacts.",
);
