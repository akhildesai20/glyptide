import {
  appearanceLifecycleFor,
  type AppearanceConfig,
  type PatternDefinition,
  type ResolvedConfig,
} from "glyptide";
import type { AppearanceState } from "./appearance";
import { appearanceConfigFromState, themeAwarePalette } from "./appearance";

const PKG = "glyptide";
const VERSION = "0.1.0";

export function buildCopyForAiPrompt(input: {
  pattern: PatternDefinition;
  config: ResolvedConfig;
  appearanceState: AppearanceState;
}): string {
  const { pattern, config, appearanceState } = input;
  const appearance: AppearanceConfig = appearanceConfigFromState(appearanceState);
  const life = appearanceLifecycleFor(
    pattern.effect,
    pattern.caseId,
    pattern.name,
  );
  const palette = themeAwarePalette(appearanceState);

  return `Implement Glyptide (official library) — do not recreate animations manually.

Package: ${PKG}@${VERSION} (not on npm yet — install from the Glyptide monorepo packages/glyptide)
Styles: import "glyptide/styles.css"
Docs: /docs/getting-started.md · /docs/api.md · /llms.txt · /registry/patterns.json

Pattern: ${pattern.id}
Use case: ${pattern.caseId}
Kind / effect: ${pattern.kind} / ${pattern.effect}
Description: ${pattern.description}

Motion: speed=${config.speed}, latency=${config.latency}, scenario=${config.scenario}, reduce=${config.reduce}

Appearance:
${JSON.stringify(appearance, null, 2)}
Preset: ${appearanceState.presetId} (${appearanceState.paletteMode})
Lifecycle: ${life.lifecycle} / settlement ${life.settlement}
Expected final appearance: ${
    life.lifecycle === "transient"
      ? "inherited host styles (no leftover grad-* / appear-*)"
      : life.lifecycle === "review-bound"
        ? "review chrome until Accept/Discard"
        : "persistent intentional formatting only"
  }

Theme-aware palette (do not hardcode a single theme):
${JSON.stringify(palette, null, 2)}
theme: inherit (follow host app)

Streaming: use append/finish or pipeTextToGlyptide; choose mode delta vs snapshot to avoid duplicated text. No API keys in the browser.

Accessibility: honor prefers-reduced-motion; announce completion/review; keep semantic add/remove colors.

Verify: generation completes; cancel works; for review patterns Accept/Discard work; transient paint cleared after Complete.
`;
}
