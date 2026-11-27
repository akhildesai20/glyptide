# Glyptide

**Thoughtful text motion for generative interfaces.**

An open-source library of carefully crafted text-generation, insertion, rewriting, and transformation patterns for modern UIs.

> Every word, intentionally in motion.

## Use the library (preferred)

You do **not** need to understand or ship the website source to use Glyptide.

`glyptide@0.1.0` is **not on the public npm registry yet**. Install a **built package** (or tarball) into your app:

```bash
# From a clone after `npm run build:lib` (paths work on macOS, Linux, and Windows):
npm install ./packages/glyptide

# Optional React adapter:
npm install ./packages/glyptide-react

# Or pack once, then install anywhere without the rest of the tree:
#   cd packages/glyptide && npm pack
#   npm install ./glyptide-0.1.0.tgz
```

Requires **Node.js ≥ 18** and **npm** (this repo uses npm workspaces + `package-lock.json`).

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

Real streams: `append` / `finish` or `pipeTextToGlyptide`. See [docs/ai-integrate.md](./docs/ai-integrate.md) (agents) and [docs/api.md](./docs/api.md).

Package entry points: `glyptide`, `glyptide/styles.css`, `glyptide/engine`, `glyptide/patterns`, `glyptide/presets`, IIFE build.

## What’s in this monorepo

| Path | Audience | Role |
|------|----------|------|
| [`packages/glyptide`](./packages/glyptide) | **App builders** | Core library (install this) |
| [`packages/glyptide-react`](./packages/glyptide-react) | React apps | Thin adapter |
| [`docs/`](./docs) | Humans & agents | API, streaming, integrator brief |
| [`skills/glyptide/`](./skills/glyptide) | Coding agents | Portable Agent Skill |
| [`examples/`](./examples) | Learners | Offline recipes / provider notes |
| [`site/`](./site) | **Contributors** | Playground + docs website (not a runtime dependency) |
| [`scripts/`](./scripts) | Maintainers | Build, AI-doc generation, size / clean-room |
| [`prototype/`](./prototype) | Historical | v5 study — not the source of truth |

**Cloning is for contributors** (and for building/packing the library). Product designers and AI app builders should install the package and follow docs — not browse `site/src`.

## Features

- **96 patterns** across **6 use cases**
- Framework-agnostic core + optional React adapter
- Simulated *and* real streams (`append` / `applySnapshot` / `finish`, AbortSignal, events)
- Motion presets; decoupled appearance with **transient / persistent / review-bound** lifecycles
- Theme-aware presets; reduced-motion; review accept/discard
- AI-native docs (`llms.txt`, registry JSON, schemas, Agent Skill)
- Tiny core — native CSS + Web Animations, no runtime deps

## Contributor setup

Works the same on macOS, Linux, and Windows (PowerShell / cmd / Git Bash) via npm scripts (Node, not bash):

```bash
git clone https://github.com/akhildesai20/glyptide.git
cd glyptide
npm install
npm run build:lib
npm run generate:ai-docs
npm run typecheck
npm test
npm run test:clean-room   # pack + import smoke (no publish)
npm run dev               # http://localhost:5173
```

Optional: `npm run test:e2e` (Playwright Chromium), `npm run build` (lib + site), `npm run measure:ai-context`.

See [HANDOVER.md](./HANDOVER.md) for Windows migration notes and current status.

## Appearance lifecycle

Aesthetic presets style the **generation phase**. They do not permanently recolor finished prose unless the pattern’s lifecycle is persistent or review-bound. See [APPEARANCE.md](./APPEARANCE.md).

## AI-native developer experience

- **Minimal agent brief:** [docs/ai-integrate.md](./docs/ai-integrate.md) — start here; fetch other docs on demand
- [`AGENTS.md`](./AGENTS.md) — instructions for agents working **in this repo**
- [`skills/glyptide/`](./skills/glyptide/) — portable Agent Skill
- Playground serves `/llms.txt`, `/llms-full.txt`, `/registry/patterns.json`, `/schemas/*`, `/for-ai.html`
- Runtime: `pipeTextToGlyptide`, `recommendPatterns` (no LLM)

```bash
npm run build:lib && npm run generate:ai-docs
```

## Documentation

- [AI / integrator brief](./docs/ai-integrate.md)
- [API reference](./docs/api.md)
- [Streaming](./docs/streaming.md)
- [Appearance system](./APPEARANCE.md)
- [Provider notes](./docs/providers.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## License

MIT — see [LICENSE](./LICENSE).
