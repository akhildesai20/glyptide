# Streaming & host Markdown

## Real streams

```ts
g.append(chunk);           // delta — incremental piece
g.applySnapshot(fullText); // absolute accumulated snapshot
g.finish();                // stream-end → settle / review
```

Or:

```ts
await pipeTextToGlyptide(g, stream, {
  mode: "delta" | "snapshot",
  signal, // AbortSignal — same signal should cancel the model request
});
```

### Snapshot semantics

`mode: "snapshot"` (and `applySnapshot`) treat each value as the **full** text so far:

| Situation | Operation | Behavior |
|-----------|-----------|----------|
| Growth (`prev` is prefix of `next`) | `append` | Suffix only |
| Duplicate | `noop` | Ignored |
| Divergent | `replace` | Rebuild content — never append full rewrite |
| Shrinking | `replace` | Rebuild shorter content |
| Empty | `replace` | Clear generated content |

`consumeTextStream` exposes `onOperation` / `onReplace` so hosts never mistake a replacement for a delta. Logical returned text and rendered DOM must agree.

### Cancellation ownership

| Concern | Owner |
|---------|--------|
| Visual playback stop | `instance.stop()` / AbortSignal on create / pipe |
| Stream consumption stop | `AbortSignal` on `consumeTextStream` / `pipeTextToGlyptide` |
| Upstream model HTTP/SSE | **Host** — pass the **same** `AbortSignal` to the provider SDK |
| Instance teardown | `instance.destroy()` |

Glyptide races pending `reader.read()` / `iterator.next()` against the signal, cancels owned `ReadableStream` readers, and calls `iterator.return()` when available. Non-cooperative async iterables may keep producing values; Glyptide stops awaiting them and ignores late chunks (no stale DOM writes after destroy).

### Completion events

Do not collapse these:

1. `stream-end` — upstream finished delivering (`finish()`)
2. `settled` — transient visuals cleared (non-review)
3. `review` — review-bound chrome awaits accept/reject
4. `complete` — generation committed / finished (engine state)

Errors and abort emit `error` / `stopped` — not a successful `complete`.

Catch-up policies: `catchUp: "pace" | "catchUp" | "flush"`. Queues are bounded by coalescing; **source text is never discarded**.

## UTF-8

Binary streams use one persistent `TextDecoder` for the lifetime of the source. Intermediate chunks decode with `{ stream: true }`; the decoder is flushed when the source ends.

## Streamdown / Markdown hosts

**Core never depends on Streamdown or a Markdown parser.**

Recommended split:

1. Host streams and parses Markdown (Streamdown, etc.).
2. Host mounts settled blocks without remounting previous content.
3. Glyptide paces **text** or animates host-marked roots via `RenderAdapter`.

Avoid double animation: one layer paces delivery; one paints structure.

Model text is always inserted via text nodes — never `innerHTML` / `eval`.
