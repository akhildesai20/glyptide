/** Public lifecycle events for host applications */
export type GlyptideEvent =
  | "waiting"
  | "first-content"
  | "generating"
  | "stalled"
  | "stream-end"
  | "settled"
  | "review"
  | "complete"
  | "stopped"
  | "error";

export type GlyptideEventHandler = (
  event: GlyptideEvent,
  detail?: unknown,
) => void;

export interface EventBus {
  on: (event: GlyptideEvent | "*", handler: GlyptideEventHandler) => () => void;
  emit: (event: GlyptideEvent, detail?: unknown) => void;
  clear: () => void;
}

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<GlyptideEventHandler>>();

  return {
    on(event, handler) {
      const key = event;
      let set = handlers.get(key);
      if (!set) {
        set = new Set();
        handlers.set(key, set);
      }
      set.add(handler);
      return () => {
        set!.delete(handler);
      };
    },
    emit(event, detail) {
      const direct = handlers.get(event);
      if (direct) {
        for (const h of [...direct]) h(event, detail);
      }
      const all = handlers.get("*");
      if (all) {
        for (const h of [...all]) h(event, detail);
      }
    },
    clear() {
      handlers.clear();
    },
  };
}

/** Map engine status strings to public events where 1:1 */
export function eventForEngineState(
  state: string,
): GlyptideEvent | null {
  switch (state) {
    case "Waiting":
      return "waiting";
    case "Generating":
      return "generating";
    case "Waiting for text":
      return "stalled";
    case "Review":
      return "review";
    case "Complete":
      return "complete";
    case "Stopped":
      return "stopped";
    default:
      return null;
  }
}
