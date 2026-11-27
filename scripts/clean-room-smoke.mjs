#!/usr/bin/env node
/**
 * Clean-room package smoke: pack tarballs, install into a temp project, import.
 * Asserts published contents exclude sourcemaps and website source.
 * Does not publish. Run after npm run build:lib.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreDir = path.join(root, "packages/glyptide");
const reactDir = path.join(root, "packages/glyptide-react");

if (!fs.existsSync(path.join(coreDir, "dist/index.js"))) {
  console.error("Build packages first: npm run build:lib");
  process.exit(1);
}

function pack(pkgDir) {
  // Write tarball into the package dir (npm pack default).
  execSync("npm pack", { cwd: pkgDir, stdio: "inherit" });
  const tgz = fs
    .readdirSync(pkgDir)
    .filter((f) => f.endsWith(".tgz"))
    .map((f) => ({ f, m: fs.statSync(path.join(pkgDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0]?.f;
  if (!tgz) throw new Error(`npm pack produced no tarball in ${pkgDir}`);
  return path.join(pkgDir, tgz);
}

function assertLeanTarball(tarball, label) {
  const listing = execSync(`tar -tzf "${tarball}"`, { encoding: "utf8" });
  const files = listing.split("\n").filter(Boolean);
  const maps = files.filter((f) => f.endsWith(".map"));
  const siteLeak = files.filter((f) => /\/site\/|playground|vite\.config/i.test(f));
  const srcLeak = files.filter((f) => /\/src\//.test(f));
  if (maps.length) {
    throw new Error(`${label}: sourcemaps must not ship (${maps.slice(0, 3).join(", ")})`);
  }
  if (siteLeak.length) {
    throw new Error(`${label}: website paths leaked into package`);
  }
  if (srcLeak.length) {
    throw new Error(`${label}: src/ must not ship (${srcLeak.slice(0, 3).join(", ")})`);
  }
  console.log(`${label}: ${files.length} files, no maps/src/site`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "glyptide-clean-"));
console.log("Clean room:", tmp);

let coreTgz;
let reactTgz;
try {
  coreTgz = pack(coreDir);
  assertLeanTarball(coreTgz, "glyptide");
  reactTgz = pack(reactDir);
  assertLeanTarball(reactTgz, "@glyptide/react");

  fs.writeFileSync(
    path.join(tmp, "package.json"),
    JSON.stringify(
      { name: "glyptide-clean-room", type: "module", private: true },
      null,
      2,
    ),
  );
  execSync(`npm install "${coreTgz}" "${reactTgz}"`, {
    cwd: tmp,
    stdio: "inherit",
  });

  const stylesPath = path.join(tmp, "node_modules/glyptide/dist/styles.css");
  if (!fs.existsSync(stylesPath) || fs.statSync(stylesPath).size < 100) {
    throw new Error("packaged styles.css missing or empty");
  }

  const probe = `
import { PATTERN_COUNT, resolveMotion, createStreamIngress } from "glyptide";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const engine = await import("glyptide/engine");
const react = await import("@glyptide/react");
if (!PATTERN_COUNT) throw new Error("missing patterns");
if (!resolveMotion().preset) throw new Error("motion");
if (typeof engine.makeEngine !== "function") throw new Error("engine entry missing");
if (!react.Glyptide && !react.default) throw new Error("react adapter missing export");
createStreamIngress();
const cjs = require("glyptide");
if (!cjs.PATTERN_COUNT) throw new Error("cjs import failed");
console.log("clean-room ok", PATTERN_COUNT, resolveMotion().preset);
`;
  fs.writeFileSync(path.join(tmp, "probe.mjs"), probe);
  execSync("node probe.mjs", { cwd: tmp, stdio: "inherit" });
  console.log("Clean-room smoke passed (external project, no monorepo clone required)");
} finally {
  for (const t of [coreTgz, reactTgz]) {
    if (t && fs.existsSync(t)) fs.unlinkSync(t);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
