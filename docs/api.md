# Glyptide API reference

## `createGlyptide(options)`

Creates an independent Glyptide instance bound to a DOM element.

```ts
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out")!,
  pattern: "new-word-settle",
  speed: 54,
  latency: 400,
  colors: { ink: "#17633c", highlight: "#a6d7b5" },
  onStatus: (state) => console.log(state),
});
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `element` | `HTMLElement` | Required. Generation surface. |
| `waiting` | `HTMLElement \| null` | Optional waiting/status row. |
| `pattern` | `string` | Pattern id from the registry. |
| `config` | `Partial<GlyptideConfig>` | Overrides for case, kind, effect, source, text. |
| `speed` | `number` | Simulated chars/sec (default 54). |
| `latency` | `number` | Initial wait in ms. |
| `reduce` | `boolean` | Force reduced motion. |
| `colors` | `GenerationColors \| null` | Flat colors for the active theme (legacy). Prefer `preset` / `palette`. |
| `preset` | `string \| null` | Curated preset id (`graphite`, `aurora`, `intelligence`, …). |
| `palette` | `ThemeAwarePalette \| null` | Explicit `{ light, dark }` generation palettes. |
| `theme` | `ThemePreference` | `light` \| `dark` \| `system` \| `inherit` (default). |
| `onStatus` | `(state) => void` | Status text callback. |
| `onAnnounce` | `(message) => void` | Accessibility announcements. |
| `onChange` | `(state) => void` | State machine changes. |

### Instance methods

| Method | Description |
|--------|-------------|
| `start(config?)` | Begin simulated generation. |
| `append(chunk)` | Append text from a real stream. |
| `finish()` | Complete a real stream. |
| `reset(config?)` | Restore ready state. |
| `pause()` / `resume()` | Pause and resume simulation. |
| `stop()` | Cancel; preserve original or partial text by case. |
| `accept()` / `reject()` | Resolve review states. |
| `palette()` | Re-apply colors after theme change. |
| `setAppearance({ preset, palette, theme, colors, appearance })` | Update palette / aesthetic appearance without restarting the stream. |
| `destroy()` | Clean up timers, animations, DOM. |

## Appearance lifecycle

```ts
import { appearanceLifecycleFor } from "glyptide";

appearanceLifecycleFor("gradientInk");
// → { lifecycle: "transient", settlement: "piece" }

appearanceLifecycleFor("ghost");
// → { lifecycle: "review-bound", settlement: "accept" }
```

Aesthetic `appearance.colorMode` styles the temporary generation phase only. Transient patterns restore inherited host foreground after settlement; they never leave gradient or solid paint behind unless `persistGradient` is set for a showcase surface.

## Appearance presets and visual treatment

Pattern motion (buffering, easing, delivery) is independent of aesthetic appearance.

```ts
import {
  PALETTE_PRESETS,
  appearanceCapabilities,
  createGlyptide,
  getPreset,
} from "glyptide";

createGlyptide({
  element,
  pattern: "new-word-settle",
  preset: "aurora",
  theme: "system",
  config: {
    appearance: {
      colorMode: "gradient", // default | solid | gradient
      treatment: "ink", // ink | highlight | underline | glow
      intensity: 1,
      gradientDirection: 110,
      gradientMotion: "animated", // or static
    },
  },
});

// Capability matrix for progressive UI disclosure
appearanceCapabilities("spring", "new", "Word settle");

createGlyptide({
  element,
  palette: {
    light: getPreset("aurora")!.light,
    dark: getPreset("aurora")!.dark,
  },
  theme: "inherit", // follow host app theme, not necessarily OS
});
```

Generation palettes are scoped to the Glyptide instance and do **not** replace semantic revision tokens (`--added`, `--removed`, `--selection`). Dedicated gradient patterns (`gradientInk`, etc.) remain available for unique travel motion; otherwise apply gradient as an appearance treatment on compatible patterns.

### States

`Ready` · `Waiting` · `Generating` · `Waiting for text` · `Paused` · `Interrupted` · `Review` · `Complete` · `Stopped`

## Pattern registry

```ts
import {
  patterns,
  patternCount,
  getPattern,
  getPatternsByCase,
  searchPatterns,
} from "glyptide";
```

Pattern ids look like `new-word-settle`, `insert-marked-insertion`.

## Real streaming example

```ts
const g = createGlyptide({
  element,
  pattern: "new-phrase-fade",
});

async function consume(stream: AsyncIterable<string>) {
  for await (const chunk of stream) {
    g.append(chunk);
  }
  g.finish();
}
```

## React

```tsx
import { Glyptide } from "@glyptide/react";
import "glyptide/styles.css";

<Glyptide pattern="new-word-settle" text="Hello." autoPlay />
```

## Accessibility

- Honors `prefers-reduced-motion`.
- Prefer announcing completion and review readiness, not every token.
- Keep a static accessible summary for decorative hero motion.
- Insertion/deletion semantics use both color and decoration.

## Browser support

Modern evergreen browsers with Web Animations API. `Intl.Segmenter` is used when available; grapheme/sentence splitting falls back otherwise.
