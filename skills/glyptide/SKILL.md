---
name: glyptide
description: Integrate Glyptide text-motion patterns into AI streaming UIs, writing assistants, inline completion, rewrites, and structured generative output. Use when animating AI responses, connecting model streams to the DOM, configuring appearance lifecycles, or selecting Glyptide patterns — not for calling LLM APIs.
license: MIT
metadata:
  author: glyptide
  version: "0.1.0"
---

# Glyptide skill

Glyptide is a **presentation layer** for generative text. It does not send prompts, need API keys, or replace your model SDK.

## Workflow

1. Inspect the host app (framework, theme, where text is rendered).
2. Identify the use case: `new` | `insert` | `replace` | `rewrite` | `continue` | `structured`.
3. Pick a pattern id from the registry (`recommendPatterns` or `/registry/patterns.json`).
4. Confirm install path: package may be unpublished — install from the monorepo `packages/glyptide` until npm release.
5. Import `glyptide` + `glyptide/styles.css` (or `@glyptide/react`).
6. Connect the **existing** text stream with `append`/`finish` or `pipeTextToGlyptide` (`delta` vs `snapshot`).
7. Configure appearance/motion; verify lifecycle (transient paint must clear).
8. Honor host theme (`theme: "inherit"`) and `prefers-reduced-motion`.
9. Wire cancel (`stop` / `AbortSignal`) and review Accept/Discard when needed.
10. Verify final DOM has no leftover `grad-*` / `appear-*` for transient patterns.

## Rules

- Reuse official patterns — do **not** recreate animations by hand.
- Never embed provider secrets in client code.
- Never invent APIs not listed in `/docs/api.md`.
- Treat model text as untrusted; do not inject raw HTML.

## Progressive references

- [API](references/api.md)
- [Patterns](references/patterns.md)
- [Streaming](references/streaming.md)
- [Appearance](references/appearance.md)
- [Accessibility](references/accessibility.md)
- [Vanilla example](examples/vanilla-js.md)
- [React example](examples/react.md)
- [AI SDK example](examples/ai-sdk.md)
