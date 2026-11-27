# glyptide

Thoughtful text-motion patterns for generative interfaces.  
**Presentation layer only** — no model calls, no API keys.

**Version:** 0.1.0 · **Maturity:** public preview · **License:** MIT  
**Website:** https://glyptide.vercel.app

## Install

```bash
npm install glyptide
```

React apps: also add `@glyptide/react`.

Requires **Node.js ≥ 18**. Modern evergreen browsers.

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

Real streams: `beginStream()` → `append` / `applySnapshot` / `finish`, or `pipeTextToGlyptide(..., { mode: "delta" | "snapshot" })`.

## Entry points

| Import | Purpose |
|--------|---------|
| `glyptide` | Full API + pattern registry |
| `glyptide/styles.css` | Required styles (side-effect import) |
| `glyptide/engine` | Lightweight engine without registry JSON |
| `glyptide/patterns` | Pattern catalog helpers |
| `glyptide/presets` | Appearance palette presets |
| `glyptide/glyptide.iife.js` | Browser IIFE build |

Unknown pattern ids throw `GlyptideConfigError` (never silently substituted).

Underscored test instrumentation (if present) is **not** part of the supported public API.

## Docs

- Website: https://glyptide.vercel.app
- Integrator brief: https://glyptide.vercel.app/docs/ai-integrate.md
- AI index: https://glyptide.vercel.app/llms.txt · registry https://glyptide.vercel.app/registry/patterns.json

## License

MIT
