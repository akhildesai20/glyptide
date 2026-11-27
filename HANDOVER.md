# Glyptide handover — Windows primary environment

**Date:** 2026-11-27  
**Primary development machine:** Windows PC  
**Secondary / historical:** macOS (prior development)  
**Remote:** https://github.com/akhildesai20/glyptide (private)  
**Branch:** `main`

This document distinguishes **verified** work from **unfinished / deferred** work. Do not treat unverified items as production-ready.

Windows is the **primary** ongoing development and release environment. Keep the monorepo intact; GitHub remains the single source of truth. Cross-platform scripts must continue to work on macOS and Linux.

---

## Current project status

| Area | Status |
|------|--------|
| Core library `glyptide@0.1.0` | Verified on Windows (build, typecheck, clean-room pack/import) |
| React adapter `@glyptide/react@0.1.0` | Verified in clean-room import |
| Site (MPA: home / playground / docs / for-ai) | Implemented; Vitest + Playwright verified on Windows |
| AI docs (`llms.txt`, registry, skill, integrator brief) | Generated; progressive-retrieval oriented |
| Public npm publish | **Not done** — blocked until explicit human authorization |
| GitHub visibility | **Private** — do not change without authorization |
| Primary machine | **Windows** (Node.js 24 LTS) |
| Pre-release reliability audit | Completed on Windows (grapheme hold, a11y announce, clean-room vanilla+React, visual case fix) |
| v0.1.0 release-blocker remediation | Session-aware pipe cancel, finish/pause/scheduler/anim bounds, unicode/typography/React hot props, CI matrix — verified with `release-blockers` + Playwright |
| Pre-publication prep | See `PREPUBLICATION.md` + `docs/publication-status.json` — **do not publish** until explicit authorization |

Package manager: **npm** workspaces + committed `package-lock.json` (do not switch to pnpm/yarn without an explicit decision).

---

## Architecture & directory structure

| Path | Role |
|------|------|
| `packages/glyptide` | Publishable core (engine, patterns, presets, styles) |
| `packages/glyptide-react` | Publishable React adapter |
| `site/` | Vite playground + docs website (not a runtime dependency of apps) |
| `docs/` | Human/agent docs (`ai-integrate.md` = minimal agent entry) |
| `skills/glyptide/` | Portable Agent Skill |
| `examples/` | Offline recipes / provider notes |
| `scripts/` | `generate-ai-docs`, clean-room smoke, size, inventory, AI context measure |
| `prototype/` | Historical v5 study — not source of truth |
| `AGENTS.md` | Instructions for agents working **in this repo** |
| `HANDOVER.md` | This file |

**Pattern source of truth:** `packages/glyptide/src/data/patterns.json` (+ `cases.json`).  
After registry/API doc changes: `npm run build:lib && npm run generate:ai-docs`.

Concerns stay separate: **Pattern · Motion · Appearance · Lifecycle**.

---

## Latest completed changes

1. **Site IA** — multi-page site (`/`, `/playground/`, `/docs/`, `/for-ai.html`); recipe shells; pattern registry UI; interactive design guide; Learn with AI strip; appearance preset gallery.
2. **Distribution hygiene** — explicit package `files` allowlists; no sourcemaps in tarball; clean-room smoke for both packages.
3. **AI / discoverability** — `docs/ai-integrate.md`, README install-first framing, slim Copy-for-AI, skill/`llms.txt`/`AGENTS.md`, `.cursorindexingignore`, `npm run measure:ai-context`.
4. **Windows primary stabilization** — `.gitattributes` (LF), Playwright worker cap + direct `npx vite` webServer, Node 24 LTS, Norton HTTPS trust via user-local `NODE_EXTRA_CA_CERTS` (certs never committed).

---

## Pending / unfinished / limitations

- No dedicated ESLint script — quality gate is `tsc` + Vitest + Playwright.
- Public npm publish deferred (`npm whoami` currently **401** until re-login; still requires explicit go-ahead).
- Visual regression subset is opt-in (`VISUAL=1`); baselines may be absent until generated with `--update-snapshots`.
- Some maintainer docs (`docs/STABILIZATION.md`, `HARDENING.md`, etc.) are historical RC notes.

