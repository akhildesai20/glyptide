import type { GlyptideInstance } from "./types";

export type StreamMode = "delta" | "snapshot";

export interface ConsumeTextStreamOptions {
  /**
   * `delta` — each value is an incremental chunk (default).
   * `snapshot` — each value is the full accumulated text so far; only the suffix is forwarded.
   */
  mode?: StreamMode;
  /** Abort in-flight consumption */
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
  onError?: (error: unknown) => void;
  onDone?: () => void;
}

function decoder(): TextDecoder {
  return new TextDecoder();
}

async function* fromReadableStream(
  stream: ReadableStream<string | Uint8Array>,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const dec = decoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value == null) continue;
      yield typeof value === "string" ? value : dec.decode(value, { stream: true });
    }
    const tail = dec.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function isReadableStream(v: unknown): v is ReadableStream<string | Uint8Array> {
  return typeof ReadableStream !== "undefined" && v instanceof ReadableStream;
}

function isAsyncIterable(v: unknown): v is AsyncIterable<unknown> {
  return !!v && typeof (v as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function";
}

/**
 * Normalize common text stream shapes into an async iterable of string pieces.
 * Does not talk to any model — presentation-layer helper only.
 */
export async function* iterateTextStream(
  source:
    | string
    | AsyncIterable<string | Uint8Array>
    | ReadableStream<string | Uint8Array>
    | Iterable<string>,
): AsyncGenerator<string> {
  if (typeof source === "string") {
    if (source) yield source;
    return;
  }
  if (isReadableStream(source)) {
    yield* fromReadableStream(source);
    return;
  }
  if (isAsyncIterable(source)) {
    for await (const part of source) {
      if (part == null) continue;
      yield typeof part === "string" ? part : decoder().decode(part);
    }
    return;
  }
  if (typeof (source as Iterable<string>)[Symbol.iterator] === "function") {
    for (const part of source as Iterable<string>) {
      if (part) yield part;
    }
  }
}

/**
 * Consume a stream and invoke callbacks for each normalized delta.
 * Use `mode: "snapshot"` when the provider re-sends the full accumulated text.
 */
export async function consumeTextStream(
  source: Parameters<typeof iterateTextStream>[0],
  options: ConsumeTextStreamOptions = {},
): Promise<string> {
  const mode = options.mode ?? "delta";
  let rendered = "";
  try {
    for await (const piece of iterateTextStream(source)) {
      if (options.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      let delta = piece;
      if (mode === "snapshot") {
        if (piece.startsWith(rendered)) delta = piece.slice(rendered.length);
        else if (rendered.startsWith(piece)) delta = "";
        else {
          // Divergent snapshot — treat as full replacement delta from empty
          delta = piece;
          rendered = "";
        }
        rendered = piece.startsWith(rendered) || !rendered ? piece : rendered + delta;
      } else {
        rendered += piece;
      }
      if (delta) options.onChunk?.(delta);
    }
    options.onDone?.();
    return rendered;
  } catch (err) {
    options.onError?.(err);
    throw err;
  }
}

/**
 * Pipe a text stream into a Glyptide instance via `append` / `finish`.
 * Call `instance` setup (pattern/config) beforehand; this only streams content.
 */
export async function pipeTextToGlyptide(
  instance: GlyptideInstance,
  source: Parameters<typeof iterateTextStream>[0],
  options: ConsumeTextStreamOptions = {},
): Promise<string> {
  const signal = options.signal;
  const onAbort = () => instance.stop();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const text = await consumeTextStream(source, {
      ...options,
      onChunk: (chunk) => {
        instance.append(chunk);
        options.onChunk?.(chunk);
      },
    });
    if (!signal?.aborted) instance.finish();
    return text;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
