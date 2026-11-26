# Glyptide — delivery report

## What changed

- Preserved the v5 prototype at `prototype/text-in-motion-v5.html` (behavioral source of truth).
- Extracted a production library `glyptide` with engine, pattern registry (96), styles, ESM/CJS/IIFE builds, and TypeScript types.
- Added optional `@glyptide/react` adapter.
- Built a polished static website (`site/`) with design tokens, Light/Dark/System theme, hero powered by the real engine, playground, searchable library, docs, code export, and URL sharing.
- Added unit tests, Playwright smoke suite, README, API docs, MIT license, contributing guide, and audit notes.

## Architecture decisions

- **Monorepo** with npm workspaces: `packages/glyptide`, `packages/glyptide-react`, `site`.
- **No Next.js / backend** — Vite static site.
- **Engine port** preserves v5 playback, spring, streaming scenarios, review flows, and palette logic.
- **Pattern data** extracted to JSON and loaded by the registry; website aliases source for HMR.
- **npm not published** — install paths document local packages only.

## Dependencies added

| Dependency | Why |
|------------|-----|
| `typescript`, `tsup` | Typed library builds (ESM/CJS/IIFE + d.ts) |
| `vite` | Static site bundler |
| `vitest` | Unit tests for split/registry |
| `@playwright/test` | Browser regression smoke tests |
| `react` (dev/peer, react package only) | Optional adapter peers |

No Motion, Streamdown, or other animation/markdown runtimes — native WAAPI + CSS.

## Pattern count

**96** (derived from registry, shown in hero meta).

## Bundle sizes (approximate, unminified map-inclusive ESM)

| File | Size |
|------|------|
| `index.js` (engine + registry + samples) | ~103 KB |
| `patterns.js` | ~77 KB |
| `glyptide.iife.js` (minified) | ~85 KB |
| `styles.css` | ~10 KB |
| Site JS (gzip) | ~22 KB |
| Site CSS (gzip) | ~5 KB |

Note: sample text embedded in the registry dominates package size. A follow-up can ship metadata-only entry points.

## Test results

- Unit (`vitest`): **5/5 passed** (split + registry).
- Playwright Chromium smoke: **6/6 passed** (hero count, playground generate→complete, theme persistence, library play, reduced motion, Escape discard on ghost suggestion).
- Production build: succeeds (`site/dist`).

## Accessibility findings

- Theme FOUC prevented via inline boot script.
- Skip link, focus-visible, semantic tabs, live region for status (completion — not per-token).
- Hero motion is `aria-hidden` with static `sr-only` summary; pause control provided.
- Reduced-motion preference + playground checkbox.
- Remaining: full axe audit across all 96 previews; verify contrast of custom generation colors at extremes.

## Remaining issues

1. Pattern samples inflate the core bundle — split metadata vs samples.
2. Structured output still uses monospace text (prototype parity); semantic `<table>` / list DOM is a follow-up.
3. Playwright coverage is smoke-level, not all 96 patterns / viewports / browsers yet.
4. Social OG is SVG; some networks prefer PNG — convert before launch.
5. GitHub org/repo URL placeholders (`glyptide/glyptide`) need a real remote before publish.
6. Do not run `npm publish` until explicitly approved.

## Steps to publish

1. Create GitHub repository and update package `repository` fields.
2. Host `site/dist` (Vercel config included) and set homepage URL.
3. Convert OG image to PNG; verify favicon.
4. Expand Playwright matrix (Firefox/WebKit, 320–1440 widths, all patterns).
5. Optionally slim pattern entry points.
6. `npm publish` for `glyptide` then `@glyptide/react` after approval.
7. Update site snippets from local install paths to `npm install glyptide`.
