#!/usr/bin/env node
/**
 * Generate AI-facing static assets from the built glyptide package.
 * Run after `npm run build:lib`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "packages/glyptide/dist/index.js");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "packages/glyptide/package.json"), "utf8"),
);

if (!fs.existsSync(distIndex)) {
  console.error("Missing packages/glyptide/dist — run npm run build:lib first");
  process.exit(1);
}

const g = await import(pathToFileURL(distIndex).href);
const {
  patterns,
  cases,
  patternCount,
  appearanceCapabilities,
  appearanceLifecycleFor,
  defaultAppearanceConfig,
  PALETTE_PRESETS,
  PRESET_CATEGORIES,
} = g;

const outPublic = path.join(root, "site/public");
const outDocs = path.join(outPublic, "docs");
const outRegistry = path.join(outPublic, "registry");
const outSchemas = path.join(outPublic, "schemas");
const outSkill = path.join(outPublic, "skills/glyptide");

for (const d of [outDocs, outRegistry, outSchemas, outSkill, path.join(outSkill, "references"), path.join(outSkill, "examples")]) {
  fs.mkdirSync(d, { recursive: true });
}

const caseTitle = Object.fromEntries(cases.map((c) => [c.id, c.title]));

function registryEntry(p) {
  const caps = appearanceCapabilities(p.effect, p.caseId, p.name);
  const life = appearanceLifecycleFor(p.effect, p.caseId, p.name);
  const defAppear = defaultAppearanceConfig(p.effect, p.caseId, p.name);
  const review = ["ghost", "review", "diff", "worddiff", "addition"].includes(
    p.effect,
  );
  return {
    id: p.id,
    name: p.name,
    version: pkg.version,
    category: p.caseId,
    categoryLabel: caseTitle[p.caseId] || p.caseId,
    subcategory: p.group,
    description: p.description,
    kind: p.kind,
    effect: p.effect,
    index: p.index,
    recommendedUseCases: [p.caseId],
    deliveryGranularity: p.kind,
    streamingCompatible: p.kind !== "all",
    supportedAppearanceTreatments: caps.treatments,
    supportedColorModes: caps.colorModes,
    defaultAppearance: defAppear,
    appearanceLifecycle: life.lifecycle,
    appearanceSettlement: life.settlement,
    expectedFinalAppearance:
      life.lifecycle === "transient"
        ? "inherited-host-styles"
        : life.lifecycle === "review-bound"
          ? "review-chrome-until-decision"
          : "persistent-intentional-formatting",
    themeSupport: ["light", "dark", "system", "inherit"],
    reducedMotion: "honored",
    reviewBehavior: review ? "accept-or-reject" : "none",
    motionCapabilities: {
      usesSpring: p.effect === "spring" || p.effect === "block",
      spatial: ["spring", "block", "wipe", "fade"].includes(p.effect),
      supportsMotionPresets: true,
    },
    cancellationBehavior:
      p.caseId === "replace" || p.caseId === "rewrite" || review
        ? "restore-original"
        : "preserve-partial",
    preservesSemanticColors: caps.preservesSemanticColors,
    preservesSyntaxHighlight: caps.preservesSyntaxHighlight,
    dedicatedGradient: caps.dedicatedGradient,
    whenToUse: p.description,
    whenNotToUse: [
      caps.preservesSyntaxHighlight
        ? "Avoid highlight/glow treatments that wash syntax colors."
        : null,
      review
        ? "Do not auto-commit without an accept/discard UI."
        : "Avoid if decorative motion would interrupt dense reading.",
      p.kind === "all"
        ? "Prefer token/word patterns for progressive streaming UX."
        : null,
    ].filter(Boolean),
    documentationRef: `/docs/patterns.md#${p.id}`,
  };
}

const registry = {
  name: "glyptide",
  version: pkg.version,
  // Omit wall-clock timestamps so `check:ai-docs` / CI remain deterministic.
  patternCount,
  cases,
  presets: PALETTE_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
  })),
  presetCategories: PRESET_CATEGORIES,
  patterns: patterns.map(registryEntry),
};

fs.writeFileSync(
  path.join(outRegistry, "patterns.json"),
  JSON.stringify(registry, null, 2) + "\n",
);

/* —— JSON Schemas —— */
const appearanceSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://glyptide.local/schemas/appearance.json",
  title: "GlyptideAppearance",
  type: "object",
  additionalProperties: false,
  properties: {
    colorMode: { type: "string", enum: ["default", "solid", "gradient"], default: "default" },
    treatment: { type: "string", enum: ["ink", "highlight", "underline", "glow"], default: "ink" },
    intensity: { type: "number", minimum: 0, maximum: 1, default: 1 },
    gradientDirection: { type: "number", minimum: 0, maximum: 360, default: 110 },
    gradientMotion: { type: "string", enum: ["static", "animated"], default: "animated" },
  },
  required: ["colorMode", "treatment"],
};

const configSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://glyptide.local/schemas/config.json",
  title: "GlyptideConfig",
  type: "object",
  additionalProperties: false,
  properties: {
    caseId: {
      type: "string",
      enum: ["new", "insert", "replace", "rewrite", "continue", "structured"],
    },
    patternId: { type: "string" },
    patternName: { type: "string" },
    kind: {
      type: "string",
      enum: ["token", "word", "phrase", "sentence", "paragraph", "line", "all"],
    },
    effect: { type: "string" },
    source: { type: "string" },
    text: { type: "string" },
    speed: { type: "number", minimum: 1, maximum: 500, default: 54 },
    latency: { type: "number", minimum: 0, maximum: 10000, default: 600 },
    waitingThresholdMs: { type: "number", minimum: 0, maximum: 5000, default: 180 },
    stallMs: { type: "number", minimum: 0, maximum: 60000, default: 2500 },
    catchUp: {
      type: "string",
      enum: ["pace", "catchUp", "flush"],
      default: "catchUp",
    },
    scenario: {
      type: "string",
      enum: ["steady", "bursts", "stall", "interrupt"],
      default: "steady",
    },
    reduce: { type: "boolean", default: false },
    motion: {
      type: "object",
      additionalProperties: false,
      properties: {
        preset: {
          type: "string",
          enum: [
            "natural",
            "quiet",
            "instant",
            "fluid",
            "precise",
            "editorial",
            "expressive",
          ],
        },
        revealMs: { type: "number", minimum: 0, maximum: 5000 },
        deliveryIntervalMs: { type: "number", minimum: 0, maximum: 2000 },
        initialOpacity: { type: "number", minimum: 0, maximum: 1 },
        blurPx: { type: "number", minimum: 0, maximum: 24 },
        displacementPx: { type: "number", minimum: 0, maximum: 64 },
        spring: {
          type: "object",
          additionalProperties: false,
          properties: {
            stiffness: { type: "number" },
            damping: { type: "number" },
          },
        },
      },
    },
    preset: { type: ["string", "null"] },
    theme: {
      type: "string",
      enum: ["light", "dark", "system", "inherit"],
      default: "inherit",
    },
    palette: {
      type: "object",
      properties: {
        light: { $ref: "#/$defs/palette" },
        dark: { $ref: "#/$defs/palette" },
      },
      required: ["light", "dark"],
      additionalProperties: false,
    },
    appearance: { $ref: "appearance.json" },
    persistGradient: { type: "boolean", default: false },
  },
  $defs: {
    palette: {
      type: "object",
      additionalProperties: false,
      required: ["ink", "highlight", "gradientMiddle", "gradientEnd"],
      properties: {
        ink: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
        highlight: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
        gradientMiddle: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
        gradientEnd: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
      },
    },
  },
};

const patternMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://glyptide.local/schemas/pattern-meta.json",
  title: "GlyptidePatternMeta",
  type: "object",
  required: ["id", "name", "category", "kind", "effect", "appearanceLifecycle"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    category: { type: "string" },
    subcategory: { type: ["string", "null"] },
    description: { type: "string" },
    kind: { type: "string" },
    effect: { type: "string" },
    appearanceLifecycle: {
      type: "string",
      enum: ["transient", "persistent", "review-bound"],
    },
    appearanceSettlement: {
      type: "string",
      enum: ["piece", "generation", "accept", "none"],
    },
  },
  additionalProperties: true,
};

fs.writeFileSync(
  path.join(outSchemas, "appearance.json"),
  JSON.stringify(appearanceSchema, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outSchemas, "config.json"),
  JSON.stringify(configSchema, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outSchemas, "pattern-meta.json"),
  JSON.stringify(patternMetaSchema, null, 2) + "\n",
);

/* —— Markdown docs —— */
const publicationStatus = JSON.parse(
  fs.readFileSync(path.join(root, "docs/publication-status.json"), "utf8"),
);
const installNote = publicationStatus.npmPublished
  ? `The npm package \`glyptide@${pkg.version}\` is on the public registry:

\`\`\`bash
npm install glyptide
# optional React adapter:
npm install @glyptide/react
\`\`\``
  : `The npm package \`glyptide@${pkg.version}\` is **not published to the public registry yet**. Install from the repository:

\`\`\`bash
# From a built clone (relative path works on Windows / macOS / Linux):
npm install ./packages/glyptide
# or from a monorepo clone:
npm install
npm run build:lib
\`\`\``;

const gettingStarted = `# Getting started

${installNote}

\`\`\`js
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  preset: "graphite",
  theme: "inherit",
});

g.start({ text: "Thoughtful motion makes interfaces feel alive." });
\`\`\`

Real streams use \`append\` / \`finish\` or \`pipeTextToGlyptide\`.
`;

