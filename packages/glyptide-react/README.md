# @glyptide/react

Thin React adapter for [glyptide](https://glyptide.vercel.app) (peer dependency).

```bash
npm install glyptide @glyptide/react
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

## Reactive props

| Prop | Behavior on change |
|------|--------------------|
| `speed`, `latency`, `reduce`, `appearance`, `motion` | Hot-applied via `setAppearance` — **does not** recreate the instance or reset the active session |
| `pattern`, `preset`, `palette`, `theme`, `colors`, `config` | Recreates the Glyptide instance (new session ownership) |
| `source` / `text` + `autoPlay` | Starts a new pipe/play for the current instance |
| `onEvent` | Re-subscribed; previous listener cleaned up |

Strict Mode double-mount must not leave orphan `.glyptide-waiting` nodes. Always call through the imperative handle (`beginStream` / `append` / `finish`) for multi-chunk streams so session IDs stay coherent across hot updates.

See the `glyptide` package README and https://glyptide.vercel.app/docs/ for the full API.  
Do not invent props beyond the published adapter surface.

MIT License.
