# Streaming (skill reference)

Canonical: `/docs/streaming.md`.

- Delta chunks → `append` + `finish`, or `pipeTextToGlyptide(..., { mode: "delta" })`
- Accumulated snapshots → `{ mode: "snapshot" }` to avoid duplication
- Cancel with `AbortSignal` → `stop()`
- Glyptide never calls the model