const apiMd = fs.readFileSync(path.join(root, "docs/api.md"), "utf8");
const appearanceMd = fs.readFileSync(path.join(root, "APPEARANCE.md"), "utf8");

const patternsMd = [
  `# Pattern registry`,
  ``,
  `Version ${pkg.version} · ${patternCount} patterns.`,
  ``,
  ...cases.map((c) => {
    const list = patterns.filter((p) => p.caseId === c.id);
    return [
      `## ${c.title} (\`${c.id}\`)`,
      ``,
      c.desc,
      ``,
      ...list.map((p) => {
        const life = appearanceLifecycleFor(p.effect, p.caseId, p.name);
        return `### ${p.name} {\n#${p.id}\n}\n\n- **id:** \`${p.id}\`\n- **kind:** \`${p.kind}\`\n- **effect:** \`${p.effect}\`\n- **lifecycle:** \`${life.lifecycle}\` / \`${life.settlement}\`\n- ${p.description}\n`;
      }),
    ].join("\n");
  }),
].join("\n");

// Fix heading format - use proper markdown anchors
const patternsMdFixed = [
  `# Pattern registry`,
  ``,
  `Version ${pkg.version} · ${patternCount} patterns. Machine-readable: [/registry/patterns.json](/registry/patterns.json).`,
  ``,
];
for (const c of cases) {
  patternsMdFixed.push(`## ${c.title} (\`${c.id}\`)`, ``, c.desc, ``);
  for (const p of patterns.filter((x) => x.caseId === c.id)) {
    const life = appearanceLifecycleFor(p.effect, p.caseId, p.name);
    patternsMdFixed.push(
      `### ${p.name}`,
      ``,
      `<a id="${p.id}"></a>`,
      ``,
      `- **id:** \`${p.id}\``,
      `- **kind:** \`${p.kind}\``,
      `- **effect:** \`${p.effect}\``,
      `- **lifecycle:** \`${life.lifecycle}\` / \`${life.settlement}\``,
      `- ${p.description}`,
      ``,
    );
  }
}

const a11yMd = `# Accessibility

- Honor \`prefers-reduced-motion\` (\`reduce: true\` or OS preference).
- Announce completion and review readiness — not every token.
- Keep semantic revision colors (\`--added\`, \`--removed\`) independent of aesthetic presets.
- Transient appearance must return to inherited host styles after settlement.
- Provide keyboard Accept / Discard for review-bound patterns.
`;

fs.writeFileSync(path.join(outDocs, "getting-started.md"), gettingStarted);
fs.writeFileSync(path.join(outDocs, "api.md"), apiMd);
fs.writeFileSync(path.join(outDocs, "appearance.md"), appearanceMd);
fs.writeFileSync(path.join(outDocs, "patterns.md"), patternsMdFixed.join("\n"));
fs.copyFileSync(path.join(root, "docs/streaming.md"), path.join(outDocs, "streaming.md"));
fs.writeFileSync(path.join(outDocs, "accessibility.md"), a11yMd);
fs.copyFileSync(path.join(root, "design.md"), path.join(outDocs, "design.md"));
fs.copyFileSync(path.join(root, "docs/providers.md"), path.join(outDocs, "providers.md"));
fs.copyFileSync(path.join(root, "docs/mcp.md"), path.join(outDocs, "mcp.md"));
fs.copyFileSync(
  path.join(root, "docs/ai-integrate.md"),
  path.join(outDocs, "ai-integrate.md"),
);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
copyDir(path.join(root, "skills/glyptide"), outSkill);

/* —— llms.txt —— */
const llmsTxt = `# Glyptide

> Thoughtful text motion for generative interfaces — ${patternCount} patterns across 6 use cases. Model-independent presentation layer for AI streaming UIs.

Glyptide animates and structures generated text. It does not call AI providers and requires no API keys.
${installNote.split("\n").slice(0, 1).join("")}

## Start here (minimal context)

- [AI / integrator brief](/docs/ai-integrate.md): Install + integrate without reading website source — **fetch this first**
- Prefer progressive retrieval. Do **not** inspect \`site/\` playground source or engine internals unless maintaining the library.
- Do **not** load [llms-full.txt](/llms-full.txt) unless you need exhaustive pattern ids.

## Docs (on demand)

- [Getting started](/docs/getting-started.md): Install (local package) and first \`createGlyptide\` call
- [Public API](/docs/api.md): \`createGlyptide\`, instance methods, appearance lifecycle
- [Streaming](/docs/streaming.md): \`append\` / \`pipeTextToGlyptide\`, delta vs snapshot
- [Appearance](/docs/appearance.md): Presets, color modes, transient vs review-bound lifecycles
- [Patterns](/docs/patterns.md): All ${patternCount} pattern ids with lifecycle metadata
- [Accessibility](/docs/accessibility.md): Reduced motion, semantics, announcements
- [Design guidance](/docs/design.md): Motion and reading-comfort principles
- [Full documentation](/llms-full.txt): Consolidated AI-readable reference (large)

## Machine-readable

- [Pattern registry JSON](/registry/patterns.json): Versioned metadata for every pattern
- [Config JSON Schema](/schemas/config.json): Validate Glyptide configuration
- [Appearance JSON Schema](/schemas/appearance.json): Appearance options
- [Pattern meta schema](/schemas/pattern-meta.json): Registry entry shape

## Agent resources

- [Agent skill](/skills/glyptide/SKILL.md): Portable Agent Skills package for coding agents
- [For AI page](/for-ai.html): Human + agent discovery page

## Examples

- [Vanilla JS](/skills/glyptide/examples/vanilla-js.md)
- [React](/skills/glyptide/examples/react.md)
- [AI SDK streaming](/skills/glyptide/examples/ai-sdk.md)
- [Provider notes](/docs/providers.md)
`;

