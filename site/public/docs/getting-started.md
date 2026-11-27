# Getting started

The npm package `glyptide@0.1.0` is on the public registry:

```bash
npm install glyptide
# optional React adapter:
npm install @glyptide/react
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
