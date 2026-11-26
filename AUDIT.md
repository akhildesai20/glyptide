# Glyptide Audit — text-in-motion-v5.html

## Architecture
- Single self-contained HTML file (~68KB): CSS + pattern data + `makeEngine` + playground UI
- Engine is intentionally exportable via `makeEngine.toString()` for standalone HTML snippets
- No framework; vanilla DOM + Web Animations API + setTimeout scheduling

## Pattern inventory: 96 total
| Use case | Count |
|----------|-------|
| New response | 17 |
| Inline insertion | 12 |
| Selection rewrite | 12 |
| Multi-paragraph rewrite | 10 |
| Continue writing | 10 |
| Structured output | 35 |

Kinds: token, word, phrase, sentence, paragraph, line, all  
Effects: none, spring, fade, wipe, block, mark, review, ghost, color, underline, addition, placeholder, cursor, guide, emphasis, skeleton, checkpoint, ink, replacementInk, diff, worddiff, linebar, shimmer, gradientInk/Highlight/Glow/Underline, rowAccent, rowFocus, heading

## Engine capabilities
- Range parsing via `[[...]]` markers
- Split by grapheme/word/phrase/sentence/paragraph/line/all (Intl.Segmenter when available)
- Simulated streaming: steady, bursts, stall, interrupt
- Pause/resume/stop/accept/reject
- Critically-damped spring frames (ζ≈0.95, ω=17)
- Configurable generation palette with contrast-safe ink adjustment
- Review flows for ghost/diff/addition/worddiff
- Word-level LCS diff for worddiff effect

## Issues found
1. **Performance**: Library cards create engines for all visible patterns; "Play previews" runs all simultaneously; no IntersectionObserver
2. **A11y**: Live region announces full completion text (can be verbose); decorative hero/status changes could flood AT; theme toggle doesn't persist or support System
3. **Theme flash**: No FOUC prevention for dark preference
4. **Code export**: Embeds entire page CSS; not a reusable package API
5. **Structured data**: Tables/checklists rendered as monospace text, not semantic HTML
6. **Controls**: Gradient color inputs always shown even for non-gradient patterns
7. **Mobile**: Lab sidebar stacks; usable but dense
8. **No deep links / URL state** for patterns or playground config
9. **springFrames()** regenerated per spring animation (minor)
10. **Shared body.dark** for palette detection — multi-instance theme edge cases

## Preserve
- All 96 pattern definitions and sample content
- makeEngine behavior (playback, effects, review, streaming scenarios)
- Color contrast adjustment logic
- Keyboard review shortcuts (Esc / Cmd+Enter)
