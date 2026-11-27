# Adoption & discoverability opportunities

Evaluation only — **not implemented** in the v0.1.0 presentation pass unless noted elsewhere.

| Opportunity | Value | Complexity | Notes |
|-------------|-------|------------|-------|
| **StackBlitz starter** | High for first-hour try | Medium | Embed `glyptide` + minimal HTML; keep offline (no API keys). Needs maintained `package.json` pin to `0.1.0`. |
| **CodeSandbox examples** | Medium | Medium | Overlaps StackBlitz; pick one sandbox host first. |
| **Shareable playground URLs** | High | Low–Medium | Playground already uses query params (`pattern`, `case`, etc.). Document canonical URL recipes; optional “Copy link” polish. |
| **Privacy-friendly analytics** | Medium | Low | e.g. Plausible/Fathom on Vercel only — no product analytics in the library. Requires policy + consent decision. |
| **Trusted npm publishing** | High (supply chain) | Medium | npm 2FA already required; document org ownership, publish from sealed tarballs, optional automation later. |
| **Automated dependency updates** | Medium | Low | Dependabot/Renovate for site/devDeps; exclude force-major Vitest until planned. |
| **npm provenance (future)** | High for trust | Medium | Needs CI OIDC publish workflow; do **not** republish `0.1.0`. Enable starting `0.1.1+`. |

Recommended next (when prioritized): shareable playground link docs → StackBlitz starter → provenance on the next patch release.
