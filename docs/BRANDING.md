# Glyptide branding asset convention

Official logo, hero, and social artwork are supplied separately. **Do not commit temporary logos** that conflict with the upcoming brand.

This document defines filenames, paths, dimensions, and replacement steps so assets can drop in without redesign work.

## Directory

| Path | Purpose |
|------|---------|
| `docs/media/` | Source of truth for README / social / OG masters |
| `site/public/` | Deployed website copies (favicon, OG, apple touch) |

Create `docs/media/` when the first asset is ready. Keep masters in `docs/media/`; copy optimized derivatives into `site/public/` as noted below.

## Asset inventory

| Asset | Proposed filename | Path(s) | Dimensions | Format | Notes |
|-------|-------------------|---------|------------|--------|-------|
| Logo symbol | `logo-mark.svg` | `docs/media/logo-mark.svg` | ViewBox 32×32 (scalable) | SVG | Monochrome preferred; use currentColor |
| Wordmark | `logo-wordmark.svg` | `docs/media/logo-wordmark.svg` | ~180×32 | SVG | Optional lockup without symbol |
| Logo light | `logo-light.svg` | `docs/media/logo-light.svg` | Same as mark or lockup | SVG | For dark backgrounds |
| Logo dark | `logo-dark.svg` | `docs/media/logo-dark.svg` | Same | SVG | For light backgrounds |
| GitHub README hero | `github-hero.png` | `docs/media/github-hero.png` | **1280×640** (2:1) | PNG | Max ~1 MB; README only |
| GitHub social preview | `github-social.png` | `docs/media/github-social.png` | **1280×640** | PNG | Upload in GitHub Settings → Social preview |
| Website Open Graph | `og.png` | `docs/media/og.png` → copy to `site/public/og.png` | **1200×630** | PNG | Replaces SVG OG when ready |
| Favicon | `favicon.svg` | `site/public/favicon.svg` | Scalable | SVG | Already present; replace in place |
| Favicon PNG fallback | `favicon-32.png` | `site/public/favicon-32.png` | **32×32** | PNG | Optional |
| Apple touch icon | `apple-touch-icon.png` | `site/public/apple-touch-icon.png` | **180×180** | PNG | Add `<link>` when file exists |
| Animation preview (README) | `demo-stream.webp` | `docs/media/demo-stream.webp` | ≤800×450 | WebP/GIF | Optional; only link from README after file exists |
| Animation preview 2 | `demo-review.webp` | `docs/media/demo-review.webp` | ≤800×450 | WebP/GIF | Optional |

## Replacement instructions

### README hero

1. Add `docs/media/github-hero.png` (1280×640).
2. In root `README.md`, replace the HTML comment under the tagline with:

```markdown
<p align="center">
  <img src="docs/media/github-hero.png" alt="Glyptide" width="800" />
</p>
```

3. Do not push a broken image path.

### GitHub social preview

1. Add `docs/media/github-social.png` (1280×640).
2. GitHub → **Settings** → **General** → **Social preview** → Upload image.
3. No repo file is required for GitHub to serve the preview; keeping the master in `docs/media/` is for versioning.

### Website Open Graph

1. Add `docs/media/og.png` (1200×630); copy to `site/public/og.png`.
2. Update each page head (`site/index.html`, `playground/index.html`, `docs/index.html`, `for-ai.html`):

```html
<meta property="og:image" content="https://glyptide.vercel.app/og.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

3. Keep `og.svg` until `og.png` is live, then remove SVG references if unused.

### Favicon / Apple touch

1. Replace `site/public/favicon.svg` in place (or add PNG fallbacks).
2. When `apple-touch-icon.png` exists, add to each HTML head:

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### Site wordmark mark

The site header uses a CSS `.mark` square today. When `logo-mark.svg` is ready, wire it in `site/src/shell.ts` / CSS without changing IA.

## Checklist before merging brand assets

- [ ] No temporary placeholder logos in `main`
- [ ] Light/dark variants verified on both themes
- [ ] README image paths resolve on GitHub
- [ ] OG PNG tested with a share debugger after deploy
- [ ] Favicon visible in browser tab light + dark UI
