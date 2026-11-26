/**
 * Bounded stream ingress: separates network arrival from visual reveal.
 * Core uses this for real `append` paths; simulation keeps its own scheduler.
 */

export type CatchUpPolicy = "pace" | "catchUp" | "flush";

export interface StreamIngressOptions {
  /** Max queued reveal units before catch-up kicks in */
  maxQueue?: number;
  policy?: CatchUpPolicy;
  /** Stall threshold after last append (ms); 0 disables */
  stallMs?: number;
  onStall?: () => void;
  onDrain?: () => void;
  now?: () => number;
}

export interface StreamIngress {
  push: (units: string[]) => string[];
  /** Units ready to reveal immediately under current policy */
  take: (max?: number) => string[];
  readonly size: number;
  readonly lastAppendAt: number;
  markAppend: () => void;
  checkStall: () => boolean;
  flush: () => string[];
  clear: () => void;
  setPolicy: (policy: CatchUpPolicy) => void;
}

export function createStreamIngress(
  options: StreamIngressOptions = {},
): StreamIngress {
  const maxQueue = Math.max(8, options.maxQueue ?? 256);
  const stallMs = options.stallMs ?? 0;
  const now = options.now ?? (() => Date.now());
  let policy: CatchUpPolicy = options.policy ?? "catchUp";
  const queue: string[] = [];
  let lastAppendAt = 0;
  let stalled = false;

  function push(units: string[]): string[] {
    markAppend();
    if (!units.length) return [];
    if (policy === "flush") {
      return units;
    }
    for (const u of units) {
      if (queue.length >= maxQueue) {
        // Bound queue length without discarding source text — coalesce into last unit.
        // Decorative pacing may skip; content must remain complete.
        const last = queue[queue.length - 1];
        queue[queue.length - 1] = last + u;
      } else {
        queue.push(u);
      }
    }
    if (policy === "catchUp" && queue.length > maxQueue / 2) {
      return take(queue.length);
    }
    return take(1);
  }

  function take(max = 1): string[] {
    if (!queue.length) return [];
    const n = Math.min(Math.max(1, max), queue.length);
    const out = queue.splice(0, n);
    if (!queue.length) options.onDrain?.();
    return out;
  }

  function flush(): string[] {
    const all = queue.splice(0, queue.length);
    if (all.length) options.onDrain?.();
    return all;
  }

  function markAppend(): void {
    lastAppendAt = now();
    if (stalled) stalled = false;
  }

  function checkStall(): boolean {
    if (!stallMs || !lastAppendAt) return false;
    if (now() - lastAppendAt >= stallMs) {
      if (!stalled) {
        stalled = true;
        options.onStall?.();
      }
      return true;
    }
    return false;
  }

  return {
    push,
    take,
    get size() {
      return queue.length;
    },
    get lastAppendAt() {
      return lastAppendAt;
    },
    markAppend,
    checkStall,
    flush,
    clear() {
      queue.length = 0;
      stalled = false;
    },
    setPolicy(next) {
      policy = next;
    },
  };
}
