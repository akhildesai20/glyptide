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
  execSync(`npm install "${coreTgz}" "${reactTgz}" happy-dom react react-dom`, {
    cwd: tmp,
    stdio: "inherit",
  });

  const stylesPath = path.join(tmp, "node_modules/glyptide/dist/styles.css");
  if (!fs.existsSync(stylesPath) || fs.statSync(stylesPath).size < 100) {
    throw new Error("packaged styles.css missing or empty");
  }

  // Metadata / secrets / license checks on packed package.json
  const corePkg = JSON.parse(
    fs.readFileSync(path.join(tmp, "node_modules/glyptide/package.json"), "utf8"),
  );
  const reactPkg = JSON.parse(
    fs.readFileSync(
      path.join(tmp, "node_modules/@glyptide/react/package.json"),
      "utf8",
    ),
  );
  for (const [label, pkg] of [
    ["glyptide", corePkg],
    ["@glyptide/react", reactPkg],
  ]) {
    if (!pkg.license || String(pkg.license).toUpperCase() !== "MIT") {
      throw new Error(`${label}: expected MIT license`);
    }
    if (!pkg.repository?.url?.includes("akhildesai20/glyptide")) {
      throw new Error(`${label}: repository URL missing or wrong`);
    }
    if (pkg.private) throw new Error(`${label}: must not be private for publish`);
    const dump = JSON.stringify(pkg);
    if (/(_authToken|npm_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/.test(dump)) {
      throw new Error(`${label}: secret-like string in package.json`);
    }
  }
  for (const rel of ["LICENSE", "README.md"]) {
    if (!fs.existsSync(path.join(tmp, "node_modules/glyptide", rel))) {
      throw new Error(`glyptide missing ${rel}`);
    }
  }
  if (!fs.existsSync(path.join(tmp, "node_modules/@glyptide/react/LICENSE"))) {
    throw new Error("@glyptide/react missing LICENSE");
  }

  const probe = `
import { Window } from "happy-dom";
import {
  PATTERN_COUNT,
  resolveMotion,
  createStreamIngress,
  createGlyptide,
  createIncrementalSplitter,
  GlyptideConfigError,
} from "glyptide";
import { createRequire } from "node:module";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Glyptide } from "@glyptide/react";

const require = createRequire(import.meta.url);
const engine = await import("glyptide/engine");
if (!PATTERN_COUNT) throw new Error("missing patterns");
if (!resolveMotion().preset) throw new Error("motion");
if (typeof engine.makeEngine !== "function") throw new Error("engine entry missing");
createStreamIngress();
const cjs = require("glyptide");
if (!cjs.PATTERN_COUNT) throw new Error("cjs import failed");

// Grapheme hold (packed build)
const splitter = createIncrementalSplitter("token");
const family = "👨‍👩‍👧‍👦";
for (const cp of [...family]) {
  if (splitter.push(cp).length) throw new Error("ZWJ mid-cluster emit in packed build");
}
if (splitter.flush().join("") !== family) throw new Error("ZWJ flush mismatch");

// Vanilla DOM integration (happy-dom must own HTMLElement for instanceof checks)
const win = new Window({ url: "https://example.test/" });
globalThis.window = win;
globalThis.document = win.document;
globalThis.HTMLElement = win.HTMLElement;
globalThis.Element = win.Element;
globalThis.Node = win.Node;
globalThis.getComputedStyle = win.getComputedStyle.bind(win);
globalThis.requestAnimationFrame = win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame = win.cancelAnimationFrame.bind(win);
const host = win.document.createElement("div");
win.document.body.append(host);
const g = createGlyptide({
  element: host,
  pattern: "new-word-settle",
  reduce: true,
  latency: 0,
  motion: { preset: "instant", revealMs: 0 },
});
try {
  createGlyptide({ element: host, pattern: "not-a-real-pattern" });
  throw new Error("expected GlyptideConfigError");
} catch (e) {
  if (!(e instanceof GlyptideConfigError)) throw e;
}
const session = g.beginStream();
g.append("Hello from packed vanilla.", session);
g.finish(session);
if (!g.rendered.includes("Hello from packed vanilla")) {
  throw new Error("vanilla render failed: " + g.rendered);
}
g.destroy();

// React adapter mount/unmount
const rootEl = win.document.createElement("div");
win.document.body.append(rootEl);
const root = createRoot(rootEl);
await new Promise((resolve, reject) => {
  try {
    root.render(createElement(Glyptide, {
      pattern: "new-word-settle",
      reduce: true,
      autoPlay: false,
      text: "React packed mount",
      motion: { preset: "instant", revealMs: 0 },
      latency: 0,
    }));
    setTimeout(() => {
      try {
        root.unmount();
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 30);
  } catch (err) {
    reject(err);
  }
});

console.log("clean-room ok", PATTERN_COUNT, resolveMotion().preset, "vanilla+react");
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
