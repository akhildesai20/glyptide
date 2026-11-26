# Private release candidate checklist

Status: **private RC only**. No npm publish. No public repository visibility. No public deploy until authorized.

## Verified before calling this an RC

- [ ] `npm run build:lib && npm run generate:ai-docs && npm test`
- [ ] `npm run size -- --check-budgets`
- [ ] Chromium Playwright (`npx playwright test --project=chromium` in `site/`)
- [ ] Optional: `npm run test:clean-room`
- [ ] Optional: Firefox/WebKit workflow
- [ ] Secret scan of tree (no API keys in examples)
- [ ] GitHub URL canonical: `https://github.com/akhildesai20/glyptide`
- [ ] Repo remains **private**

## Explicitly deferred until authorization

- `npm publish`
- Making the GitHub repository public
- Public Vercel (or other) production deploy
- MCP server / Figma plugin / formal plugin marketplace
