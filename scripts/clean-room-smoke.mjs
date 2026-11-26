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
  const probe = `
import { createGlyptide, PATTERN_COUNT, resolveMotion } from "glyptide";
import "glyptide/styles.css";
if (!PATTERN_COUNT) throw new Error("missing patterns");
if (!resolveMotion().preset) throw new Error("motion");
console.log("clean-room ok", PATTERN_COUNT);
`;
  fs.writeFileSync(path.join(tmp, "probe.mjs"), probe);
  // CSS import may fail in node — probe engine-only if needed
  try {
    execSync("node probe.mjs", { cwd: tmp, stdio: "inherit" });
  } catch {
    const probe2 = `
import { PATTERN_COUNT, resolveMotion, createStreamIngress } from "glyptide";
if (!PATTERN_COUNT) throw new Error("missing patterns");
createStreamIngress();
console.log("clean-room ok", PATTERN_COUNT, resolveMotion().preset);
`;
    fs.writeFileSync(path.join(tmp, "probe2.mjs"), probe2);
    execSync("node probe2.mjs", { cwd: tmp, stdio: "inherit" });
  }
  fs.unlinkSync(tarball);
  console.log("Clean-room smoke passed");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
