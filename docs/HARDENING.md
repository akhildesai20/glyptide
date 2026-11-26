# Production hardening report

Date: 2026-11-26  
Scope: Critical runtime fixes (streaming, cancel, isolation, validation, queues, completion, DOM, React, docs, CI).

## Critical issue resolution

### 1. Divergent / shrinking snapshots
- **Problem:** Snapshot growth was treated as append; divergent snapshots concatenated in the DOM.
- **Root cause:** `applySnapshot` cleared accum then appended the full next text; pipe used `append` for first snapshot so engine accum stayed empty.
- **Files:** `text-ops.ts`, `stream.ts`, `engine.ts`
- **Solution:** `normalizeSnapshot` → append | replace | noop; pipe always feeds absolute text via `applySnapshot` in snapshot mode; engine replace rebuilds content without append-corruption.
- **Tests:** `site/src/stream.test.ts` (normalize, consume, pipe+DOM)
- **Result:** Pass — logical text and DOM agree.
- **Limits:** Replace remounts the generation chunk (does not surgically edit mid-string graphemes).

### 2. UTF-8 across byte chunks
- **Problem:** Per-chunk `TextDecoder` on async iterables could corrupt multibyte sequences.
- **Solution:** One persistent decoder per binary stream; `{ stream: true }` + flush.
- **Tests:** Every-byte splits for ASCII, Latin, Marathi, Hindi, Arabic, JP, CN, emoji, ZWJ, combining — ReadableStream + async iterable.
- **Result:** Pass.

### 3. Cancellation
- **Problem:** Abort only checked between chunks; blocked `read()` / `next()` hung.
- **Solution:** Race pending reads against AbortSignal; cancel readers; cooperative `iterator.return()`.
- **Tests:** Blocked async iterable + ReadableStream abort.
- **Result:** Pass.
- **Limits:** Non-cooperative upstreams may keep producing; Glyptide stops awaiting and ignores late values after destroy.

### 4. Instance isolation
- **Problem:** `ensureWaiting` reused a parent `.glyptide-waiting`.
- **Solution:** Always create owned waiting node unless host supplies one; never parent-query siblings.
- **Tests:** Multi-instance waiting + destroy + palette independence.
- **Result:** Pass.

### 5. Pattern / config validation
- **Problem:** Unknown pattern ids silently fell through to defaults.
- **Solution:** `validateCreateOptions` / `GlyptideConfigError`; pattern, preset, theme, numbers, hex.
- **Tests:** Unknown pattern, bad theme, NaN speed.
- **Result:** Pass.

### 6. Bounded queues
- **Problem:** Pace policy dropped oldest units (lost source text).
- **Solution:** Coalesce into last unit when at `maxQueue`; never discard source text.
- **Tests:** Ingress bound + full text recovery.
- **Result:** Pass.

### 7. Completion semantics
- **Contract:** `stream-end` (source done) → `settled` or `review` → `complete` as applicable. Abort → `stopped`, not success.
- **Tests:** Event order for settle + review patterns.
- **Result:** Pass for covered cases.

### 8. Host DOM / safe text
- Text nodes only; destroy removes Glyptide classes/owned waiting, preserves host classes/inline styles.
- **Tests:** Script-like text + host style preservation.

### 9. React adapter
- Dedicated waiting element; callback refs; destroy on unmount; `signal` prop.
- **Tests:** Covered indirectly via core; dedicated React Strict Mode suite still light.

### 10. Cross-platform build
- Replaced `cp` with `packages/glyptide/scripts/copy-css.mjs`.

## Public API changes
- **Added:** `normalizeSnapshot`, `applyTextOperation`, `commonPrefixLength`, `GlyptideConfigError`, `validateCreateOptions`, `validatePartialConfig`, `assertValidPatternId`, `resolvePatternId`; consume `onOperation` / `onReplace`.
- **Changed:** `applySnapshot` replace semantics; invalid pattern throws; waiting never shared.
- **Deprecated/removed:** None of the prior public surface removed in this pass (`makeEngine` remains on advanced/`glyptide/engine`).
- **Migration:** Prefer `pipeTextToGlyptide(..., { mode: "snapshot" })`; catch `GlyptideConfigError` for bad ids; pass shared `AbortSignal` to provider + Glyptide.

## Performance (gzip after harden)
| Artifact | gzip |
|----------|------|
| index.js | 30.3 KB |
| engine.js | 15.0 KB |
| styles.css | 2.4 KB |
| iife | 25.5 KB |

Budgets rebased to these baselines (+10% CI tolerance).

## Testing
- Unit/integration: **97 passed** (Vitest / happy-dom)
- Site production build: pass
- Package clean-room: see CI / `npm run test:clean-room`
- Playwright: Chromium via CI / local `npm run test:e2e`
- Firefox/WebKit: workflow `browsers.yml` (not required on every PR)

## Remaining
- **Partial:** Per-pattern computed-style matrix; React Strict Mode dedicated package tests; Firefox/WebKit always-on.
- **Non-blocking:** Further public export trimming; per-pattern tree-shaking packages.
- **Do not** publish npm or change repo visibility without explicit authorization.
