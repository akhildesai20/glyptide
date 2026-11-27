# Changelog

## 0.1.0 — Private release candidate (not published)

### Added

- Production `glyptide` engine and pattern registry (96 patterns, 6 use cases)
- `@glyptide/react` adapter with full imperative handle
- Theme-aware curated generation palettes (18 presets)
- Decoupled appearance configuration (color mode, treatment, intensity, gradient motion)
- Centralized appearance lifecycle (`transient` / `persistent` / `review-bound`)
- Streaming reliability: bounded ingress, catch-up policies, `applySnapshot`, AbortSignal, lifecycle events (`on`)
- Motion presets (`natural` / `quiet` / `instant` / …) as config
- Adaptive waiting threshold + real-stream stall detection
- Lightweight `glyptide/engine` export (no registry JSON)
- Recipes under `examples/recipes/`; provider mock fixtures
- Playground: motion/host controls, stress scenarios, compare mode, `?embed=1`
- AI-native docs: `AGENTS.md`, `llms.txt`, registry JSON, schemas, Agent Skill
- Pattern inventory generator; gzip/brotli size budgets in CI
- Multi-browser workflow (Firefox/WebKit); clean-room pack smoke script

### Notes

- **Do not publish to npm or make the repository public** until explicitly authorized
- Install from this private repository / local path only
- Website deploy must keep static AI assets reachable (`vercel.json` excludes SPA rewrite for them)
