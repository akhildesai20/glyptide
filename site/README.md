# site/ — Glyptide playground & docs website

**Contributor tooling.** App builders integrating Glyptide should install `packages/glyptide`, not this app.

- Vite multi-page site: home, playground, docs, for-ai
- Serves generated AI assets from `public/` (`llms.txt`, registry, schemas, skill)
- Local: from repo root, `npm run dev`

Library API source of truth: `packages/glyptide` + `docs/`.
