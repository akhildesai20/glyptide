# Streaming & host Markdown

## Real streams

```ts
const session = g.beginStream(); // invalidate prior producers
g.append(chunk, session);        // delta — incremental piece
g.applySnapshot(fullText, session);
g.finish(session);               // stream-end → drain → settle / review
```

Or:

```ts
await pipeTextToGlyptide(g, stream, {
  mode: "delta" | "snapshot",
  signal, // AbortSignal — same signal should cancel the model request
});
// pipeTextToGlyptide calls beginStream() and binds the session automatically
```

### Generation sessions

| Action | Effect |
|--------|--------|
| `beginStream()` | New session id; clears live surface; invalidates prior sessions |
| `append(text, session?)` | Rejects stale `session`; does **not** auto-restart from Stopped/Complete |
| `stop` / `reset` / `destroy` | Invalidate the active session |
| Overlapping streams | Later `beginStream()` wins; earlier session ids are ignored |

Starting a **new** stream after stop/complete requires `beginStream()` (or `pipeTextToGlyptide` / `start()`).

### Snapshot semantics

`mode: "snapshot"` (and `applySnapshot`) treat each value as the **full** text so far:

| Situation | Operation | Behavior |
|-----------|-----------|----------|
| Growth (`prev` is prefix of `next`) | `append` | Suffix only |
| Duplicate | `noop` | Ignored |
| Divergent | `replace` | Rebuild content — never append full rewrite |
| Shrinking | `replace` | Rebuild shorter content |
| Empty (`""`) | `replace` | Clear generated content (sync iterables preserve `""`) |

### Incremental segmentation

Chunks are transport boundaries, not reveal units. Glyptide retains an incomplete trailing boundary (word/sentence/paragraph/line) across `append` calls and flushes remainder on `finish()`.

**Token / grapheme mode:** holds only *extensible* trailing clusters (ZWJ joiners, lone regional indicators, emoji presentation selectors, combining marks / Indic virama). Stable Latin/CJK clusters are eligible to reveal immediately. On source stall, any still-held fragment is flushed so slow streams are not delayed indefinitely.

**Sentence fallback** (no `Intl.Segmenter`): Latin `.!?` plus common CJK/fullwidth terminators (`。！？…`). Locale-complete segmentation requires `Intl.Segmenter`.

Atomic patterns (`kind: "all"`) hold all text until finish.

### Catch-up policies

| Policy | Behavior |
|--------|----------|
| `pace` | Reveal on a motion/speed cadence; **continues draining** during upstream pauses |
| `catchUp` | Normal cadence; batch/accelerate when backlog grows; may skip decorative animation under overload |
| `flush` | Reveal promptly; minimize per-unit animation |

Source text is never discarded. Queues coalesce when bounded. Stall detection fires only when the **source** is idle and the **visual queue is empty** (not while pacing).

### Pause

While `Paused`, appends and snapshot replacements stay buffered — the DOM does not change. `resume()` applies any held snapshot, then drains the reveal queue. `finish()` during pause marks the session complete; settlement runs after resume drains.

### Cancellation ownership

| Concern | Owner |
|---------|--------|
| Visual playback stop | `instance.stop()` / AbortSignal on create / pipe |
| Stream consumption stop | `AbortSignal` on `consumeTextStream` / `pipeTextToGlyptide` |
| Pipe abort/error | Stops **only** the pipe’s own session — never a newer `beginStream()` |
| Already-aborted signal | Throws before `beginStream` — does not disturb an active session |
| Upstream model HTTP/SSE | **Host** — pass the **same** `AbortSignal` to the provider SDK |
| Instance teardown | `instance.destroy()` |

Abort listeners are removed when each pending read settles (no per-chunk listener leaks). Owned `ReadableStream` readers are cancelled; async iterators get cooperative `return()`.

### Mixed string / binary streams

When a binary chunk is followed by a string chunk, the UTF-8 decoder is **flushed** before the string so pending multibyte state is never reordered after string data. Prefer homogeneous streams when possible.

### Completion events

1. `stream-end` — upstream finished (`finish()`)
2. Remaining units drain per policy
3. `settled` or `review` — visual settlement / review-ready
4. `complete` — committed when applicable

Errors and abort emit failure/stopped paths — not successful `complete`. Upstream `throw` after partial content calls `onError` and does not call `onDone`.

## UTF-8

Binary streams use one persistent `TextDecoder` for the lifetime of the source. Intermediate chunks decode with `{ stream: true }`; the decoder is flushed when the source ends.

## Host CSS / DOM

Production styles target `.glyptide-document` and `.glyptide-waiting` only. `.glyptide-document` **inherits** host `font-family`, `font-size`, `line-height`, and `letter-spacing` (with `white-space: pre-wrap` for layout). Showcase typography lives in site CSS, not the package. `destroy()` removes classes Glyptide added and clears generated content; pre-existing host classes remain.

### Unicode segmentation

Incremental reveal uses grapheme-aware buffering (ZWJ sequences, skin tones, flags, combining marks, Indic conjuncts) so animation units never split mid-cluster. Where `Intl.Segmenter` is available, word/sentence modes prefer it (including non-Western terminators such as `。！？`); otherwise a documented terminator/heuristic fallback is used. Eligible completed units are not held indefinitely waiting for more source text — only incomplete clusters/words remain buffered.

### React adapter (`@glyptide/react`)

`speed` / `latency` / `reduce` / `appearance` / `motion` update in place without resetting the session. Pattern/theme/config changes recreate the instance. See `packages/glyptide-react/README.md`.

## Streamdown / Markdown hosts

**Core never depends on Streamdown or a Markdown parser.** Model text is always inserted via text nodes — never `innerHTML` / `eval`.
