/**
 * Legacy SPA hash / query compatibility → multi-page destinations.
 * Call early on the home page before mounting heavy UI when redirecting.
 */
import { readPlaygroundParams } from "./url-state";

const PLAYGROUND_KEYS = [
  "case",
  "pattern",
  "speed",
  "latency",
  "scenario",
  "embed",
  "compare",
  "motion",
] as const;

function playgroundQueryFromLocation(): string {
  const q = new URLSearchParams(location.search);
  const out = new URLSearchParams();
  for (const k of PLAYGROUND_KEYS) {
    const v = q.get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

/**
 * @returns true if a navigation was triggered (caller should abort further init)
 */
export function applyHomeCompatRedirects(): boolean {
  const params = readPlaygroundParams();
  const hash = location.hash;

  // Embed mode always belongs on the full playground
  if (params.embed === "1") {
    location.replace(`/playground/${playgroundQueryFromLocation()}${hash || ""}`);
    return true;
  }

  // Deep-link query params for the playground (legacy SPA URLs)
  if (
    params.case ||
    params.pattern ||
    params.speed ||
    params.latency ||
    params.scenario ||
    params.motion ||
    params.compare
  ) {
    location.replace(`/playground/${playgroundQueryFromLocation()}${hash.startsWith("#pattern-") ? hash : ""}`);
    return true;
  }

  if (hash === "#playground" || hash === "#play") {
    location.replace("/playground/");
    return true;
  }
  if (hash === "#library" || hash.startsWith("#pattern-")) {
    location.replace(`/playground/${hash}`);
    return true;
  }
  if (hash === "#docs") {
    location.replace("/docs/");
    return true;
  }
  // #recipes and #top stay on home
  return false;
}
