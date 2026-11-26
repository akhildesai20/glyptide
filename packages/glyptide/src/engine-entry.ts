/**
 * Lightweight entry: engine + streaming helpers without the pattern registry JSON.
 * Prefer `import { createGlyptide } from "glyptide"` for normal DX.
 */
export { makeEngine } from "./engine";
export type { InternalEngine } from "./engine";
export { splitText } from "./split";
export { springFrames } from "./spring";
export {
  consumeTextStream,
  iterateTextStream,
  pipeTextToGlyptide,
} from "./stream";
export { createStreamIngress } from "./stream-ingress";
export { createEventBus } from "./events";
export { resolveMotion, MOTION_PRESET_IDS } from "./motion";
export {
  appearanceLifecycleFor,
  clearTransientAppearance,
  settlePieceAppearance,
  TRANSIENT_APPEARANCE_CLASSES,
} from "./lifecycle";
export {
  appearanceCapabilities,
  defaultAppearanceConfig,
  resolveVisualTreatment,
} from "./appearance";
export { applyPalette, resolveGenerationColors } from "./palette";
export * from "./pattern-flags";
