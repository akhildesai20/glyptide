# Glyptide

**Thoughtful text motion for generative interfaces.**

Glyptide is a lightweight, model-independent presentation layer for streaming, inserting, rewriting, and transforming text in modern UIs. It never calls AI providers and needs no API keys.

> Every word, intentionally in motion.

**Maturity:** public preview (`0.1.0`) · **License:** MIT

## Website & documentation

| Resource | Link |
|----------|------|
| **Website** | https://glyptide.vercel.app |
| Playground | https://glyptide.vercel.app/playground/ |
| Docs | https://glyptide.vercel.app/docs/ |
| For AI | https://glyptide.vercel.app/for-ai.html |
| Repository | https://github.com/akhildesai20/glyptide |
| Integrator brief | [docs/ai-integrate.md](./docs/ai-integrate.md) · [live](https://glyptide.vercel.app/docs/ai-integrate.md) |
| API | [docs/api.md](./docs/api.md) |
| Streaming | [docs/streaming.md](./docs/streaming.md) |
| Appearance | [APPEARANCE.md](./APPEARANCE.md) |
| Publication status | [docs/publication-status.json](./docs/publication-status.json) |

## Installation

Prefer **package install** over cloning. Current install wording is generated from publication status — see [docs/publication-install.md](./docs/publication-install.md).

```bash
# From a clone after `npm run build:lib` (macOS / Linux / Windows):
npm install ./packages/glyptide

# Optional React adapter:
npm install ./packages/glyptide-react

# Or pack once, then install the tarball in any project:
#   cd packages/glyptide && npm pack
#   npm install ./glyptide-0.1.0.tgz
```

Requires **Node.js ≥ 18**. The library targets modern browsers (baseline evergreen). React adapter requires **React ≥ 18**.

> `glyptide@0.1.0` is **not on the public npm registry yet**. Do not treat registry install commands as live until `docs/publication-status.json` has `"npmPublished": true`.

## Minimal example

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

## Real streaming example

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
// Cancel anytime: ac.abort() — only the pipe’s session stops.
g.destroy(); // remove listeners / waiting chrome when unmounting
```

## Core capabilities

- **96 patterns** across **6 use cases** (new, insert, replace, continue, structured, …)
- Simulated playback *and* real streams (`append` / `applySnapshot` / `finish`, AbortSignal, events)
- Motion presets with pace / catch-up / flush delivery policies
- Appearance lifecycles: **transient · persistent · review-bound**
- Theme modes: `light` | `dark` | `system` | `inherit`
- Reduced-motion honor; review accept/discard
- Zero runtime dependencies; native CSS + Web Animations
- Optional React adapter (`@glyptide/react`)
- AI-native resources: `llms.txt`, registry JSON, schemas, Agent Skill

## Compatibility

| Environment | Support |
|-------------|---------|
| ESM / CommonJS / TypeScript (NodeNext) | Yes |
| Standalone browser IIFE (`glyptide/glyptide.iife.js`) | Yes |
| React 18+ | Via `@glyptide/react` |
| SSR | Module-init safe; attach to a DOM element in the client |

## AI-assisted integration

Start with **[docs/ai-integrate.md](./docs/ai-integrate.md)** only. Do not load `site/src` or engine internals to discover the API. Progressive docs: brief → API/streaming → `/registry/patterns.json` → `/llms-full.txt` last.

Portable skill: [`skills/glyptide/`](./skills/glyptide/).

## Repository structure

| Path | Role |
|------|------|
| `packages/glyptide` | Publishable core |
| `packages/glyptide-react` | Publishable React adapter |
| `docs/` | Human/agent docs |
| `skills/glyptide/` | Agent Skill |
| `examples/` | Offline recipes / provider notes |
| `site/` | Playground + docs website (**becomes public with the repo**; not a runtime dependency) |
| `prototype/` | Historical study — not production source of truth |

**Public API** lives in package exports (`createGlyptide`, stream helpers, patterns, presets, styles). Underscored test hooks and `site/` tooling are **not** supported public API.

## Contributor setup

```bash
git clone https://github.com/akhildesai20/glyptide.git
cd glyptide
npm install
npm run build:lib
npm run generate:ai-docs
npm run typecheck
npm test
npm run test:clean-room
npm run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md).

## Known limitations (preview)

- Public preview — not a guarantee of universal browser coverage or fixed latency budgets
- Pattern ids are stable; inventing ids throws `GlyptideConfigError`
- Snapshot streams replace on divergent / shrinking / empty payloads (see streaming docs)
- Showcase typography lives in the website; the runtime inherits host font metrics
- Website: https://glyptide.vercel.app (`docs/publication-status.json` → `websiteUrl`)

## License

MIT — see [LICENSE](./LICENSE).  
Icons on the website use [Lucide](https://lucide.dev) (ISC). The core packages ship no third-party icon/font assets.
