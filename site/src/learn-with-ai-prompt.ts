/**
 * Canonical “Learn with AI” prompt — single source for landing + docs CTAs.
 * Keep in sync with published docs, llms assets, and packaging status.
 */

import { CANONICAL_SITE_URL } from "./site-url";

export const LEARN_WITH_AI_PROMPT_VERSION = 4;

/** Absolute site origin for AI-readable links (deployment-aware). */
export function siteOrigin(
  origin = typeof location !== "undefined" ? location.origin : "",
): string {
  return (origin || CANONICAL_SITE_URL || "").replace(/\/$/, "");
}

function abs(origin: string, path: string): string {
  const base = siteOrigin(origin);
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/**
 * Build the full clipboard prompt. Pass `origin` in tests; browsers use
 * `location.origin` so links match the current deployment (local / preview / prod).
 */
export function buildLearnWithAiPrompt(origin = siteOrigin()): string {
  const brief = abs(origin, "/docs/ai-integrate.md");
  const docs = abs(origin, "/docs/");
  const gettingStarted = abs(origin, "/docs/getting-started.md");
  const api = abs(origin, "/docs/api.md");
  const streaming = abs(origin, "/docs/streaming.md");
  const appearance = abs(origin, "/docs/appearance.md");
  const llms = abs(origin, "/llms.txt");
  const llmsFull = abs(origin, "/llms-full.txt");
  const forAi = abs(origin, "/for-ai.html");
  const registry = abs(origin, "/registry/patterns.json");
  const skill = abs(origin, "/skills/glyptide/SKILL.md");
  const playground = abs(origin, "/playground/");
  const github = "https://github.com/akhildesai20/glyptide";

  return `I want to understand and use Glyptide, a lightweight text-motion library for generative interfaces.

I may be a product designer, app builder, developer or someone building applications with AI-assisted tools. Do not assume I have programming expertise.

Help me understand:

- What Glyptide is and what problems it solves.
- How it differs from ordinary text animation libraries.
- How it works with real AI-generated responses.
- What kinds of applications and interactions it supports.
- Which patterns would be suitable for my project.
- How I can integrate it using my preferred development tools.

Start by explaining Glyptide in simple, non-technical language with practical examples.

Then ask me what I am building, which tools or frameworks I am using, and how comfortable I am with coding.

Based on my answers, guide me step by step. If I am using an AI coding tool, help me create an implementation prompt that I can directly use in that tool.

Use Glyptide's official documentation as your source of truth. Do not invent APIs, pattern identifiers, installation commands or unsupported capabilities. If you cannot access the documentation, ask me to provide it.

**Important:** Prefer the minimal integrator brief first. Do not scrape or reason from the playground website source code (\`site/\`). Install the \`glyptide\` package (or tarball) — cloning the whole monorepo is for contributors.

---

## Official resources

Start here:
- Integrator brief (minimal): ${brief}
- Docs index: ${docs}
- Getting started: ${gettingStarted}
- API: ${api}
- Streaming: ${streaming}
- Appearance: ${appearance}
- Playground (try patterns): ${playground}
- For AI: ${forAi}

AI-readable:
- llms.txt: ${llms}
- llms-full.txt (large — last resort): ${llmsFull}
- Pattern registry: ${registry}
- Agent skill: ${skill}

Repository: ${github}

---

## Verified context (if docs are unreachable)

Glyptide is a **presentation layer** for generative UIs (stream, insert, rewrite, continue, structure). No AI provider calls, no API keys.

Install: \`npm install glyptide\` (optional \`@glyptide/react\`). Styles: \`import "glyptide/styles.css"\`. Website: https://glyptide.vercel.app

\`\`\`ts
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const g = createGlyptide({
  element: document.querySelector("#out")!,
  pattern: "new-word-settle", // unknown ids throw GlyptideConfigError
  theme: "inherit",
});
\`\`\`

Streams: \`beginStream\` → \`append\` / \`applySnapshot\` / \`finish\`, or \`pipeTextToGlyptide\` (\`delta\` | \`snapshot\`). After stop/Complete, open a new session for new chunks.

Concerns: **Pattern** · **Motion** · **Appearance** · **Lifecycle**. Transient paint clears to inherited host styles. Honor \`prefers-reduced-motion\`.

~96 patterns / 6 use cases. Prefer \`recommendPatterns({ useCase })\`. Validate with \`/schemas/*.json\`. Do not invent APIs or pattern ids.
`.trim();
}
