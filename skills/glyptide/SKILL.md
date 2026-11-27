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

**Website:** https://glyptide.vercel.app  

**Start with the minimal brief** ([`docs/ai-integrate.md`](../../docs/ai-integrate.md) in-repo, or https://glyptide.vercel.app/docs/ai-integrate.md). Load other references only when needed.

## Do not

- Do **not** browse the playground website source (`site/src`) to learn the API.
- Do **not** reimplement animations by reading the engine unless you are fixing the library.
- Do **not** invent pattern ids, install targets, or APIs missing from docs / registry.
- Do **not** pull `llms-full.txt` or the entire pattern list into context unless required.

## Workflow

1. Inspect the host app (framework, theme, where text renders).
2. Use case: `new` | `insert` | `replace` | `rewrite` | `continue` | `structured`.
3. Pick a pattern via `recommendPatterns` or a **targeted** registry lookup — not the whole inventory.
4. Install from npm: `npm install glyptide` (and `@glyptide/react` when needed) — app projects need the package, not a full monorepo clone.
5. Import `glyptide` + `glyptide/styles.css` (or `@glyptide/react`).
6. Connect the existing stream with `append`/`finish` or `pipeTextToGlyptide` (`delta` vs `snapshot`).
7. Configure appearance/motion; verify lifecycle (transient paint clears).
8. Honor `theme: "inherit"` and `prefers-reduced-motion`.
9. Wire cancel (`stop` / `AbortSignal`) and Accept/Discard when review-bound.
10. Confirm no leftover `grad-*` / `appear-*` after Complete for transient patterns.

## Progressive references

- [Integrator brief](../../docs/ai-integrate.md)
- [API](references/api.md)
- [Patterns](references/patterns.md)
- [Streaming](references/streaming.md)
- [Appearance](references/appearance.md)
- [Accessibility](references/accessibility.md)
- [Vanilla](examples/vanilla-js.md) · [React](examples/react.md) · [AI SDK](examples/ai-sdk.md)
