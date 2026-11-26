# Appearance system — delivery notes

## Presets (18)

**AI-inspired:** Intelligence, Gemini, Copilot, Terracotta, Jade, Prism  
**Minimal:** Graphite (default), Paper, Iris, Electric, Sakura, Matcha  
**Expressive:** Aurora (gradient demos), Sunset, Ocean, Twilight, Ember, Botanical  

Each preset defines independent `light` and `dark` `{ ink, highlight, gradientMiddle, gradientEnd }` values.

## Decoupled model

| Concern | Responsibility |
|---------|----------------|
| **Pattern** | Generation / transformation behavior (buffering, range, review) |
| **Motion** | Timing, delivery rate, easing, stream scenario |
| **Appearance** | Color mode, treatment, palette, intensity, gradient direction / motion |
| **Lifecycle** | When temporary treatments clear vs persist vs wait for review |

Aesthetic configuration **never** overrides lifecycle. Selecting Gradient or a preset only styles the temporary generation phase for transient patterns.

## Appearance lifecycle

Derived from `appearanceLifecycleFor(effect)` (optional per-pattern registry overrides):

| Lifecycle | Settlement | Behavior |
|-----------|------------|----------|
| **transient** | `piece` | Each chunk clears after its settle animation (gradients, emphasis, checkpoints, row cues) |
| **transient** | `generation` | Held until generation completes (colored insertion, underline range, replacement ink, mark, change bar) |
| **persistent** | `none` | Intentional formatting kept (e.g. heading weight) |
| **review-bound** | `accept` | Visible until Accept / Discard (ghost, review, diff, worddiff, addition) |

`persistGradient` is a showcase-only override (hero) and must not be used to force aesthetic persistence in products.

Cleanup restores **inherited** host styles — never hardcoded black/white. Temporary classes and inline paint (`grad-*`, `appear-*`, shadows, clips) are removed without rebuilding the whole document when possible.

## Compatibility

`appearanceCapabilities(effect, caseId, patternName)` drives progressive disclosure. Semantic review patterns keep insertion/deletion colors; code patterns omit highlight/glow so syntax stays readable.

Dedicated gradient effects retain unique travel motion when `colorMode` is `default`.

## Public API

```ts
import {
  appearanceLifecycleFor,
  createGlyptide,
} from "glyptide";

appearanceLifecycleFor("gradientInk"); // { lifecycle: "transient", settlement: "piece" }

createGlyptide({
  element,
  pattern: "new-word-settle",
  preset: "aurora",
  config: {
    appearance: {
      colorMode: "gradient",
      treatment: "ink",
      gradientMotion: "animated",
    },
  },
});
// After Complete: no leftover gradient classes; text uses host foreground.
```

## Bundle

No new runtime dependencies. Lifecycle helpers live in `glyptide` core.
