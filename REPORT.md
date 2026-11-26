# Glyptide — quality audit & initial push report

Date: 2026-11-26

## Pattern audit

| Metric | Count |
|--------|------:|
| Patterns audited (registry) | **96** |
| Transient | **79** |
| Persistent | **3** (heading / header hierarchy) |
| Review-bound | **14** |

Lifecycle is centralized in `appearanceLifecycleFor()` / `packages/glyptide/src/lifecycle.ts` and enforced by the engine. Aesthetic `colorMode` / presets no longer keep paint after transient settlement.

### Corrected in this pass

- Transient cleanup ignored aesthetic mode (gradients/solids no longer stick after Complete)
- Settlement restores **inherited** host color (not `--ink` / black / white)
- Piece-level settle for emphasis, checkpoints, row cues, gradients
- Generation-level settle for color / underline / replacement ink / mark / change bar
- Review-bound chrome remains until Accept / Discard
- `persistGradient` reserved for hero/showcase only

### Remaining known limits

- Full normal-speed visual review of all 96 patterns was not done frame-by-frame by a human
- Multi-browser visual matrix (Firefox / WebKit) not run — Chromium only
- Long-content / RTL / CJK streaming edge cases covered by splitter unit tests, not full e2e matrix
- Gallery IntersectionObserver pause verified in smoke, not under load profiling

## Quality assurance

| Suite | Result |
|-------|--------|
| `tsc` (glyptide) | Pass |
| Vitest | **26/26** pass |
| Playwright smoke | **11/11** pass (Chromium) |
| Playwright registry sweep | **6/6** case suites pass (all 96 patterns, reduced motion) |
| Production `vite build` | Pass |
| Package build (`tsup`) | Pass |

Browsers tested: **Chromium only**. Firefox and WebKit were not installed/run.

## Repository hygiene

- Removed duplicate root `text-in-motion-v5.html` (kept `prototype/`)
- Ignored `node_modules`, `dist`, `test-results`, env files
- No credentials / tokens found in staged tree
- MIT license present; no Generative Loaders fork claim
- npm install docs correctly state package is **not published**

### Bundle sizes (post production hardening)

See [docs/BASELINE.md](docs/BASELINE.md). Approx: `index.js` ~146 KB raw / ~28 KB gzip; lightweight `engine.js` ~54 KB raw.

## GitHub

| Field | Value |
|-------|-------|
| URL | https://github.com/akhildesai20/glyptide |
| Visibility | **Private** (HTTPS fetch of HTML returns 404 without session; push succeeded to private remote) |
| Branch | `main` |
| Commit | `feat: initialize Glyptide text motion library` |
| SHA | `6e9cf14c62a45340184ccc28108b4f8845f1d23d` |
| Push | **Succeeded** (`main` → `origin/main`) |
| CI | Workflow added (`.github/workflows/ci.yml`); status not verified — `gh` CLI not authenticated |

## Remaining work before public release

Needs your involvement:

1. Authenticate `gh` (optional) and confirm Actions run on `main`
2. Decide public website hosting (Vercel config present but not required)
3. Publish to npm when ready (docs already warn it is unpublished)
4. Optional: expand Playwright to Firefox/WebKit
5. Optional: human visual pass at normal speed for motion-critical patterns
