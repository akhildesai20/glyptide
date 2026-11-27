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

function isSyncIterable(v: unknown): v is Iterable<unknown> {
  return !!v && typeof (v as Iterable<unknown>)[Symbol.iterator] === "function";
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/**
 * Race a promise against AbortSignal with guaranteed listener cleanup.
 * One listener is attached for the race and removed when either side settles.
 */
export async function raceAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    void promise.catch(() => undefined);
    throw abortError();
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      void promise.catch(() => undefined);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(err);
      },
    );
  });
}

/** Test/instrumentation hook: count addEventListener("abort") calls when set */
export let __abortListenerAdds = 0;
export let __abortListenerRemoves = 0;
export function __resetAbortListenerStats(): void {
  __abortListenerAdds = 0;
  __abortListenerRemoves = 0;
}

function instrumentedAdd(
  signal: AbortSignal,
  fn: EventListener,
  opts?: AddEventListenerOptions,
): void {
  __abortListenerAdds += 1;
  signal.addEventListener("abort", fn, opts);
}

function instrumentedRemove(signal: AbortSignal, fn: EventListener): void {
  __abortListenerRemoves += 1;
  signal.removeEventListener("abort", fn);
}

/** Instrumented race used by stream consumption (same cleanup guarantees) */
async function raceAbortTracked<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    void promise.catch(() => undefined);
    throw abortError();
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      instrumentedRemove(signal, onAbort);
      void promise.catch(() => undefined);
      reject(abortError());
    };
    instrumentedAdd(signal, onAbort);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        instrumentedRemove(signal, onAbort);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        instrumentedRemove(signal, onAbort);
        reject(err);
      },
    );
  });
}

/**
 * Decode mixed string/Uint8Array streams.
 * Policy: when switching from binary → string, flush the decoder first so
 * pending multibyte state is never reordered after a string chunk.
 */
function createMixedDecoder() {
  const dec = new TextDecoder();
  let binaryOpen = false;
  return {
    push(value: string | Uint8Array): string[] {
      const out: string[] = [];
      if (typeof value === "string") {
        if (binaryOpen) {
          const tail = dec.decode();
          binaryOpen = false;
          if (tail) out.push(tail);
        }
        out.push(value);
      } else {
        binaryOpen = true;
        const piece = dec.decode(value, { stream: true });
        if (piece) out.push(piece);
      }
      return out;
    },
    flush(): string {
      if (!binaryOpen) return "";
      binaryOpen = false;
      return dec.decode();
    },
  };
}

async function* fromReadableStream(
  stream: ReadableStream<string | Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = createMixedDecoder();
  let cancelled = false;
  const onAbort = () => {
    if (cancelled) return;
    cancelled = true;
    void reader.cancel("aborted").catch(() => undefined);
  };
  if (signal?.aborted) {
    reader.releaseLock();
    throw abortError();
  }
  if (signal) instrumentedAdd(signal, onAbort, { once: true });
  try {
    while (true) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await raceAbortTracked(reader.read(), signal);
      if (done) break;
      if (value == null) continue;
      for (const piece of decoder.push(value)) yield piece;
    }
    const tail = decoder.flush();
    if (tail) yield tail;
  } finally {
    if (signal) instrumentedRemove(signal, onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* already released / cancelled */
    }
  }
}

/**
 * Normalize common text stream shapes into an async iterable of string pieces.
 * Empty strings are preserved (required for snapshot deletion).
 */
export async function* iterateTextStream(
  source:
    | string
    | AsyncIterable<string | Uint8Array>
    | ReadableStream<string | Uint8Array>
    | Iterable<string | Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (signal?.aborted) throw abortError();
  if (typeof source === "string") {
    yield source;
    return;
  }
  if (isReadableStream(source)) {
    yield* fromReadableStream(source, signal);
    return;
  }
  if (isAsyncIterable(source)) {
    const decoder = createMixedDecoder();
    const iter = source[Symbol.asyncIterator]();
    let returned = false;
    const returnOnce = () => {
      if (returned) return;
      returned = true;
      void Promise.resolve(iter.return?.("aborted")).catch(() => undefined);
    };
    const onAbort = () => returnOnce();
    if (signal) instrumentedAdd(signal, onAbort, { once: true });
    try {
      while (true) {
        if (signal?.aborted) throw abortError();
        let result: IteratorResult<unknown>;
        try {
          result = await raceAbortTracked(iter.next(), signal);
        } catch (err) {
          returnOnce();
          throw err;
        }
        const { done, value } = result;
        if (done) break;
        if (value == null) continue;
        if (typeof value !== "string" && !(value instanceof Uint8Array)) {
          throw new TypeError(
            `Unsupported stream chunk type: ${Object.prototype.toString.call(value)}`,
          );
        }
        for (const piece of decoder.push(value as string | Uint8Array)) {
          yield piece;
        }
      }
      const tail = decoder.flush();
      if (tail) yield tail;
    } finally {
      if (signal) instrumentedRemove(signal, onAbort);
    }
    return;
  }
  if (isSyncIterable(source)) {
    const decoder = createMixedDecoder();
    for (const part of source) {
      if (signal?.aborted) throw abortError();
      if (part == null) continue;
      if (typeof part !== "string" && !(part instanceof Uint8Array)) {
        throw new TypeError(
          `Unsupported stream chunk type: ${Object.prototype.toString.call(part)}`,
        );
      }
      for (const piece of decoder.push(part as string | Uint8Array)) {
        yield piece;
      }
    }
    const tail = decoder.flush();
    if (tail) yield tail;
    return;
  }
  throw new TypeError(
    "Unsupported stream source. Expected string, Iterable, AsyncIterable, or ReadableStream.",
  );
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
 * Upstream failures call onError and rethrow — never onDone / success.
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
 * Opens a generation session so delayed chunks after stop/reset are ignored.
 */
export async function pipeTextToGlyptide(
  instance: GlyptideInstance,
  source: Parameters<typeof iterateTextStream>[0],
  options: ConsumeTextStreamOptions = {},
): Promise<string> {
  const mode = options.mode ?? "delta";
  const signal = options.signal;
  // Already aborted: never touch the instance (may belong to a newer session)
  if (signal?.aborted) throw abortError();
  const session = instance.beginStream();
  /** Stop only if this pipe's session is still the active one */
  const stopIfOwned = () => {
    try {
      if (instance.session === session) instance.stop();
    } catch {
      /* destroyed */
    }
  };
  const onAbort = () => stopIfOwned();
  if (signal) instrumentedAdd(signal, onAbort, { once: true });
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
            instance.applySnapshot(absolute, session);
          } else if (op.type === "append" && op.text) {
            instance.append(op.text, session);
          } else if (op.type === "replace") {
            instance.applySnapshot(op.text, session);
          }
        }
        options.onOperation?.(op);
      },
      onChunk: options.onChunk,
      onReplace: options.onReplace,
    });
    if (!signal?.aborted) instance.finish(session);
    return text;
  } catch (err) {
    // Failure: stop this session without emitting successful settlement
    stopIfOwned();
    throw err;
  } finally {
    if (signal) instrumentedRemove(signal, onAbort);
  }
}
