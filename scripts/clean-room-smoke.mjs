#!/usr/bin/env node
/**
 * Clean-room package smoke: install built tarball into a temp dir and import.
 * Does not publish. Run after npm run build:lib.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = path.join(root, "packages/glyptide");

if (!fs.existsSync(path.join(pkgDir, "dist/index.js"))) {
  console.error("Build glyptide first: npm run build:lib");
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "glyptide-clean-"));
console.log("Clean room:", tmp);

try {
  execSync("npm pack", { cwd: pkgDir, stdio: "inherit" });
  const tgz = fs.readdirSync(pkgDir).find((f) => f.endsWith(".tgz"));
  if (!tgz) throw new Error("npm pack produced no tarball");
  const tarball = path.join(pkgDir, tgz);
  fs.writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify({ name: "glyptide-clean-room", type: "module", private: true }, null, 2),
  );
  execSync(`npm install "${tarball}"`, { cwd: tmp, stdio: "inherit" });
  // Node cannot load .css as ESM; assert the packaged stylesheet exists, then import JS.
  const stylesPath = path.join(tmp, "node_modules/glyptide/dist/styles.css");
  if (!fs.existsSync(stylesPath) || fs.statSync(stylesPath).size < 100) {
    throw new Error("packaged styles.css missing or empty");
  }
  const probe = `
import { PATTERN_COUNT, resolveMotion, createStreamIngress } from "glyptide";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const engine = await import("glyptide/engine");
if (!PATTERN_COUNT) throw new Error("missing patterns");
if (!resolveMotion().preset) throw new Error("motion");
if (typeof engine.makeEngine !== "function") throw new Error("engine entry missing");
createStreamIngress();
// CJS require path
const cjs = require("glyptide");
if (!cjs.PATTERN_COUNT) throw new Error("cjs import failed");
console.log("clean-room ok", PATTERN_COUNT, resolveMotion().preset);
`;
  fs.writeFileSync(path.join(tmp, "probe.mjs"), probe);
  execSync("node probe.mjs", { cwd: tmp, stdio: "inherit" });
  fs.unlinkSync(tarball);
  console.log("Clean-room smoke passed");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
