# Provider integration notes

Glyptide is provider-agnostic. Keep SDKs and API keys **out of the core package** and **out of the browser** when secrets are involved.

| Source | How to connect |
|--------|----------------|
| Vercel AI SDK | Stream text from a route; `pipeTextToGlyptide` on the client |
| OpenAI | Server SDK / Responses or Chat Completions stream → forward text deltas |
| Anthropic Claude | Server Messages stream → text deltas |
| Google Gemini | Server stream → text deltas |
| Ollama / LM Studio | Local HTTP stream (often OpenAI-compatible) → text deltas |
| OpenAI-compatible gateways | Same as OpenAI; still proxy through your backend if keys exist |
| Custom `fetch` / SSE | Parse events; pass only user-visible text strings |
| LangChain / LangGraph | Extract text tokens from callbacks/streams; do not dump tool payloads |

Always distinguish: **visible text**, optional **status**, **tool calls** (don’t render as prose), **errors**, **completion**.

Pass one shared `AbortSignal` to both the provider request and `pipeTextToGlyptide` / `createGlyptide({ signal })` so cancel stops network work and stream consumption. Glyptide can stop awaiting a blocked reader; it cannot forcibly kill a non-cooperative upstream without the host aborting the fetch.

Use `mode: "snapshot"` only when the provider re-sends absolute accumulated text. Divergent snapshots replace content — they must never be appended as deltas.

Verified in-repo examples:

- `skills/glyptide/examples/` (vanilla, React, AI SDK outline)
- `examples/providers/mock-streams.ts` — deterministic delta/snapshot fixtures
- `examples/recipes/` — chat / editor / research / coding / composer

Full live calls against paid APIs are not required for CI — use mock streams. Never put secrets in browser bundles.
