# Glyptide — AI / integrator brief

**Minimal entry for coding agents and AI-assisted builders.**  
Read this first. Fetch other docs only when the task needs them.

## What it is

Glyptide is a **presentation layer** for generative text UIs (stream, insert, rewrite, continue, structure). It does **not** call models and needs **no API keys**.

**Website:** https://glyptide.vercel.app (playground · docs · [For AI](https://glyptide.vercel.app/for-ai.html) · [llms.txt](https://glyptide.vercel.app/llms.txt))

## Do not

- Do **not** clone or inspect `site/` (playground website source) to learn the API.
- Do **not** reimplement motion by reading `packages/glyptide/src/engine.ts` unless debugging the library itself.
- Do **not** invent pattern ids, npm install targets, or APIs absent from docs / registry.
- Do **not** load `llms-full.txt` or the full pattern inventory unless you need exhaustive ids.

## Install (consumer project)

Install wording is driven by [`publication-status.json`](./publication-status.json) (see also [`publication-install.md`](./publication-install.md)).

While `"npmPublished": false`, install a built package path or tarball:

```bash
# From a built clone (relative paths work on Windows / macOS / Linux):
npm install ./packages/glyptide
# optional React adapter:
npm install ./packages/glyptide-react
```

Cloning the monorepo is for **contributors** (and to run `npm run build:lib` / pack). App builders only need the package. Do **not** treat registry install commands as live until publication status flips.

## Integrate

```js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle", // unknown ids throw GlyptideConfigError
  theme: "inherit",
});
```

Streams: `beginStream` → `append` / `applySnapshot` / `finish`, or `pipeTextToGlyptide(instance, source, { mode: "delta" | "snapshot", signal? })` (exported from `"glyptide"`).  
`pipeTextToGlyptide` resolves when the **source** ends — listen for `settled` / `complete` (or poll `state`) if you need visual settlement.  
`import "glyptide/styles.css"` is for browsers/bundlers (not plain Node).  
Lightweight (no registry JSON): `import { makeEngine } from "glyptide/engine"`.

## Progressive docs (fetch on demand)

| Need | Open |
|------|------|
| Install + first call | `docs/getting-started.md` or `/docs/getting-started.md` |
| Options & methods | `docs/api.md` |
| Live streams | `docs/streaming.md` |
| Pick a pattern | `recommendPatterns({ useCase })` or `/registry/patterns.json` |
| Paint / presets | `APPEARANCE.md` / `/docs/appearance.md` |
| Index of links | `/llms.txt` |
| Exhaustive reference | `/llms-full.txt` (large — last resort) |
| Agent skill | `skills/glyptide/SKILL.md` |

## Concerns to keep separate

**Pattern** · **Motion** · **Appearance** · **Lifecycle**  
Transient appearance must clear to **inherited** host styles. Honor `prefers-reduced-motion`.
