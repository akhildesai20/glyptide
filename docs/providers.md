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

Verified in-repo examples: `skills/glyptide/examples/` (vanilla, React, AI SDK outline). Full live calls against paid APIs are not required for CI — use mock streams.
