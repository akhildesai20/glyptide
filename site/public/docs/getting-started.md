# Getting started

The npm package `glyptide@0.1.0` is **not published to the public registry yet**. Install from the repository:

```bash
# From a built clone (relative path works on Windows / macOS / Linux):
npm install ./packages/glyptide
# or from a monorepo clone:
npm install
npm run build:lib
```

```js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  preset: "graphite",
  theme: "inherit",
});

g.start({ text: "Thoughtful motion makes interfaces feel alive." });
```

Real streams use `append` / `finish` or `pipeTextToGlyptide`.
