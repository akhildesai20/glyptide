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
| Logo symbol | `logo-mark.svg` | `docs/media/logo-mark.svg` (+ `site/public/`) | ViewBox 32×32 | SVG | Single green mark — no light/dark variants |
| Wordmark | `logo-wordmark.svg` | `docs/media/logo-wordmark.svg` | 180×32 | SVG | Text “Glyptide.” (site ink, light theme) |
| Logo light | `logo-light.svg` | `docs/media/logo-light.svg` | 180×32 | SVG | Text “Glyptide.” `#EDEDED` — for dark backgrounds |
| Logo dark | `logo-dark.svg` | `docs/media/logo-dark.svg` | 180×32 | SVG | Text “Glyptide.” `#171717` — for light backgrounds |
| GitHub README hero | `github-hero.png` | `docs/media/github-hero.png` | **1280×640** (2:1) | PNG | Max ~1 MB; README only |
| GitHub social preview | `github-social.png` | `docs/media/github-social.png` | **1280×640** | PNG | Upload in GitHub Settings → Social preview |
| Website Open Graph | `og.png` | `docs/media/og.png` → copy to `site/public/og.png` | **1200×630** | PNG | Replaces SVG OG when ready |
| Favicon | `favicon.svg` | `docs/media/` + `site/public/favicon.svg` | 32×32 viewBox | SVG | Simplified mark (green + white G, no bevels) |
| Favicon PNG fallback | `favicon-32.png` | `docs/media/` + `site/public/favicon-32.png` | **32×32** | PNG | From simplified favicon |
| Apple touch icon | `apple-touch-icon.png` | `docs/media/` + `site/public/apple-touch-icon.png` | **180×180** | PNG | Full mark, solid square — no baked corner radius |
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

3. `og.png` is live; `og.svg` removed.

### Favicon / Apple touch

Shipped:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
```

Regenerate PNGs from `docs/media/favicon.svg` (32) and `docs/media/logo-mark.svg` (180) when the mark changes. Do not bake iOS corner radius into the apple-touch export.

### Site wordmark mark

`docs/media/logo-mark.svg` is the master. Deployed copies: `site/public/logo-mark.svg` (header/footer) and `site/public/favicon.svg`. Shell uses `<img class="mark" src="/logo-mark.svg">`.

## Checklist before merging brand assets

- [x] Logo mark committed (`docs/media/logo-mark.svg`) — no temporary placeholder
- [x] Wordmark / light / dark text SVGs (“Glyptide.”) — no separate mark variants
- [x] README hero (`docs/media/github-hero.png`)
- [x] GitHub social master (`docs/media/github-social.png`) — upload in repo Settings → Social preview
- [x] Website OG PNG (`site/public/og.png`) wired in page heads
- [ ] OG PNG verified with a share debugger after deploy
- [x] Favicon SVG (simplified) + PNG 32×32
- [x] Apple touch icon 180×180 (solid square, no baked corners)
