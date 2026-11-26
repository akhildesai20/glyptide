/**
 * Bounded stream ingress: separates network arrival from visual reveal.
 * Core uses this for real `append` paths; simulation keeps its own scheduler.
 */

export type CatchUpPolicy = "pace" | "catchUp" | "flush";

export interface StreamIngressOptions {
  /** Max queued reveal units before coalescing / catch-up */
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
  readonly stallMs: number;
  markAppend: () => void;
  checkStall: () => boolean;
  /** True when source may be stalled AND queue is empty (not merely pacing) */
  checkSourceStall: (hasPendingVisual: boolean) => boolean;
  flush: () => string[];
  clear: () => void;
  setPolicy: (policy: CatchUpPolicy) => void;
  setStallMs: (ms: number) => void;
  /** Suggested batch size for the next drain tick */
  suggestedTake: () => number;
}

export function createStreamIngress(
  options: StreamIngressOptions = {},
): StreamIngress {
  const maxQueue = Math.max(8, options.maxQueue ?? 256);
  let stallMs = options.stallMs ?? 0;
  const now = options.now ?? (() => Date.now());
  let policy: CatchUpPolicy = options.policy ?? "catchUp";
  const queue: string[] = [];
  let lastAppendAt = 0;
  let hasAppend = false;
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
        const last = queue[queue.length - 1];
        queue[queue.length - 1] = last + u;
      } else {
        queue.push(u);
      }
    }
    // Immediate reveal hint (scheduler continues draining independently)
    return take(suggestedTake());
  }

  function suggestedTake(): number {
    if (!queue.length) return 0;
    if (policy === "flush") return queue.length;
    if (policy === "catchUp") {
      if (queue.length >= maxQueue / 2) return Math.min(queue.length, 16);
      if (queue.length >= maxQueue / 4) return Math.min(queue.length, 4);
      return 1;
    }
    // pace: one unit per drain tick
    return 1;
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
    hasAppend = true;
    if (stalled) stalled = false;
  }

  function checkStall(): boolean {
    return checkSourceStall(false);
  }

  function checkSourceStall(hasPendingVisual: boolean): boolean {
    if (!stallMs || !hasAppend) return false;
    // Pacing a nonempty visual queue is not a source stall
    if (hasPendingVisual) return false;
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
    suggestedTake,
    get size() {
      return queue.length;
    },
    get lastAppendAt() {
      return lastAppendAt;
    },
    get stallMs() {
      return stallMs;
    },
    markAppend,
    checkStall,
    checkSourceStall,
    flush,
    clear() {
      queue.length = 0;
      stalled = false;
      lastAppendAt = 0;
      hasAppend = false;
    },
    setPolicy(next) {
      policy = next;
    },
    setStallMs(ms) {
      stallMs = Math.max(0, ms);
      stalled = false;
    },
  };
}