**Known product constraints (by design)**

- `glyptide` is **not** on the public npm registry yet; consumers install `./packages/glyptide` or a `.tgz`.
- Repository is private; agents should prefer packaged docs / `llms.txt` over GitHub scraping.
- Website (`site/`) is for demos/docs — apps must not depend on `site/src`.
- Do not invent pattern ids; unknown ids throw `GlyptideConfigError`.

---

## Windows setup (primary)

```powershell
# Prerequisites: Node.js 24 LTS (engines still allow >=18 for consumers)
# If Norton/Symantec HTTPS scanning is enabled, trust its root for Node only:
#   Export "Norton Web/Mail Shield Root" from LocalMachine\Root to a PEM under
#   %USERPROFILE%\.certs\ (outside the repo), then set a USER env var:
#   NODE_EXTRA_CA_CERTS=%USERPROFILE%\.certs\norton-web-mail-shield-root.pem
# Never set NODE_TLS_REJECT_UNAUTHORIZED=0 permanently. Never commit PEMs.

git clone https://github.com/akhildesai20/glyptide.git
cd glyptide
# If Git HTTPS fails with OpenSSL, use schannel (repo-local is fine):
#   git config http.sslBackend schannel
npm ci
npm run build:lib
npm run generate:ai-docs
npm run typecheck
npm test
npm run test:clean-room
npm run build
npm run size
npm run dev
```

Optional e2e / visual:

```powershell
cd site
npx playwright install chromium
cd ..
npm run test:e2e
# Soft visual gate (requires baselines or --update-snapshots):
$env:VISUAL=1; npm run test:e2e -- --grep "visual regression"
```

Notes:

- Prefer **Node.js 24 LTS** on this machine; retain `package-lock.json`.
- Use PowerShell, cmd, or Git Bash — scripts are npm/Node, not bash-only.
- Relative install paths: `npm install ./packages/glyptide`.
- Never commit `.npmrc` with tokens (ignored), PEMs, or machine-specific cert paths.

---

## Cross-platform notes (macOS / Linux)

- Playwright: workers capped at 4 by default (override `PW_WORKERS`); webServer uses `npx vite --host 127.0.0.1 --port 5173` (works on all platforms; avoids npm swallowing flags on Windows).
- `.gitattributes` normalizes text to LF; harmless on macOS/Linux.
- Norton / `NODE_EXTRA_CA_CERTS` is **Windows antivirus–specific** — not required on macOS/Linux unless a similar MITM proxy exists.

---

## Development & testing commands

| Command | Purpose |
|---------|---------|
| `npm ci` / `npm install` | Workspace install from lockfile |
| `npm run build:lib` | Build `glyptide` + `@glyptide/react` |
| `npm run generate:ai-docs` | Refresh `site/public` AI assets |
| `npm run build` | Lib + AI docs + site production build |
| `npm run dev` | Lib + AI docs + Vite playground |
| `npm run typecheck` | Core package `tsc` |
| `npm test` | Site Vitest |
| `npm run test:e2e` | Playwright |
| `npm run test:clean-room` | Pack + temp-project import smoke |
| `npm run measure:ai-context` | Approx token footprint of AI entry docs |
| `npm run size` | Bundle size budgets |
| `npm run check:ai-docs` | Fail if generated AI docs are stale |

---

## npm publication readiness

| Item | Ready? |
|------|--------|
| Package name/version | `glyptide@0.1.0`, `@glyptide/react@0.1.0` |
| `files` allowlist / no maps/src | Yes (clean-room asserts) |
| `prepublishOnly` build on core | Yes |
| README + LICENSE in packages | Yes |
| Public registry publish | **No — do not publish without explicit authorization** |
| npm account auth on Windows | User reports `npm whoami` works interactively; confirm in the same shell before publish. Agent/CI shells may still see stale `.npmrc` tokens (401). |
| Unscoped `glyptide` name | Available on registry (404) |
| `@glyptide` scope / org | Must exist and be owned by the publisher before `npm publish` of `@glyptide/react` |

