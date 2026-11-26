# Glyptide production baseline (Phase 0)

Locked from the production master plan. Remeasure after Phase 1–2 with `npm run size`.

## Bundle sizes

### Pre–Phase 1 (post–AI helpers)

| Artifact | Raw | Gzip | Brotli |
|----------|----:|-----:|-------:|
| `index.js` | 133.8 KB | 24.8 KB | 19.8 KB |
| `glyptide.iife.js` | 102.9 KB | 21.3 KB | 17.2 KB |

### Post–Phase 1–2 (streaming/events/motion; CI baseline)

| Artifact | Raw | Gzip (level 9) | Brotli |
|----------|----:|---------------:|-------:|
| `index.js` | 146.3 KB | 27.8 KB (28429 B) | ~22.3 KB |
| `glyptide.iife.js` | 109.2 KB | 23.5 KB (24086 B) | ~19.1 KB |
| `engine.js` (lightweight) | 53.7 KB | ~14.1 KB | ~12.3 KB |
| `styles.css` | 12.9 KB | 2.4 KB | 2.0 KB |
| `patterns.js` | 77.0 KB | 9.4 KB | 6.8 KB |

## Budgets (CI fails if gzip &gt; +10% vs post–Phase 1 baseline)

- Core ESM gzip baseline **28429 B** (+10% cap)
- Prefer `glyptide/engine` when registry JSON is unused
- React adapter gzip ≤ **3 KB**
- Styles CSS gzip ≤ **4 KB**

## Preserve (do not rewrite)

- 96 pattern IDs and samples in `packages/glyptide/src/data/patterns.json`
- Text-node rendering (no model HTML/`eval`)
- Appearance lifecycle in `lifecycle.ts` (transient → inherited; review-bound until accept/reject)
- Host-scoped CSS variables + 18 theme-aware presets
- Local `springFrames` + WAAPI (no Motion dependency)
- `pipeTextToGlyptide` / `recommendPatterns` / AI doc generator
- Critically damped spring used sparingly
- Reduced-motion registry e2e sweep

## Test inventory (suite of record)

| Suite | Location | Notes |
|-------|----------|-------|
| Unit (Vitest) | `site/src/*.test.ts` | Aliases `glyptide` → package **source**; suite of record until package-dir tests added |
| E2E smoke | `site/e2e/smoke.spec.ts` | Chromium |
| E2E registry | `site/e2e/patterns.spec.ts` | 96 patterns, reduced motion |
| Typecheck | `packages/glyptide` | `tsc --noEmit` |
| AI docs sync | `generate:ai-docs` + CI diff | Generated assets must match |

## Package boundaries

| Package | Role |
|---------|------|
| `glyptide` | Framework-independent core |
| `@glyptide/react` | Thin React adapter |
| `site` | Playground + public AI assets |

Zero runtime dependencies in core. Streamdown / AI SDKs / Motion stay outside core.
