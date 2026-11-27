# Glyptide

[![CI](https://github.com/akhildesai20/glyptide/actions/workflows/ci.yml/badge.svg)](https://github.com/akhildesai20/glyptide/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/glyptide.svg)](https://www.npmjs.com/package/glyptide)
[![npm downloads](https://img.shields.io/npm/dm/glyptide.svg)](https://www.npmjs.com/package/glyptide)
[![license](https://img.shields.io/npm/l/glyptide.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white)](./packages/glyptide)
[![deps](https://img.shields.io/badge/runtime%20deps-0-success)](./packages/glyptide/package.json)

**Thoughtful text motion for generative interfaces.**

Glyptide is a lightweight, model-independent presentation layer for streaming, inserting, rewriting, and transforming text in modern UIs. It never calls AI providers and needs no API keys.

> Every word, intentionally in motion.

**Public preview** `0.1.0` · **MIT**

<!--
  GitHub README hero (optional): add docs/media/github-hero.png when ready.
  Specs and replacement steps: docs/BRANDING.md
  Do not uncomment an <img> until the file exists.
-->

**[Website](https://glyptide.vercel.app)** ·
**[Playground](https://glyptide.vercel.app/playground/)** ·
**[Docs](https://glyptide.vercel.app/docs/)** ·
**[For AI](https://glyptide.vercel.app/for-ai.html)** ·
[npm](https://www.npmjs.com/package/glyptide) ·
[GitHub](https://github.com/akhildesai20/glyptide)

## Install

```bash
npm install glyptide

# Optional React adapter
npm install @glyptide/react
```

Requires **Node.js ≥ 18**. Modern evergreen browsers. React adapter needs **React ≥ 18**.

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [React](#react)
- [Streaming](#streaming)
- [What it does](#what-it-does)
- [Use cases](#use-cases)
- [Bundle size](#bundle-size)
- [Compatibility](#compatibility)
- [Accessibility](#accessibility)
- [AI-assisted integration](#ai-assisted-integration)
- [Repository](#repository)
- [Known limitations](#known-limitations)
- [Inspiration](#inspiration)
- [License](#license)

## Quick start

```js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  theme: "inherit",
});

g.start({ text: "Thoughtful motion makes interfaces feel alive." });
```

## React

```tsx
import { Glyptide } from "@glyptide/react";
import "glyptide/styles.css";

export function StreamView() {
  return (
    <Glyptide
      pattern="new-word-settle"
      theme="inherit"
      text="Thoughtful motion for generative UIs."
      autoPlay
    />
  );
}
```

Imperative streams use the ref handle: `beginStream` → `append` / `finish`. See [`@glyptide/react`](./packages/glyptide-react/README.md).

## Streaming

```js
import { createGlyptide, pipeTextToGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  theme: "inherit",
  reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
});

async function* deltas() {
  yield "Streaming ";
  yield "with ";
  yield "Glyptide.";
}

const ac = new AbortController();
await pipeTextToGlyptide(g, deltas(), { signal: ac.signal, mode: "delta" });
g.destroy();
```

## What it does

| Capability | Detail |
|------------|--------|
| **96 patterns** | Curated motion for generative text surfaces |
| **Real + simulated streams** | `append` / `applySnapshot` / `finish`, or `pipeTextToGlyptide` |
| **Motion policies** | pace · catchUp · flush |
| **Appearance lifecycles** | transient · persistent · review-bound |
| **Themes** | `light` \| `dark` \| `system` \| `inherit` |
| **Zero runtime deps** | Native CSS + Web Animations |
| **AI-native docs** | `llms.txt`, registry JSON, schemas, Agent Skill |

## Use cases

| Use case | When to reach for it |
|----------|----------------------|
| **New response** | Empty answer surface becomes readable as text arrives |
| **Insert** | Place new text into existing prose |
| **Replace / rewrite** | Propose edits with review chrome |
| **Continue** | Extend writing without rewriting the prefix |
| **Structured** | Lists, headings, and code-shaped streams |

Try them live in the [Playground](https://glyptide.vercel.app/playground/) and [recipes](https://glyptide.vercel.app/#recipes).

### Visual demos

Optimized animation captures for the README will live under `docs/media/` once branded assets are ready (see [docs/BRANDING.md](./docs/BRANDING.md)). Until then, use the [live playground](https://glyptide.vercel.app/playground/).

## Bundle size

Measured from the built `glyptide` package (`npm run size`). Values are **minified file sizes** (raw), then **gzip** and **Brotli**. Packed npm tarball size is separate (~185 KB for `glyptide@0.1.0`).

| Entry | Minified | gzip | Brotli |
|-------|---------|:----:|:------:|
| `index.js` (full API + registry) | 179.0 KB | 34.2 KB | 27.7 KB |
| `engine.js` (no registry JSON) | 75.7 KB | 18.4 KB | 15.9 KB |
| `glyptide.iife.js` | 124.6 KB | 28.2 KB | 23.2 KB |
| `styles.css` | 12.7 KB | 2.3 KB | 2.0 KB |
| `patterns.js` | 77.0 KB | 9.4 KB | 6.8 KB |

Prefer `glyptide/engine` when you do not need the full pattern registry in the client bundle.

## Compatibility

| Environment | Support |
|-------------|---------|
| ESM / CommonJS / TypeScript (NodeNext) | Yes |
| Standalone browser IIFE | Yes |
| React 18+ | `@glyptide/react` |
| SSR | Module-init safe; attach to a DOM element on the client |

## Accessibility

- Honors `prefers-reduced-motion`
- Transient paint settles to **inherited** host styles
- Prefer announcing completion / review readiness, not every token
- Review-bound patterns stay until Accept / Discard

## AI-assisted integration

Start with **[docs/ai-integrate.md](./docs/ai-integrate.md)** (or [live](https://glyptide.vercel.app/docs/ai-integrate.md)). Do not scrape `site/src` for the API.

- [llms.txt](https://glyptide.vercel.app/llms.txt) · [For AI](https://glyptide.vercel.app/for-ai.html)
- Skill: [`skills/glyptide/`](./skills/glyptide/)

## Repository

| Path | Role |
|------|------|
| `packages/glyptide` | Publishable core |
| `packages/glyptide-react` | Publishable React adapter |
| `docs/` | Human/agent docs |
| `site/` | Website (not a runtime dependency) |

**Public API** = package exports. Underscored test hooks are unsupported.

```bash
git clone https://github.com/akhildesai20/glyptide.git
cd glyptide && npm install && npm run build:lib && npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Known limitations

- Public preview — not a guarantee of universal browser coverage or fixed latency
- Unknown pattern ids throw `GlyptideConfigError`
- Snapshot streams **replace** on divergent / shrinking / empty payloads
- Showcase typography is website-only; runtime inherits host fonts

## Inspiration

Inspired by [Generative Loaders](https://github.com/kasturibuilds/generative-loaders).

## License

MIT — [LICENSE](./LICENSE).  
Website icons: [Lucide](https://lucide.dev) (ISC). Core packages ship no third-party icon/font assets.
