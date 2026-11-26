# RC stabilization report

Commit series after `812cef5`. Private release-candidate verification.

## Critical issue matrix

| Issue | Root cause | Resolution | Tests | Result | Limits |
|-------|------------|------------|-------|--------|--------|
| Abort listener accumulation | `Promise.race` + `whenAborted` left `once` listeners | Per-race add/remove on settle | 10k chunks; abort mid-stream | Pass | — |
| Stale stream restart | `append` from Stopped/Complete | `beginStream` + session checks | stop/reset/destroy/overlap | Pass | Hosts must beginStream after stop |
| Incomplete paced drain | Ingress only took on push | Independent `scheduleDrain` | pace after large chunk | Pass | Timing approximate under reduce/instant |
| Cross-chunk split | `splitText` per chunk | `createIncrementalSplitter` | partitions + unicode | Pass | Phrase hold is heuristic |
| CSS collisions | Bare `.document`/`.waiting` | Namespace to `.glyptide-*` | Host class fixture | Pass | Site migrated |
| Host class removal | Blind `classList.remove` | Track added classes | preexisting `.document` | Pass | Generated content cleared on destroy |
| setAppearance partial mutate | Mutate before validate | Validate → resolve → apply | invalid theme | Pass | — |
| Fixed stallMs | Const at ingress create | `setStallMs` + source-vs-pace | thresholds | Pass | — |
| Empty sync snapshots | Falsy filter | Yield `""` | `["Hello",""]` | Pass | — |
| Mixed binary/string | Decoder reorder risk | Flush decoder on type switch | partial UTF-8 then string | Pass | Prefer homogeneous streams |

## Architecture notes

- **Sessions:** monotonic id; `pipeTextToGlyptide` binds automatically.
- **Scheduling:** ingress queue + drain timer; motion `deliveryIntervalMs` / speed influence cadence.
- **Segmentation:** boundary buffer independent of providers.
- **DOM:** `.glyptide-document` owned surface; destroy removes only Glyptide-added classes.

## Bundle (gzip)

| Artifact | Before (~812cef5) | After |
|----------|-------------------|-------|
| index.js | 30.3 KB | 32.8 KB |
| engine.js | 15.0 KB | 17.3 KB |
| styles.css | 2.4 KB | 2.2 KB |
| iife | 25.5 KB | 27.3 KB |

Increase justified by session isolation, paced drain, incremental split.

## Remaining

- Non-blocking: surgical common-prefix DOM reuse on divergent snapshots; dedicated React Strict Mode package tests; Firefox/WebKit always-on (optional workflow).
- Unsupported: animating arbitrary rich-text editor DOM in-place without a host adapter.
