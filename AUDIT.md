# Glyptide Audit — monorepo (current)

Supersedes the historical v5 HTML-only notes. Prototype remains at `prototype/text-in-motion-v5.html` for reference only.

## Architecture

| Path | Role |
|------|------|
| `packages/glyptide` | Core engine, registry, appearance, stream helpers |
| `packages/glyptide-react` | Thin React wrapper |
| `site/` | Playground + AI-facing static assets under `site/public/` |
| `skills/glyptide/` | Portable Agent Skill |
| `scripts/generate-ai-docs.mjs` | Registry → llms / schemas / docs |

Source of truth for patterns: `packages/glyptide/src/data/patterns.json` (+ `cases.json`).

## Pattern inventory: 96 total

| Use case | Count |
|----------|------:|
| New response | 17 |
| Inline insertion | 12 |
| Selection rewrite | 12 |
| Multi-paragraph rewrite | 10 |
| Continue writing | 10 |
| Structured output | 35 |

## Engine capabilities

- Range parsing via `[[...]]` markers
- Split by grapheme/word/phrase/sentence/paragraph/line/all (`Intl.Segmenter` when available)
- Simulated streaming: steady, bursts, stall, interrupt
- Real stream: `append` / `finish` + `pipeTextToGlyptide` (delta | snapshot)
- Pause/resume/stop/accept/reject
- Critically-damped spring frames (ζ≈0.95, ω=17)
- Theme-aware curated presets + appearance lifecycle
- Review flows for ghost/diff/addition/worddiff

## Known gaps (tracked in production plan)

1. `engine.ts` monolith; `patternName` string branches (migrate to pattern ids)
2. Dual-feed risk: `append` during simulated generation
3. No public event bus / AbortSignal on instance
4. React handle incomplete vs core instance API
5. `destroy` may orphan auto-created waiting node
6. `vercel.json` catch-all rewrite breaks static AI routes
7. Conflicting GitHub URLs in site footer historically
8. Chromium-only e2e; no visual regression suite yet
9. Package not published (intentional)

See [docs/BASELINE.md](docs/BASELINE.md) for measured sizes and preserve list.

## Preserve

- All 96 pattern definitions and sample content
- makeEngine playback / effects / review / scenarios
- Lifecycle-driven appearance settlement to **inherited** host styles
- Keyboard review shortcuts (Esc / Cmd+Enter)
- AI-native generated docs pipeline