fs.writeFileSync(path.join(outPublic, "llms.txt"), llmsTxt);

const patternIdList = patterns.map((p) => `- \`${p.id}\` — ${p.name} (${p.caseId}, ${p.kind}, lifecycle ${appearanceLifecycleFor(p.effect, p.caseId, p.name).lifecycle})`).join("\n");

const llmsFull = `# Glyptide — full AI reference

> Version ${pkg.version}. ${patternCount} patterns. MIT. Presentation layer only — no model calls, no API keys.

## Overview

Glyptide is an open-source library of text generation, insertion, rewriting, and transformation motion patterns for generative interfaces.

Separate concerns: **Pattern** (behavior) · **Motion** (timing) · **Appearance** (paint) · **Lifecycle** (when paint clears).

## Installation

${installNote}

Import styles once: \`import "glyptide/styles.css"\`.

## Quick start

\`\`\`js
import { createGlyptide, pipeTextToGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  preset: "aurora",
  theme: "inherit",
  config: {
    appearance: { colorMode: "gradient", treatment: "ink", gradientMotion: "animated" },
  },
});

// Simulated
g.start({ text: "Hello from Glyptide." });

// Or real stream (delta chunks)
// await pipeTextToGlyptide(g, asyncIterableOfStrings, { signal });
\`\`\`

## Public API (summary)

- \`createGlyptide({ element, pattern?, config?, speed?, latency?, reduce?, preset?, palette?, theme?, onStatus?, onChange?, onAnnounce? })\`
- Instance: \`start\`, \`append\`, \`finish\`, \`reset\`, \`pause\`, \`resume\`, \`stop\`, \`accept\`, \`reject\`, \`palette\`, \`setAppearance\`, \`destroy\`
- Registry: \`patterns\`, \`getPattern\`, \`getPatternsByCase\`, \`searchPatterns\`, \`recommendPatterns\`
- Streams: \`iterateTextStream\`, \`consumeTextStream\`, \`pipeTextToGlyptide\`
- Appearance: \`appearanceCapabilities\`, \`appearanceLifecycleFor\`, \`defaultAppearanceConfig\`, \`PALETTE_PRESETS\`

## Appearance lifecycle

| Lifecycle | Settlement | Final state |
|-----------|------------|-------------|
| transient | piece \\| generation | Inherited host styles — no leftover gradient/solid paint |
| persistent | none | Intentional formatting kept (e.g. heading weight) |
| review-bound | accept | Review chrome until Accept/Discard |

Aesthetic presets never override lifecycle.

## Pattern identifiers

${patternIdList}

## Color presets

${PALETTE_PRESETS.map((p) => `- \`${p.id}\` — ${p.name} (${p.category})`).join("\n")}

## Common mistakes

1. Recreating animations manually instead of using a pattern id
2. Leaving gradient classes after completion (use lifecycle — already handled by engine)
3. Using \`mode: "delta"\` with snapshot SDKs (causes duplicated text)
4. Embedding provider API keys in the browser
5. Assuming npm \`glyptide\` is published — install from the package path/tarball until release
6. Overriding host foreground with hardcoded black/white after settle
7. Reading \`site/\` website source to discover the public API

## Performance

Prefer CSS + Web Animations. Pause off-screen previews. Avoid new runtime dependencies in core.

## Context tip

For new integrations, start with \`/docs/ai-integrate.md\` instead of this full file.
`;

fs.writeFileSync(path.join(outPublic, "llms-full.txt"), llmsFull);

console.log("Generated AI docs:");
console.log("  registry patterns:", registry.patterns.length);
console.log("  → site/public/llms.txt");
console.log("  → site/public/llms-full.txt");
console.log("  → site/public/registry/patterns.json");
console.log("  → site/public/schemas/*");
console.log("  → site/public/docs/*");
