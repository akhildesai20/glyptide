# Vercel AI SDK → Glyptide

Glyptide does not depend on the AI SDK. Use the SDK (or any provider) on the server, stream **text**, then pipe deltas into Glyptide.

```ts
// Client — text only, no API keys
import { createGlyptide, pipeTextToGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out")!,
  pattern: "new-word-settle",
  theme: "inherit",
});

const res = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ prompt }) });
if (!res.ok || !res.body) throw new Error("stream failed");

// Many AI SDK routes expose a text stream / UI message stream.
// Convert to string deltas before piping. If the body re-sends full text, use mode: "snapshot".
await pipeTextToGlyptide(g, res.body, { mode: "delta" });
```

Do **not** render raw SSE frames, tool-call JSON, or hidden reasoning as prose. Extract the visible text channel first.

Server routes that talk to OpenAI / Anthropic / Google / Ollama must keep credentials server-side.
