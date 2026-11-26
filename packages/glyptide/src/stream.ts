import type { GlyptideInstance } from "./types";
import {
  applyTextOperation,
  normalizeSnapshot,
  type TextOperation,
} from "./text-ops";

export type StreamMode = "delta" | "snapshot";

export type { TextOperation } from "./text-ops";
export { normalizeSnapshot, applyTextOperation, commonPrefixLength } from "./text-ops";

export interface ConsumeTextStreamOptions {
  /**
   * `delta` — each value is an incremental chunk (default).
   * `snapshot` — each value is the full accumulated text so far.
   */
  mode?: StreamMode;
  /** Abort in-flight consumption */
  signal?: AbortSignal;
  /**
   * Receives append deltas only. Never receives divergent replacements —
   * use `onReplace` / `onOperation` for those.
   */
  onChunk?: (chunk: string) => void;
  /** Called when a snapshot must replace existing content (never via append) */
  onReplace?: (text: string) => void;
  /** Full operation stream (preferred) */
  onOperation?: (op: TextOperation) => void;
  onError?: (error: unknown) => void;
  onDone?: () => void;
}

function isReadableStream(v: unknown): v is ReadableStream<string | Uint8Array> {
  return typeof ReadableStream !== "undefined" && v instanceof ReadableStream;
}

function isAsyncIterable(v: unknown): v is AsyncIterable<unknown> {
  return !!v && typeof (v as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function";
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/**
 * Reject when `signal` aborts — races against pending reader.read() / iter.next()
 * so cancellation is not stuck waiting forever on a blocked upstream.
 */
function whenAborted(signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (!signal) return;
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    signal.addEventListener("abort", () => reject(abortError()), { once: true });
  });
}

async function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    // Prevent unhandled rejection from the abandoned promise
    void promise.catch(() => undefined);
    throw abortError();
  }
  return Promise.race([promise, whenAborted(signal)]);
}

async function* fromReadableStream(
  stream: ReadableStream<string | Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  const onAbort = () => {
    void reader.cancel("aborted").catch(() => undefined);
  };
  if (signal?.aborted) {
    reader.releaseLock();
    throw abortError();
  }
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    while (true) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await raceAbort(reader.read(), signal);
      if (done) break;
      if (value == null) continue;
      yield typeof value === "string" ? value : dec.decode(value, { stream: true });
    }
    const tail = dec.decode();
    if (tail) yield tail;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* already released / cancelled */
    }
  }
}

/**
 * Normalize common text stream shapes into an async iterable of string pieces.
 * Uses one persistent TextDecoder for the lifetime of a binary stream.
 *
 * AbortSignal races pending reads. For async iterables, `iterator.return()` is
 * requested cooperatively — non-cooperative upstreams may keep running, but
 * Glyptide stops awaiting them and ignores subsequent values.
 */
export async function* iterateTextStream(
  source:
    | string
    | AsyncIterable<string | Uint8Array>
    | ReadableStream<string | Uint8Array>
    | Iterable<string>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (signal?.aborted) throw abortError();
  if (typeof source === "string") {
    if (source) yield source;
    return;
  }
  if (isReadableStream(source)) {
    yield* fromReadableStream(source, signal);
    return;
  }
  if (isAsyncIterable(source)) {
    const dec = new TextDecoder();
    const iter = source[Symbol.asyncIterator]();
    const onAbort = () => {
      void Promise.resolve(iter.return?.("aborted")).catch(() => undefined);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      while (true) {
        if (signal?.aborted) throw abortError();
        const next = raceAbort(iter.next(), signal);
        let result: IteratorResult<unknown>;
        try {
          result = await next;
        } catch (err) {
          void Promise.resolve(iter.return?.("aborted")).catch(() => undefined);
          throw err;
        }
        const { done, value } = result;
        if (done) break;
        if (value == null) continue;
        if (typeof value === "string") yield value;
        else yield dec.decode(value as Uint8Array, { stream: true });
      }
      const tail = dec.decode();
      if (tail) yield tail;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    return;
  }
  if (typeof (source as Iterable<string>)[Symbol.iterator] === "function") {
    for (const part of source as Iterable<string>) {
      if (signal?.aborted) throw abortError();
      if (part) yield part;
    }
  }
}

function emitOp(op: TextOperation, options: ConsumeTextStreamOptions): void {
  options.onOperation?.(op);
  if (op.type === "noop") return;
  if (op.type === "append") {
    if (op.text) options.onChunk?.(op.text);
  } else {
    options.onReplace?.(op.text);
  }
}

/**
 * Consume a stream and emit normalized append/replace operations.
 * Divergent snapshots never become append deltas.
 */
export async function consumeTextStream(
  source: Parameters<typeof iterateTextStream>[0],
  options: ConsumeTextStreamOptions = {},
): Promise<string> {
  const mode = options.mode ?? "delta";
  let rendered = "";
  try {
    if (options.signal?.aborted) throw abortError();
    for await (const piece of iterateTextStream(source, options.signal)) {
      if (options.signal?.aborted) throw abortError();
      if (mode === "snapshot") {
        const op = normalizeSnapshot(rendered, piece);
        rendered = applyTextOperation(rendered, op);
        emitOp(op, options);
      } else if (piece) {
        const op: TextOperation = { type: "append", text: piece };
        rendered = applyTextOperation(rendered, op);
        emitOp(op, options);
      }
    }
    if (options.signal?.aborted) throw abortError();
    options.onDone?.();
    return rendered;
  } catch (err) {
    options.onError?.(err);
    throw err;
  }
}

/**
 * Pipe a text stream into a Glyptide instance.
 * Snapshot mode always feeds absolute text through applySnapshot so divergent
 * / shrinking snapshots replace rather than appending onto a stale buffer.
 */
export async function pipeTextToGlyptide(
  instance: GlyptideInstance,
  source: Parameters<typeof iterateTextStream>[0],
  options: ConsumeTextStreamOptions = {},
): Promise<string> {
  const mode = options.mode ?? "delta";
  const signal = options.signal;
  const onAbort = () => {
    try {
      instance.stop();
    } catch {
      /* destroyed */
    }
  };
  if (signal?.aborted) {
    onAbort();
    throw abortError();
  }
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    let absolute = "";
    const text = await consumeTextStream(source, {
      mode,
      signal,
      onError: options.onError,
      onDone: options.onDone,
      onOperation: (op) => {
        absolute = applyTextOperation(absolute, op);
        if (op.type !== "noop") {
          if (mode === "snapshot") {
            instance.applySnapshot(absolute);
          } else if (op.type === "append" && op.text) {
            instance.append(op.text);
          } else if (op.type === "replace") {
            instance.applySnapshot(op.text);
          }
        }
        options.onOperation?.(op);
      },
      onChunk: options.onChunk,
      onReplace: options.onReplace,
    });
    if (!signal?.aborted) instance.finish();
    return text;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
