# Glyptide

**Thoughtful text motion for generative interfaces.**

An open-source library of carefully crafted text-generation, insertion, rewriting, and transformation patterns for modern UIs.

> Every word, intentionally in motion.

## Features

- **96 patterns** across **6 use cases** (new response, inline insertion, selection rewrite, multi-paragraph rewrite, continue writing, structured output)
- Framework-agnostic core with an optional React adapter
- Simulated streaming *and* real chunk append APIs
- Decoupled appearance (color mode, treatment, palette) with explicit **transient / persistent / review-bound** lifecycles
- Theme-aware curated presets (light + dark) with contrast-aware ink
- Reduced-motion support, pause/resume, accept/discard review flows
- Tiny surface area — native CSS, Web Animations, and `requestAnimationFrame`

## Packages

| Package | Description |
|---------|-------------|
| `glyptide` | Core engine, pattern registry, styles |
| `@glyptide/react` | React component adapter |
| `site` | Documentation & playground website |

## Quick start (local)

The package is **not published to npm yet**. Install from this repository:

```bash
npm install
npm run build:lib
npm run dev
```

In another project:

```bash
npm install /path/to/glyptide/packages/glyptide
```

```js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  preset: "aurora",
  theme: "inherit",
  config: {
    appearance: {
      colorMode: "gradient",
      treatment: "ink",
      gradientMotion: "animated",
    },
  },
});

g.start({ text: "Thoughtful motion makes interfaces feel alive." });
// After completion, temporary gradient paint is cleared; text inherits host color.
```

Real streams:

```js
for await (const chunk of aiStream) {
  g.append(chunk);
}
g.finish();
```

## Appearance lifecycle

Aesthetic presets style the **generation phase**. They do not permanently recolor finished prose unless the pattern’s lifecycle is persistent or review-bound.

| Lifecycle | Examples | After completion |
|-----------|----------|------------------|
| Transient | Gradient ink, emphasis, checkpoints, colored insertion | Returns to inherited host styles |
| Persistent | Heading weight | Intentional formatting kept |
| Review-bound | Ghost, diffs, tracked addition | Stays until Accept / Discard |

See [APPEARANCE.md](./APPEARANCE.md).

## Accessibility

- Honors `prefers-reduced-motion`
- Status announcements via live regions in the playground
- Semantic revision colors stay independent of aesthetic palettes

## Browser support

Modern evergreen browsers (Chromium, Firefox, Safari) with Web Animations API. Gradient OKLab interpolation is progressive enhancement.

## Website

The playground lives in `site/` and is intended for local development (`npm run dev`). A public deployment is not required for library use.

## Prototype

The original interaction study is preserved at [`prototype/text-in-motion-v5.html`](./prototype/text-in-motion-v5.html) as historical reference. The production source of truth is `packages/glyptide`.

## Documentation

- [API reference](./docs/api.md)
- [Appearance system](./APPEARANCE.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
- [Audit notes](./AUDIT.md)

## License

MIT — see [LICENSE](./LICENSE).
