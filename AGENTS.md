# AGENTS.md — Glyptide

## Purpose

Glyptide is a lightweight, model-independent text-motion library for generative UIs. It is a **presentation layer** — no AI provider calls, no API keys.

## Two modes (read this first)

| You are… | Do this |
|----------|---------|
| **Integrating Glyptide into an app** | Read [`docs/ai-integrate.md`](./docs/ai-integrate.md). Install `packages/glyptide` (or a tarball). **Do not** explore `site/` or engine internals. |
| **Contributing to this monorepo** | Use the architecture + commands below. Prefer package public API over rewriting motion by hand. |

### Context hygiene (always)

- Prefer **progressive docs**: `docs/ai-integrate.md` → `docs/api.md` / `docs/streaming.md` → `/registry/patterns.json` → `/llms-full.txt` only if needed.
- **Do not** inspect `site/src/**` to discover the API (playground UI ≠ library contract).
- **Do not** invent pattern ids, install targets, or APIs absent from the built package / docs.
- **Do not** load every pattern or the full website into context “just in case.”

## Architecture (maintainers)

| Path | Role |
|------|------|
| `packages/glyptide` | Core engine, registry, appearance, stream helpers — **publishable** |
| `packages/glyptide-react` | Thin React wrapper — **publishable** |
| `site/` | Playground + AI-facing static assets under `site/public/` |
| `skills/glyptide/` | Portable Agent Skill |
| `docs/` | Human/agent docs (`ai-integrate.md` is the minimal entry) |
| `prototype/` | Historical v5 study — not production source of truth |

**Pattern source of truth:** `packages/glyptide/src/data/patterns.json` (+ `cases.json`). Derived assets: `npm run generate:ai-docs` after `build:lib`.

Separate concerns: **Pattern** · **Motion** · **Appearance** · **Lifecycle**. Aesthetic config must never change a transient pattern’s final inherited styles.

## Commands

All scripts are Node/npm-based (Windows-compatible). Preserve `package-lock.json` and npm workspaces — do not switch package managers without an explicit request.

```bash
npm install
npm run build:lib
npm run generate:ai-docs
npm run build              # lib + site
npm run dev
npm test                   # Vitest (site)
npm run test:e2e           # Playwright (Chromium)
npm run typecheck
npm run size
npm run inventory
npm run test:clean-room    # pack + import smoke (no publish)
npm run measure:ai-context # approximate token footprint of AI entry docs
```

Consumer install: `npm install glyptide` (optional `@glyptide/react`). Contributors still use workspace `npm run build:lib`.

## Coding conventions

- TypeScript; no new core runtime dependencies without strong justification.
- Prefer native CSS, Web Animations, `requestAnimationFrame`.
- Semantic revision tokens (`--added`, `--removed`) stay independent of aesthetic presets.
- Render model text as text nodes — never unsanitized HTML / `eval` of model output.
- Preserve existing pattern **ids**.

## Public API conventions

- Prefer `createGlyptide({ pattern: "<id>" })`. Unknown ids throw `GlyptideConfigError`.
- Streams: `beginStream()` → `append` / `applySnapshot` / `finish`, or `pipeTextToGlyptide` (`delta` | `snapshot`).
- After `stop` / Complete, delayed chunks must not restart — new session.
- Snapshots: divergent / shrinking / empty → **replace**. See `docs/streaming.md`.
- CSS hosts: `.glyptide-document` / `.glyptide-waiting`.
- Lightweight: `import { makeEngine } from "glyptide/engine"`.
- `recommendPatterns({ useCase })` for deterministic suggestions.
- Validate against `site/public/schemas/*.json` when generating integration code.

## Motion, appearance, a11y

- Honor `prefers-reduced-motion`.
- Transient paint clears to **inherited** host styles (not hardcoded black/white).
- Review-bound chrome until Accept/Discard — no timer dismissal.
- `persistGradient` is showcase-only (hero).
- Themes: `light` | `dark` | `system` | `inherit`.

## Contribution & release restrictions

- Do **not** publish to npm or change GitHub visibility without explicit human authorization.
- Do **not** invent APIs or capabilities absent from the built package.
- After pattern/registry changes: `build:lib` → `generate:ai-docs` → tests.
- Prefer regenerating `site/public/llms*.txt` / registry via the script over hand-edits.
