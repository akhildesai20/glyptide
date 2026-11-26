# Glyptide design & motion guidance

This document explains *why* patterns behave the way they do. It is Glyptide’s UX guidance for humans and agents — not a formal industry standard.

## Principles

1. **Reading first.** Motion should help people follow change, not decorate every glyph.
2. **Restraint.** Prefer opacity and subtle emphasis for ordinary prose; reserve spatial springs for meaningful arrivals.
3. **Stability.** Existing text should not reanimate, jump lines, or flicker when new content arrives.
4. **Honesty.** Temporary generation paint must not pretend to be permanent document styling.
5. **Host respect.** Finished text inherits the application’s foreground, typography, and theme.

## Four concerns

| Concern | Meaning | Example |
|---------|---------|---------|
| **Pattern** | What generation *does* (insert, rewrite, stream list…) | `insert-marked-insertion` |
| **Motion** | Timing, buffering, easing, stream scenario | word buffer, speed 54 |
| **Appearance** | Temporary paint (solid / gradient / highlight…) | `colorMode: "gradient"` |
| **Lifecycle** | When paint clears | transient → inherited styles |

**Appearance customization must not change a pattern’s intended final state.** A gradient on `new-word-settle` may travel during generation; after completion, text returns to the host color.

## Good vs undesirable

**Good**

- Incoming phrase briefly emphasized, then settles while later phrases continue.
- Ghost suggestion stays muted until Accept.
- Code lines keep syntax colors; glow treatments are unavailable.
- Reduced motion skips travel animations but keeps content correct.

**Undesirable**

- Gradient text left transparent/`background-clip` after completion.
- Hardcoding `#000` / `#fff` when clearing paint.
- Auto-dismissing review chrome on a timer.
- Re-playing the whole paragraph to “fix” styles.
- Embedding model API keys in the browser to “make Glyptide work.”

## Streaming cadence

- Prefer complete words/phrases for prose; tokens are fine for chat-like edges.
- Buffer (`kind: "all"`) when partial code or tables would be misleading.
- Support irregular chunk boundaries; never assume chunks align to words.

## Layout & structure

- Inline insertion should minimize surrounding reflow (reserved gap / placeholders when needed).
- Structured output should preserve lists, code whitespace, tables, outlines — do not flatten to plain text just to animate.
- Multi-line highlights use `box-decoration-break: clone` so wraps stay continuous.

## Gradients & themes

- Gradients communicate *activity*, then settle or clear per lifecycle.
- Light and dark presets are independent; `theme: "inherit"` follows the host, not necessarily the OS.
- Semantic add/remove colors stay accessible and separate from aesthetic palettes.

## Accessibility

- Honor `prefers-reduced-motion`.
- Announce completion and review readiness, not every token.
- Keyboard paths for Accept / Discard.
