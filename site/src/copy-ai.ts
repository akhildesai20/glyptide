import {
  appearanceLifecycleFor,
  type AppearanceConfig,
  type PatternDefinition,
  type ResolvedConfig,
} from "glyptide";
import type { AppearanceState } from "./appearance";
import { appearanceConfigFromState, themeAwarePalette } from "./appearance";
import { CANONICAL_SITE_URL } from "./site-url";

const PKG = "glyptide";
const VERSION = "0.1.0";

/** Compact, pattern-scoped prompt — only what this selection needs. */
export function buildCopyForAiPrompt(input: {
  pattern: PatternDefinition;
  config: ResolvedConfig;
  appearanceState: AppearanceState;
  origin?: string;
}): string {
  const { pattern, config, appearanceState } = input;
  const origin = (
    input.origin ??
    globalThis.location?.origin ??
    CANONICAL_SITE_URL
  ).replace(/\/$/, "");
  const doc = (path: string) => (origin ? `${origin}${path}` : path);

  const appearance: AppearanceConfig =
    appearanceConfigFromState(appearanceState);
  const life = appearanceLifecycleFor(
    pattern.effect,
    pattern.caseId,
    pattern.name,
  );
  const palette = themeAwarePalette(appearanceState);

  const finalHint =
    life.lifecycle === "transient"
      ? "inherited host styles (clear grad-*/appear-*)"
      : life.lifecycle === "review-bound"
        ? "review chrome until Accept/Discard"
        : "keep intentional persistent formatting";

  // Omit unused appearance keys and empty motion noise.
  const appearCompact = Object.fromEntries(
    Object.entries(appearance).filter(([, v]) => v != null && v !== ""),
  );

  return `Implement with official Glyptide — do not hand-roll this animation.

Install: npm install ${PKG}@${VERSION} (optional @glyptide/react)
Styles: import "glyptide/styles.css"
Brief: ${doc("/docs/ai-integrate.md")}
API: ${doc("/docs/api.md")} · registry: ${doc("/registry/patterns.json")} · index: ${doc("/llms.txt")}
Do not inspect website (site/) source. Do not invent APIs or pattern ids.

Pattern: ${pattern.id}
Use case: ${pattern.caseId} · kind/effect: ${pattern.kind}/${pattern.effect}
${pattern.description}

Motion: speed=${config.speed} latency=${config.latency} scenario=${config.scenario} reduce=${config.reduce}
Appearance: ${JSON.stringify(appearCompact)}
Preset: ${appearanceState.presetId} (${appearanceState.paletteMode})
Lifecycle: ${life.lifecycle}/${life.settlement} → ${finalHint}
Palette: ${JSON.stringify(palette)}
theme: inherit

Stream: append/finish or pipeTextToGlyptide (delta|snapshot). Same AbortSignal as the model request.
a11y: prefers-reduced-motion; announce complete/review only.
Verify: completes; cancel; Accept/Discard if review; no leftover transient paint.
`.trim();
}
