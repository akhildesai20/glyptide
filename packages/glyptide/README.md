# glyptide

Thoughtful text-motion patterns for generative interfaces.  
**Presentation layer only** — no model calls, no API keys.

## Install

`glyptide@0.1.0` is **not on the public npm registry yet**. Install the built package path (or a packed tarball) — you do **not** need the website source:

```bash
# From a clone / CI artifact that already ran `npm run build:lib`:
npm install ./packages/glyptide

# Or pack once, then install the tarball in any project:
#   cd packages/glyptide && npm pack
#   npm install ./glyptide-0.1.0.tgz
```

React apps can also add `@glyptide/react` the same way from `./packages/glyptide-react`.

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

## Docs for humans & agents

Prefer published / generated docs over reading this monorepo’s `site/` app:

- Getting started · API · Streaming · Appearance (see repo `docs/` or the playground `/docs/*.md`)
- AI index: `/llms.txt` · full reference `/llms-full.txt` · registry `/registry/patterns.json`
- Minimal agent brief: `docs/ai-integrate.md`

## License

MIT
