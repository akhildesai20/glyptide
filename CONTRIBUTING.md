# Contributing to Glyptide

Thanks for helping improve thoughtful text motion for generative interfaces.

**v0.1.0 feature freeze:** prefer bug fixes, docs, tests, and packaging over new patterns, palettes, or redesigns.

## Development

```bash
npm install
npm run build:lib
npm run generate:ai-docs
npm run dev
npm run test:clean-room
```

- Core library: `packages/glyptide` (what app builders install)
- React adapter: `packages/glyptide-react`
- Website: `site` (playground — not a library dependency; becomes public with the repo)
- AI brief: `docs/ai-integrate.md`
- Publication wording: `docs/publication-status.json` → `npm run sync:publication-status`

## Principles

1. Preserve existing pattern ids and public APIs unless intentionally versioned.
2. Prefer native browser APIs over new dependencies.
3. Motion must communicate state — do not add decorative animation.
4. Keep the core framework-agnostic and SSR-safe at module init.
5. Test playback, review flows, reduced motion, and themes.
6. Never commit secrets, certs, or machine-local paths.

## Pull requests

Use the PR template. Run `npm run build:lib`, relevant tests, and `generate:ai-docs` when registry/docs change.

## License

By contributing, you agree that your contributions are licensed under MIT.
