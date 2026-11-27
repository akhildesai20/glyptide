# Changelog

## 0.1.0 — Public preview

First public release of Glyptide on npm (`glyptide`, `@glyptide/react`).

### Added

- Production `glyptide` engine and pattern registry (96 patterns, 6 use cases)
- `@glyptide/react` adapter with imperative handle and hot appearance/pacing updates
- Theme-aware curated generation palettes; decoupled appearance configuration
- Appearance lifecycles: `transient` / `persistent` / `review-bound`
- Streaming reliability: bounded ingress, catch-up policies, snapshots, AbortSignal, session-aware pipe cancellation
- Motion presets; adaptive waiting; stall detection
- Lightweight `glyptide/engine` export; IIFE browser build; CSS entry
- AI-native docs: integrator brief, `llms.txt`, registry JSON, schemas, Agent Skill
- Playground website (home · playground · docs · For AI) at https://glyptide.vercel.app
- CI: Windows/Linux, Node 20/24, clean-room pack smoke, multi-browser smoke

### Notes

- Maturity: **public preview** — not exhaustive compatibility or latency guarantees
- Install: `npm install glyptide` / `npm install @glyptide/react`
