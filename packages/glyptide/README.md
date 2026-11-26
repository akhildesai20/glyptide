# glyptide

Thoughtful text generation, editing, and transformation patterns for modern interfaces.

```bash
# Until published to npm:
npm install ./packages/glyptide
```

```js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
});

g.start({ text: "Every word, intentionally in motion." });
```

See the repository README and `docs/api.md` for the full API.

MIT License.
