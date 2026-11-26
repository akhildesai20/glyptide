# Contributing to Glyptide

Thanks for helping improve thoughtful text motion for generative interfaces.

## Development

```bash
npm install
npm run build:lib
npm run dev
```

- Core library: `packages/glyptide`
- React adapter: `packages/glyptide-react`
- Website: `site`
- Preserved prototype: `prototype/text-in-motion-v5.html`

## Principles

1. Preserve existing pattern behavior unless fixing a clear bug.
2. Prefer native browser APIs over new dependencies.
3. Motion must communicate state — do not add decorative animation.
4. Keep the core framework-agnostic and SSR-safe at module init.
5. Test playback, review flows, reduced motion, and themes.

## Pull requests

- Include a short description of the behavioral change.
- Note any pattern count or API surface changes.
- Run `npm run build` and relevant Playwright tests before requesting review.

## License

By contributing, you agree that your contributions are licensed under MIT.
