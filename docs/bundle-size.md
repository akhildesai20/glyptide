# Bundle size

Measured from the built `glyptide` package with `npm run size` (Windows, release candidate tooling). Figures are **minified on-disk sizes**, plus **gzip** and **Brotli**. They are not runtime memory or network timings.

**Packed** npm tarball (`glyptide@0.1.0`): ~185 KB (includes all listed entries + typings + LICENSE/README).

| Entry | Minified | gzip | Brotli |
|-------|---------|-----:|------:|
| `index.js` (full API + registry) | 179.0 KB | 34.2 KB | 27.7 KB |
| `index.cjs` | 181.2 KB | 34.5 KB | 28.0 KB |
| `engine.js` (no registry JSON) | 75.7 KB | 18.4 KB | 15.9 KB |
| `glyptide.iife.js` | 124.6 KB | 28.2 KB | 23.2 KB |
| `patterns.js` | 77.0 KB | 9.4 KB | 6.8 KB |
| `presets.js` | 4.8 KB | 1.8 KB | 1.5 KB |
| `styles.css` | 12.7 KB | 2.3 KB | 2.0 KB |

Prefer `import { makeEngine } from "glyptide/engine"` when the client does not need the full pattern registry.

`@glyptide/react` is a thin adapter (~4 KB packed) and peers on `glyptide` + React.