Suggested publish order **when authorized**: build → clean-room → dry-run `npm pack` → `npm publish` from `packages/glyptide`, then `@glyptide/react` with peer dep on published `glyptide`. Update docs that currently say “not on npm yet.”

---

## Recommended next steps

1. `npm login` on Windows; confirm `npm whoami`.
2. When authorized: pack dry-run, then publish core then React adapter.
3. Keep AI entry at `docs/ai-integrate.md` / `/llms.txt` — avoid teaching agents from `site/src`.
4. Continue product work on `main` from this Windows environment.

---

## Verification

### macOS (pre-handover)

Recorded 2026-11-27:

| Check | Result |
|-------|--------|
| `npm run build:lib` / `generate:ai-docs` / `typecheck` | Pass |
| `npm test` (Vitest) | **127 passed** |
| `npm run test:clean-room` / `build` / `test:e2e` | Pass — **24 passed**, 4 skipped (visual) |

### Windows primary (stabilization)

Recorded 2026-11-27 — Node **v24.22.3**, Norton CA via user-local `NODE_EXTRA_CA_CERTS` (TLS verification **enabled**; no `NODE_TLS_REJECT_UNAUTHORIZED=0`):

| Check | Result |
|-------|--------|
| Clone / `npm ci` (lockfile retained) | Pass |
| `build:lib` / `generate:ai-docs` / `typecheck` | Pass |
| Vitest | **127 passed** |
| Full `npm run build` | Pass |
| `npm run size` / `test:clean-room` | Pass |
| Playwright e2e | **24 passed** (visual skipped without `VISUAL`) |
| Visual (`VISUAL=1`) | First run failed: **missing baselines** (not pixel diffs). After `--update-snapshots`, **4/4 passed** on `chromium-win32`. |
| `npm whoami` | **401** — re-login required before publish |
| Package names on registry | Not published (404) |

Visual baselines live under `site/e2e/visual.spec.ts-snapshots/*-chromium-win32.png` (Windows Chromium). macOS/Linux would generate their own platform suffix if `VISUAL=1` is used there.

**Distribution sizes** (Node 24 build; tsup output is the published minified form — no separate unminified artifacts). Re-print with `node scripts/report-dist-sizes.mjs`:

| Artifact | Raw | Gzip | Brotli | Packed | Unpacked |
|----------|-----|------|--------|--------|----------|
| `glyptide` tarball | — | — | — | 177 907 B (173.74 KB) | 888 713 B (867.88 KB) |
| `@glyptide/react` tarball | — | — | — | 3 513 B (3.43 KB) | 15 248 B (14.89 KB) |
| `index.js` (ESM) | 177 095 B | 33 584 B | 27 188 B | — | — |
| `glyptide.iife.js` | 124 810 B | 27 916 B | 23 009 B | — | — |
| `engine.js` | 72 337 B | 17 674 B | 15 257 B | — | — |
| `patterns.js` | 78 827 B | 9 636 B | 6 950 B | — | — |
| `styles.css` | 12 659 B | 2 282 B | 1 918 B | — | — |
| `@glyptide/react` `index.js` | 4 090 B | 1 064 B | 939 B | — | — |

---

## Resume checklist

- [x] Windows clone / primary environment  
- [x] Node.js 24 LTS  
- [x] Norton HTTPS trust via `NODE_EXTRA_CA_CERTS` (no TLS disable)  
- [x] Cross-platform Playwright / `.gitattributes` fixes  
- [x] Full build / typecheck / unit / e2e / clean-room  
- [x] Visual baselines (`VISUAL=1`) on Windows Chromium (case-correct)  
- [x] Pre-release reliability audit + regressions  
- [ ] Confirm `npm whoami` + `@glyptide` org ownership in the publish shell  
- [ ] npm publish only with explicit authorization  
