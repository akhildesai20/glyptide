# Glyptide v0.1.0 — Pre-publication report

**Release candidate commit (feature freeze base):** `aeb0a70`  
**This preparation commit:** _(filled at commit time — see `git log -1`)_  
**Maturity:** public preview · **License:** MIT · **Repo:** `akhildesai20/glyptide` (currently **private**)

**Acknowledgement:** Making the repository public will expose the entire monorepo, including `site/` website source, `prototype/`, scripts, CI workflows, and historical commits. That is intentional for this open-source layout; packages remain separately installable.

---

## 1. Security & privacy audit

### Method

- Tracked-file scan for credential-like patterns (API keys, PEM/private keys, npm tokens, AWS-style keys)
- `.gitignore` review (`.env*`, `.npmrc`, `*.pem`/`*.crt`, `.certs/`, `*.tgz`, `site/dist`, package `dist/`)
- Git history: branches/tags, deleted-path sample, large-blob inventory
- Package tarball content inspection
- Third-party / license notes (runtime vs site)
- GitHub Actions: latest runs on RC commit

### Results (sensitive values redacted)

| Finding | Severity | Action |
|---------|----------|--------|
| No committed `.env`, PEMs, `.npmrc` tokens, or cert files in the tracked tree | — | OK |
| Secret-pattern scan hits are **false positives** (word “token”, design copy, docs) | Info | No change |
| Agent/CI shells: `npm whoami` → **401** (stale/invalid token). Interactive user shell previously authenticated as a valid npm user | **Blocker for publish** | Human must `npm login` in the publishing shell and confirm `@glyptide` org ownership before any publish |
| Git author email on commits will become public with the repo | Info | Human OK / consider GitHub noreply if desired — **do not rewrite history without approval** |
| `HANDOVER.md` mentions Windows antivirus TLS / `NODE_EXTRA_CA_CERTS` setup (no cert contents) | Low | Keep as maintainer notes; certs remain gitignored |
| `prototype/text-in-motion-v5.html` retained as historical study | Info | Not production source of truth |
| Only remote branch: `main` · **no tags** | — | OK (do not tag until authorized) |
| Largest blobs: generated registry JSON, lockfile, prototype HTML, e2e PNG snapshot | Info | No secrets observed |

### Third-party / IP

| Item | Where | License / note |
|------|-------|----------------|
| Lucide icons | `site` only (`lucide` npm) | ISC — not shipped in publishable packages |
| Runtime deps in `glyptide` | **none** | — |
| React | peer of `@glyptide/react` | — |
| Fonts | Host-inherited in runtime CSS; site uses system stacks | No bundled proprietary fonts |

**No proprietary client material identified.** No history rewrite performed.

### GitHub Actions (RC `aeb0a70`)

- **CI:** success — https://github.com/akhildesai20/glyptide/actions/runs/45992841571
- **Multi-browser smoke:** success — https://github.com/akhildesai20/glyptide/actions/runs/45992841663

---

## 2. Package readiness

| Item | `glyptide` | `@glyptide/react` |
|------|------------|-------------------|
| Version | 0.1.0 | 0.1.0 |
| Registry | **404 — not published** | **404 — not published** |
| License | MIT | MIT |
| Engines | Node ≥ 18 | Node ≥ 18 |
| Exports | ESM/CJS/types, `./styles.css`, `./engine`, `./patterns`, `./presets`, IIFE, `./package.json` | ESM/CJS/types |
| `files` allowlist | dist + README + LICENSE | dist + README + LICENSE |
| `prepublishOnly` | `npm run build` | `npm run build` |
| Runtime deps | none | none (peers: glyptide, react, react-dom) |
| `sideEffects` | `*.css` | `false` |
| `npm pack --dry-run` | OK (25 files) | OK (7 files) |
| `npm publish --dry-run --access public` | OK (did **not** publish) | Not re-run after dry-run core (same process) |

### Distribution sizes (built artifacts)

| Artifact | Packed | Unpacked | Notes |
|----------|--------|----------|-------|
| `glyptide-0.1.0.tgz` | **184 800 B** (~180.5 KiB) | ~916 KB | SHA256 `77F5428A7F6F1EC7D4C4C6C69A7AD666E0A06291F65900E1E7B9A327CD0B1036` |
| `glyptide-react-0.1.0.tgz` | **4083 B** (~4.0 KiB) | ~17 KB | SHA256 `1034308FE56138D09428762F4EDA7E791D4CDF7232EC65C1A9C18FE603EBF8CD` |

### Bundle budgets (`npm run size -- --check-budgets`)

| File | raw | gzip | brotli |
|------|-----|------|--------|
| index.js | 179.0 KB | 34.2 KB | 27.7 KB |
| index.cjs | 181.2 KB | 34.5 KB | 28.0 KB |
| patterns.js | 77.0 KB | 9.4 KB | 6.8 KB |
| presets.js | 4.8 KB | 1.8 KB | 1.5 KB |
| glyptide.iife.js | 124.6 KB | 28.2 KB | 23.2 KB |
| styles.css | 12.7 KB | 2.3 KB | 2.0 KB |
| engine.js | 75.7 KB | 18.4 KB | 15.9 KB |

