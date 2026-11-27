# Glyptide handover — Windows migration

**Date:** 2026-11-27  
**From:** macOS development machine  
**To:** Windows PC (primary ongoing development + npm account access)  
**Remote:** https://github.com/akhildesai20/glyptide (private)  
**Branch:** `main`

This document distinguishes **verified** work from **unfinished / deferred** work. Do not treat unverified items as production-ready.

---

## Current project status

| Area | Status |
|------|--------|
| Core library `glyptide@0.1.0` | Verified locally (build, typecheck, clean-room pack/import) |
| React adapter `@glyptide/react@0.1.0` | Verified in clean-room import |
| Site (MPA: home / playground / docs / for-ai) | Implemented; Vitest + Playwright exist |
| AI docs (`llms.txt`, registry, skill, integrator brief) | Generated; progressive-retrieval oriented |
| Public npm publish | **Not done** — blocked until explicit human authorization |
| GitHub visibility | **Private** — do not change without authorization |
| Windows as primary machine | Handover target — verify install on Windows after clone |

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

## Latest completed changes (this handover batch)

Verified on the Mac before push (see “Verification” below):

1. **Site IA** — multi-page site (`/`, `/playground/`, `/docs/`, `/for-ai.html`); recipe shells; pattern registry UI; interactive design guide; Learn with AI strip; appearance preset gallery; docs table markdown `\|` fix.
2. **Distribution hygiene** — explicit package `files` allowlists; no sourcemaps in tarball; clean-room smoke for both packages; package size ~178 KB for `glyptide`.
3. **AI / discoverability** — `docs/ai-integrate.md`, README install-first framing, slim Copy-for-AI, updated skill/`llms.txt`/`AGENTS.md`, `.cursorindexingignore`, `npm run measure:ai-context`.
4. **Windows prep** — relative install paths in docs; gitignore hardened; no bash-only scripts (Node `.mjs` only).

---

## Pending / unfinished / limitations

**Not finished / not claimed verified on Windows yet**

- First-class Windows smoke (clone → `npm install` → build → test) — run on the PC after pull.
- Full Playwright e2e may need `npx playwright install chromium` on a fresh Windows machine.
- No dedicated ESLint script in root/`site` — quality gate is primarily `tsc` + Vitest + Playwright.
- Public npm publish checklist remains deferred (auth is on Windows; still requires explicit go-ahead).
- Some maintainer docs (`docs/STABILIZATION.md`, `HARDENING.md`, etc.) are historical RC notes — not required for app integration.

**Known product constraints (by design)**

- `glyptide` is **not** on the public npm registry yet; consumers install `./packages/glyptide` or a `.tgz`.
- Repository is private; agents should prefer packaged docs / `llms.txt` over GitHub scraping.
- Website (`site/`) is for demos/docs — apps must not depend on `site/src`.
- Do not invent pattern ids; unknown ids throw `GlyptideConfigError`.

**Known bugs / follow-ups to re-check on Windows**

- Confirm Vite MPA routes and `vercel.json` rewrites after a production `npm run build` on Windows.
- Re-run Playwright smoke against local preview if e2e was last run only on macOS.
- If antivirus locks `node_modules` or Playwright browsers, allowlist the repo / Playwright cache.

---

## Windows setup

```powershell
# Prerequisites: Node.js 18+ and npm (comes with Node)
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

Optional e2e:

```powershell
cd site
npx playwright install chromium
cd ..
npm run test:e2e
```

Notes:

- Use **PowerShell, cmd, or Git Bash** — scripts are npm/Node, not macOS shell.
- Prefer relative paths: `npm install ./packages/glyptide`.
- Keep `package-lock.json`. Do not delete it or migrate package managers casually.
- Auth for future publish: use Windows npm login / token via environment; **never commit `.npmrc` with tokens** (ignored).

---

## Development & testing commands

| Command | Purpose |
|---------|---------|
| `npm install` | Workspace install |
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

Site-only: `npm run build -w site`, `npm run test -w site`.

---

## npm publication readiness

| Item | Ready? |
|------|--------|
| Package name/version | `glyptide@0.1.0`, `@glyptide/react@0.1.0` |
| `files` allowlist / no maps/src | Yes (clean-room asserts) |
| `prepublishOnly` build on core | Yes |
| README + LICENSE in packages | Yes |
| Public registry publish | **No — do not publish without explicit authorization** |
| npm account access | Available on Windows PC (per handover intent) |

Suggested publish order **when authorized**: build → clean-room → dry-run `npm pack` → `npm publish` from `packages/glyptide`, then `@glyptide/react` with peer dep on published `glyptide`. Update docs that currently say “not on npm yet.”

---

## Recommended next steps (Windows)

1. Clone/pull `main`, `npm install`, run the verification table above.
2. Confirm `npm run build` and `npm run dev` in the browser.
3. Install Playwright browsers if running e2e.
4. When ready to publish: dry-run pack, then publish only with explicit go-ahead.
5. Keep AI entry at `docs/ai-integrate.md` / `/llms.txt` — avoid teaching agents from `site/src`.

---

## Verification (macOS machine, pre-push)

Recorded 2026-11-27 (re-run on Windows after clone):

| Check | Result |
|-------|--------|
| `npm run build:lib` | Pass |
| `npm run generate:ai-docs` | Pass |
| `npm run typecheck` | Pass |
| `npm test` (Vitest) | **127 passed** (14 files) |
| `npm run test:clean-room` | Pass — both packages, no maps/src/site |
| `npm run measure:ai-context` | ~2.2k tok recommended first load |
| `npm run build` (full) | Pass — Vite MPA (`/`, `/docs/`, `/playground/`, for-ai) |
| `npm run test:e2e` | **24 passed**, 4 skipped (visual regression subset) |
| Lint | No separate ESLint target — `tsc` is the static gate |

---

## Resume checklist

- [ ] `git pull origin main` on Windows  
- [ ] `npm install`  
- [ ] `npm run build:lib && npm run generate:ai-docs && npm run typecheck && npm test && npm run test:clean-room`  
- [ ] `npm run dev` — spot-check home, playground, docs, Learn with AI, for-ai  
- [ ] Only then consider npm publish (explicit authorization required)
