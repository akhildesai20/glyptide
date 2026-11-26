/**
 * Deterministic mock streams for CI and local demos.
 * Never put API secrets in browser examples.
 */

export async function* mockDeltaWords(
  text: string,
  delayMs = 20,
): AsyncGenerator<string> {
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    await new Promise((r) => setTimeout(r, delayMs));
    yield part;
  }
}

/** Simulates providers that re-send the full accumulated string */
export async function* mockSnapshotChunks(
  text: string,
  chunkSize = 8,
  delayMs = 15,
): AsyncGenerator<string> {
  let i = 0;
  while (i < text.length) {
    i = Math.min(text.length, i + chunkSize);
    await new Promise((r) => setTimeout(r, delayMs));
    yield text.slice(0, i);
  }
}

export const PROVIDER_FIXTURES = {
  openaiCompatible: {
    note: "Proxy Chat Completions stream on your server; forward text deltas only",
    sampleDelta: "Hello from an OpenAI-compatible endpoint.",
  },
  anthropic: {
    note: "Messages stream → text deltas; keep tool JSON out of Glyptide",
    sampleDelta: "Claude-style streamed prose for presentation only.",
  },
  vercelAiSdk: {
    note: "Use AI SDK on the server; pipeTextToGlyptide on the client",
    sampleDelta: "Vercel AI SDK text stream fixture.",
  },
  ollama: {
    note: "Local HTTP; often OpenAI-compatible",
    sampleDelta: "Local model token stream fixture.",
  },
} as const;