Tarballs exclude website source, maps, and monorepo tooling (asserted by clean-room + pack listing).

### npm account / scope status

| Check | Result |
|-------|--------|
| Publishing-shell `npm whoami` (this agent) | **401 Unauthorized** |
| Unscoped name `glyptide` | Available (404) |
| `@glyptide` org / package | **Unverified here** — human must confirm org exists and publisher has publish rights before `@glyptide/react` |

---

## 3. First-time integration

`npm run test:prepub-integration` (packed tarballs only, temp apps, no monorepo clone):

- Vanilla ESM + async stream + abort + destroy — **pass**
- TypeScript NodeNext resolution — **pass**
- React packed adapter + unmount cleanup — **pass**
- IIFE artifact present — **pass**
- Existing `npm run test:clean-room` — **pass**

**Independent AI-assisted integration:** **pass** ([AI-only Glyptide integrate](db4a85d9-8cec-401c-9ff3-b11e9b10b852)). Agent used only the integrator brief + `docs/api.md` / `docs/streaming.md` and a packed `.tgz` in a temp app (happy-dom). Friction noted: brief originally lacked full `pipeTextToGlyptide` signature / settlement await guidance and CSS-is-for-bundlers note (addressed in `docs/ai-integrate.md`).

---

## 4. Public-facing repository

Prepared / refreshed:

- Root `README.md` (product landing)
- `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `AGENTS.md`
- `docs/RELEASE_NOTES_v0.1.0.md` (GitHub release **draft** — do not publish yet)
- Issue + PR templates under `.github/`
- Publication single source: `docs/publication-status.json` → `npm run sync:publication-status` → `docs/publication-install.md` + AI docs install notes

---

## 5. Website readiness

- Architecture preserved: Home · Playground · Docs · For AI
- Production build: **pass**
- Chromium smoke e2e: **17 passed** (themes, recipes/playground, keyboard review, For AI / llms, docs)
- CI multi-browser smoke (Firefox/WebKit) on RC: **pass**
- `websiteUrl` in publication status: **`null`** — do **not** invent a domain; set after real deploy, then add absolute canonical / `og:url` / sitemap
- `site/public/robots.txt` added (Sitemap URL deferred until `websiteUrl` is set)
- **When the repo is public, `site/` source is public.**

Non-blocking: full tablet/mobile visual pass is covered partly by responsive CSS + smoke; dedicated device lab not run. Visual regression suite remains opt-in (`VISUAL=1`).

---

## 6. AI-native distribution

- `llms.txt` / `llms-full.txt` / registry / schemas / skill / integrator brief synchronized via `generate:ai-docs`
- Registry generation is **deterministic** (no wall-clock `generatedAt`)
- Progressive context guidance retained in `docs/ai-integrate.md` and `AGENTS.md`

---

## 7. Publication-status transition

1. Keep `"npmPublished": false` until registry publish + install verification succeed.
2. After publish: set `"npmPublished": true` (and `websiteUrl` / `repositoryPublic` as appropriate) in `docs/publication-status.json`.
3. Run `npm run sync:publication-status` then update root/package READMEs if install blocks drifted.
4. Commit; do not flip flags early.

---

## 8. Known limitations (non-blocking)

- Public preview — not exhaustive browser or latency guarantees
- No production website URL configured yet
- npm auth / `@glyptide` org confirmation required in the human publishing shell
- Underscored test hooks are unsupported public API
- Historical `REPORT.md` / `AUDIT.md` / `HANDOVER.md` are maintainer notes

---

## 9. Remaining blockers (human)

1. **Authenticate npm** in the publishing shell (`npm whoami` must succeed).
2. **Confirm `@glyptide` organization** ownership before publishing `@glyptide/react`.
3. **Authorize** npm publish, GitHub visibility change, and GitHub Release/tag separately — none performed in this pass.
4. Optionally set GitHub `homepage` + `publication-status.json` `websiteUrl` after hosting deploy.

---

## 10. Exact publication sequence (when authorized)

1. `git checkout main && git pull`
2. `npm ci && npm run build:lib && npm run generate:ai-docs && npm test && npm run test:clean-room && npm run test:prepub-integration`
3. Confirm `npm whoami` and `@glyptide` access
4. From `packages/glyptide`: `npm publish --access public`
5. From `packages/glyptide-react`: `npm publish --access public`
6. Verify: `npm view glyptide version` / `npm install glyptide` in a fresh temp app
7. Flip `docs/publication-status.json` → `npm run sync:publication-status` → commit
8. Make repository **public** only with explicit approval
9. Create git tag `v0.1.0` + GitHub Release using `docs/RELEASE_NOTES_v0.1.0.md`
10. Set website URL / canonical metadata if hosting is live

## Post-publication verification checklist

- [ ] `npm view glyptide@0.1.0` and `npm view @glyptide/react@0.1.0`
- [ ] Fresh app installs from registry (vanilla + React)
- [ ] Publication status docs show registry install commands
- [ ] GitHub Release published; repo visibility as authorized
- [ ] Website homepage / OG absolute URLs if deployed
- [ ] CI still green on the release tag

---

**Stop here until explicit publication authorization.**
