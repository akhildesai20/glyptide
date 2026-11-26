# Streaming integration

Glyptide is a **presentation layer**. It does not call model APIs and never needs API keys.

## Normalized inputs

- Incremental string chunks via `append(chunk)` then `finish()`
- Async iterables / `ReadableStream` via `pipeTextToGlyptide(instance, stream)`
- Complete text via `start({ text })` (simulated delivery)

## Snapshot vs delta

Some SDKs re-emit the full accumulated text. Use:

```js
import { pipeTextToGlyptide } from "glyptide";

await pipeTextToGlyptide(g, stream, { mode: "snapshot", signal: controller.signal });
```

`mode: "delta"` (default) treats each value as a new suffix.

## Security

- Keep provider secrets on a server or trusted runtime — never in browser bundles.
- Treat model text as untrusted content; Glyptide renders text nodes (not HTML).
- Do not `eval` model output or inject unsanitized HTML into the document surface.
