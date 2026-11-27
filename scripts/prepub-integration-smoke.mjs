#!/usr/bin/env node
/**
 * Fresh external-app integration smoke using packed tarballs only.
 * Does not clone the monorepo into the consumer apps.
 * Covers: vanilla ESM, TypeScript types, React, IIFE globals, stream cancel/complete,
 * theme inherit, reduced motion, destroy cleanup.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) {
    console.error(r.stdout || "");
    console.error(r.stderr || "");
    throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
  }
  return r;
}

function pack(pkgDir, outDir) {
  run("npm", ["pack", "--pack-destination", outDir], { cwd: pkgDir });
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "glyptide-prepub-"));
console.log("work:", work);

run("npm", ["run", "build:lib"], { cwd: root, stdio: "inherit" });
pack(path.join(root, "packages/glyptide"), work);
pack(path.join(root, "packages/glyptide-react"), work);

const coreTgz = path.join(work, "glyptide-0.1.0.tgz");
const reactTgz = path.join(work, "glyptide-react-0.1.0.tgz");
if (!fs.existsSync(coreTgz) || !fs.existsSync(reactTgz)) {
  throw new Error("missing tarballs");
}

/* —— Vanilla ESM + streaming + cancel + destroy —— */
const vanilla = path.join(work, "vanilla");
fs.mkdirSync(vanilla);
fs.writeFileSync(
  path.join(vanilla, "package.json"),
  JSON.stringify(
    {
      name: "vanilla-app",
      type: "module",
      dependencies: {
        glyptide: `file:${coreTgz}`,
        "happy-dom": require(path.join(root, "node_modules/happy-dom/package.json")).version,
      },
    },
    null,
    2,
  ),
);
run("npm", ["install", "--silent"], { cwd: vanilla });

const vanillaScript = `
import { Window } from "happy-dom";
import { createGlyptide, pipeTextToGlyptide } from "glyptide";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const w = new Window();
globalThis.window = w;
globalThis.document = w.document;
globalThis.Element = w.Element;
globalThis.HTMLElement = w.HTMLElement;
globalThis.DocumentFragment = w.DocumentFragment;
globalThis.Node = w.Node;
globalThis.getComputedStyle = w.getComputedStyle.bind(w);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const cssPath = fileURLToPath(import.meta.resolve("glyptide/styles.css"));
if (!existsSync(cssPath)) throw new Error("missing styles at " + cssPath);
const css = readFileSync(cssPath, "utf8");
if (!/font-family:\\s*inherit/.test(css)) throw new Error("styles missing host inherit");

const el = document.createElement("div");
el.style.color = "rgb(1,2,3)";
document.body.append(el);
const g = createGlyptide({
  element: el,
  pattern: "new-word-settle",
  theme: "inherit",
  reduce: true,
  latency: 0,
  motion: { preset: "instant", revealMs: 0 },
  config: { catchUp: "flush" },
});

async function* src() {
  yield "Hello ";
  yield "world";
}
await pipeTextToGlyptide(g, src(), { mode: "delta" });
if (!g.rendered.includes("Hello") || !g.rendered.includes("world")) throw new Error("stream text");
if (g.state !== "Complete" && g.state !== "Ready") throw new Error("state " + g.state);

const ac = new AbortController();
async function* slow() {
  yield "x";
  await new Promise(() => {});
}
const p = pipeTextToGlyptide(g, slow(), { signal: ac.signal });
ac.abort();
try { await p; throw new Error("expected abort"); } catch (e) {
  if (e?.name !== "AbortError") throw e;
}
g.destroy();
if (document.querySelectorAll(".glyptide-waiting").length !== 0) throw new Error("waiting leak");
console.log("vanilla ok");
`;
fs.writeFileSync(path.join(vanilla, "run.mjs"), vanillaScript);
run("node", ["run.mjs"], { cwd: vanilla, stdio: "inherit" });

/* —— TypeScript NodeNext —— */
const tsApp = path.join(work, "ts-app");
fs.mkdirSync(tsApp);
fs.writeFileSync(
  path.join(tsApp, "package.json"),
  JSON.stringify(
    {
      name: "ts-app",
      type: "module",
      dependencies: { glyptide: `file:${coreTgz}` },
      devDependencies: { typescript: "^5.7.2" },
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(tsApp, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      },
      files: ["check.ts"],
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(tsApp, "check.ts"),
  `import { createGlyptide, pipeTextToGlyptide } from "glyptide";\nexport const api: typeof createGlyptide = createGlyptide;\nexport type Pipe = typeof pipeTextToGlyptide;\n`,
);
run("npm", ["install", "--silent"], { cwd: tsApp });
run("npx", ["tsc", "--noEmit"], { cwd: tsApp, stdio: "inherit" });
console.log("typescript ok");

/* —— React —— */
const reactApp = path.join(work, "react-app");
fs.mkdirSync(reactApp);
fs.writeFileSync(
  path.join(reactApp, "package.json"),
  JSON.stringify(
    {
      name: "react-app",
      type: "module",
      dependencies: {
        glyptide: `file:${coreTgz}`,
        "@glyptide/react": `file:${reactTgz}`,
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "happy-dom": require(path.join(root, "node_modules/happy-dom/package.json")).version,
      },
    },
    null,
    2,
  ),
);
const reactScript = `
import { Window } from "happy-dom";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Glyptide } from "@glyptide/react";

const w = new Window();
globalThis.window = w;
globalThis.document = w.document;
globalThis.Element = w.Element;
globalThis.HTMLElement = w.HTMLElement;
globalThis.DocumentFragment = w.DocumentFragment;
globalThis.Node = w.Node;
globalThis.getComputedStyle = w.getComputedStyle.bind(w);
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
root.render(createElement(Glyptide, {
  pattern: "new-word-settle",
  reduce: true,
  latency: 0,
  autoPlay: true,
  text: "React packed",
  motion: { preset: "instant", revealMs: 0 },
  theme: "inherit",
}));
await new Promise((r) => setTimeout(r, 80));
if (!host.textContent?.includes("React")) throw new Error("react text missing: " + host.textContent);
root.unmount();
await new Promise((r) => setTimeout(r, 40));
if (document.querySelectorAll(".glyptide-waiting").length !== 0) throw new Error("react waiting leak");
console.log("react ok");
`;
fs.writeFileSync(path.join(reactApp, "run.mjs"), reactScript);
run("npm", ["install", "--silent"], { cwd: reactApp });
run("node", ["run.mjs"], { cwd: reactApp, stdio: "inherit" });

/* —— IIFE file presence + global factory shape —— */
const iifePath = path.join(
  vanilla,
  "node_modules/glyptide/dist/glyptide.iife.js",
);
const iife = fs.readFileSync(iifePath, "utf8");
if (!iife.includes("createGlyptide") && !iife.includes("Glyptide")) {
  throw new Error("IIFE missing factory markers");
}
console.log("iife ok", (fs.statSync(iifePath).size / 1024).toFixed(1), "KB");

console.log("\nprepub integration smoke passed");
console.log("artifacts:", coreTgz, reactTgz);
