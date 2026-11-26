export interface PlaygroundParams {
  case?: string;
  pattern?: string;
  speed?: string;
  latency?: string;
  scenario?: string;
}

export function readPlaygroundParams(): PlaygroundParams {
  const q = new URLSearchParams(location.search);
  return {
    case: q.get("case") || undefined,
    pattern: q.get("pattern") || undefined,
    speed: q.get("speed") || undefined,
    latency: q.get("latency") || undefined,
    scenario: q.get("scenario") || undefined,
  };
}

export function writePlaygroundParams(partial: PlaygroundParams): void {
  const url = new URL(location.href);
  for (const [k, v] of Object.entries(partial)) {
    if (v == null || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  history.replaceState(null, "", url);
}
