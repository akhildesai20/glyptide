# Vanilla JS + Glyptide

```bash
npm install glyptide
```

```html
<div id="out" class="document"></div>
```

```js
import { createGlyptide, pipeTextToGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  theme: "inherit",
  preset: "graphite",
});

// Example: async iterable of deltas from your backend
async function* mockStream() {
  for (const part of ["Thoughtful ", "motion ", "for interfaces."]) {
    yield part;
    await new Promise((r) => setTimeout(r, 40));
  }
}

const ac = new AbortController();
await pipeTextToGlyptide(g, mockStream(), { signal: ac.signal });
```

Cancellation: `ac.abort()` → Glyptide `stop()`.
