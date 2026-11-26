# Glyptide recipes

Offline, deterministic reference integrations. No live AI providers.

| Recipe | File | Demonstrates |
|--------|------|----------------|
| Chat | `chat.ts` | Anticipation thresholds, streaming, AbortSignal |
| Editor | `editor.ts` | Insert, ghost review, accept/reject |
| Research | `research.ts` | Structured sections |
| Coding | `coding.ts` | Code line streaming |
| Composer | `composer.ts` | Draft + regenerate composition |

## Markdown / Streamdown boundary

Glyptide does **not** parse Markdown. Use a host renderer (e.g. Streamdown) for AST/DOM, then either:

1. Feed plain text into Glyptide for paced reveal, or
2. Implement a `RenderAdapter` that commits structured DOM and returns `true` so Glyptide only animates marked nodes.

See `packages/glyptide/src/render-adapter.ts` and `docs/streaming.md`.

## Sequences (documented configs, not a second engine)

Compose waiting → generate → optional review with existing APIs:

```ts
createGlyptide({
  pattern: "new-word-settle",
  waitingThresholdMs: 180, // suppress flash if first token is fast
  stallMs: 2500,
  motion: { preset: "quiet" }, // conversational
});
```
