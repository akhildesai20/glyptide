# @glyptide/react

Thin React adapter for [glyptide](https://www.npmjs.com/package/glyptide) (peer dependency).

```bash
# Until public npm release, install local packages (from repo root):
npm install ./packages/glyptide ./packages/glyptide-react
```

```tsx
import { Glyptide } from "@glyptide/react";
import "glyptide/styles.css";

export function StreamView() {
  return (
    <Glyptide pattern="new-word-settle" theme="inherit">
      Thoughtful motion for generative UIs.
    </Glyptide>
  );
}
```

See the `glyptide` package README and repository `docs/api.md` for the full API.  
Do not invent props beyond the published adapter surface.

MIT License.
