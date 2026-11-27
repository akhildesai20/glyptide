# Glyptide 0.1.0 — Public preview

**Status:** draft for GitHub Releases — do **not** publish the release or tag until npm packages are published and verified.

Glyptide is a lightweight, model-independent text-motion library for generative UIs. It is a presentation layer: no provider SDKs, no API keys, no model calls.

## Highlights

- **96 patterns** across **six use cases** for streaming, insertion, rewriting, continuation, and structured output
- **Real and simulated streaming** — `beginStream` / `append` / `applySnapshot` / `finish`, or `pipeTextToGlyptide` with AbortSignal
- **Motion, appearance, and lifecycle** systems kept separate (transient · persistent · review-bound)
- **Vanilla JS, TypeScript, and React** (`glyptide` + `@glyptide/react`)
- **AI-friendly** integrator brief, `llms.txt`, pattern registry, JSON schemas, and Agent Skill
- **Accessibility & themes** — `prefers-reduced-motion`, theme inherit/light/dark/system
- **MIT** license · zero runtime dependencies in core

## Install (before public npm)

```bash
npm install ./packages/glyptide
# optional
npm install ./packages/glyptide-react
```

After public registry publication (see `docs/publication-status.json`):

```bash
npm install glyptide
npm install @glyptide/react
```

## Quick start

```js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  theme: "inherit",
});

g.start({ text: "Every word, intentionally in motion." });
```

## Documentation

- Integrator brief: `docs/ai-integrate.md`
- API / streaming / appearance docs in `docs/`
- Website (home · playground · docs · For AI) ships with this repository

## Known limitations

This is a **public preview**. It does not claim exhaustive cross-browser certification, universal design-system fit, or guaranteed end-to-end latency. Prefer documented public exports; do not depend on underscored test hooks or website source.

## Links

- Repository: https://github.com/akhildesai20/glyptide
- License: MIT
