# Pattern inventory

Generated from `patterns.json` (96 patterns). Do not hand-edit — run `node scripts/generate-pattern-inventory.mjs`.

| ID | Name | Case | Kind | Effect | Lifecycle | Settlement |
|----|------|------|------|--------|-----------|------------|
| `new-token-stream` | Token stream | new | token | none | transient | generation |
| `new-word-settle` | Word settle | new | word | spring | transient | generation |
| `new-phrase-fade` | Phrase fade | new | phrase | fade | transient | generation |
| `new-sentence-reveal` | Sentence reveal | new | sentence | wipe | transient | generation |
| `new-paragraph-arrival` | Paragraph arrival | new | paragraph | block | transient | generation |
| `new-quiet-cursor` | Quiet cursor | new | token | cursor | transient | generation |
| `new-buffered-words` | Buffered words | new | word | none | transient | generation |
| `new-reading-line` | Reading line | new | phrase | guide | transient | piece |
| `new-progressive-emphasis` | Progressive emphasis | new | phrase | emphasis | transient | piece |
| `new-skeleton-to-prose` | Skeleton to prose | new | word | skeleton | transient | generation |
| `new-sentence-checkpoint` | Sentence checkpoint | new | sentence | checkpoint | transient | piece |
| `new-instant-answer` | Instant answer | new | all | fade | transient | generation |
| `new-gradient-ink` | Gradient ink | new | phrase | gradientInk | transient | piece |
| `new-gradient-highlight` | Gradient highlight | new | phrase | gradientHighlight | transient | piece |
| `new-diffused-glow` | Diffused glow | new | sentence | gradientGlow | transient | piece |
| `new-luminous-underline` | Luminous underline | new | phrase | gradientUnderline | transient | piece |
| `new-thinking-shimmer` | Thinking shimmer | new | word | shimmer | transient | generation |
| `insert-caret-insertion` | Caret insertion | insert | word | none | transient | generation |
| `insert-marked-insertion` | Marked insertion | insert | phrase | mark | transient | generation |
| `insert-reserved-gap` | Reserved gap | insert | sentence | block | transient | generation |
| `insert-colored-insertion` | Colored insertion | insert | phrase | color | transient | generation |
| `insert-underline-insertion` | Underline insertion | insert | word | underline | transient | generation |
| `insert-insertion-preview` | Insertion preview | insert | phrase | ghost | review-bound | accept |
| `insert-atomic-insertion` | Atomic insertion | insert | all | spring | transient | generation |
| `insert-inline-placeholder` | Inline placeholder | insert | word | placeholder | transient | generation |
| `insert-tracked-addition` | Tracked addition | insert | phrase | addition | review-bound | accept |
| `insert-sentence-insertion` | Sentence insertion | insert | sentence | fade | transient | generation |
| `insert-gradient-insertion` | Gradient insertion | insert | phrase | gradientHighlight | transient | piece |
| `insert-luminous-insertion` | Luminous insertion | insert | word | gradientUnderline | transient | piece |
| `replace-direct-replacement` | Direct replacement | replace | phrase | fade | transient | generation |
| `replace-atomic-rewrite` | Atomic rewrite | replace | all | spring | transient | generation |
| `replace-review-in-place` | Review in place | replace | phrase | review | review-bound | accept |
| `replace-tracked-replacement` | Tracked replacement | replace | phrase | diff | review-bound | accept |
| `replace-replacement-ink` | Replacement ink | replace | word | replacementInk | transient | generation |
| `replace-keep-original-until-ready` | Keep original until ready | replace | all | review | review-bound | accept |
| `replace-rewrite-placeholder` | Rewrite placeholder | replace | phrase | placeholder | transient | generation |
| `replace-underline-replacement` | Underline replacement | replace | phrase | underline | transient | generation |
| `replace-sentence-by-sentence` | Sentence-by-sentence | replace | sentence | fade | transient | generation |
| `replace-word-level-diff` | Word-level diff | replace | all | worddiff | review-bound | accept |
| `replace-gradient-rewrite` | Gradient rewrite | replace | phrase | gradientInk | transient | piece |
| `replace-revision-glow` | Revision glow | replace | sentence | gradientGlow | transient | piece |
| `rewrite-block-by-block` | Block-by-block | rewrite | paragraph | block | transient | generation |
| `rewrite-original-and-revised` | Original and revised | rewrite | paragraph | review | review-bound | accept |
| `rewrite-complete-document-swap` | Complete document swap | rewrite | all | fade | transient | generation |
| `rewrite-tracked-blocks` | Tracked blocks | rewrite | paragraph | diff | review-bound | accept |
| `rewrite-paragraph-checkpoints` | Paragraph checkpoints | rewrite | paragraph | checkpoint | transient | piece |
| `rewrite-revision-preview` | Revision preview | rewrite | paragraph | ghost | review-bound | accept |
| `rewrite-buffered-section-review` | Buffered section review | rewrite | all | review | review-bound | accept |
| `rewrite-revision-margin` | Revision margin | rewrite | paragraph | linebar | transient | generation |
| `rewrite-document-diff` | Document diff | rewrite | all | worddiff | review-bound | accept |
| `rewrite-gradient-revision-blocks` | Gradient revision blocks | rewrite | paragraph | gradientHighlight | transient | piece |
| `continue-append-stream` | Append stream | continue | phrase | fade | transient | generation |
| `continue-ghost-suggestion` | Ghost suggestion | continue | sentence | ghost | review-bound | accept |
| `continue-next-paragraph` | Next paragraph | continue | paragraph | block | transient | generation |
| `continue-inline-prediction` | Inline prediction | continue | word | ghost | review-bound | accept |
| `continue-colored-continuation` | Colored continuation | continue | phrase | color | transient | generation |
| `continue-paragraph-suggestion` | Paragraph suggestion | continue | paragraph | ghost | review-bound | accept |
| `continue-sentence-continuation` | Sentence continuation | continue | sentence | none | transient | generation |
| `continue-continuation-boundary` | Continuation boundary | continue | phrase | underline | transient | generation |
| `continue-buffered-ending` | Buffered ending | continue | all | fade | transient | generation |
| `continue-gradient-continuation` | Gradient continuation | continue | phrase | gradientUnderline | transient | piece |
| `structured-list-item-arrival` | List item arrival | structured | line | spring | transient | generation |
| `structured-code-line-stream` | Code line stream | structured | line | none | transient | generation |
| `structured-section-assembly` | Section assembly | structured | paragraph | block | transient | generation |
| `structured-checklist-assembly` | Checklist assembly | structured | line | checkpoint | transient | piece |
| `structured-data-rows` | Data rows | structured | line | none | transient | generation |
| `structured-outline-generation` | Outline generation | structured | line | linebar | transient | generation |
| `structured-buffered-code-block` | Buffered code block | structured | all | fade | transient | generation |
| `structured-quoted-passages` | Quoted passages | structured | paragraph | ink | transient | piece |
| `structured-progressive-explanation` | Progressive explanation | structured | sentence | none | transient | generation |
| `structured-list-token-stream` | List token stream | structured | token | cursor | transient | generation |
| `structured-list-phrase-reveal` | List phrase reveal | structured | phrase | fade | transient | generation |
| `structured-list-item-focus` | List item focus | structured | line | rowFocus | transient | piece |
| `structured-list-checkpoint` | List checkpoint | structured | line | checkpoint | transient | piece |
| `structured-code-token-stream` | Code token stream | structured | token | cursor | transient | generation |
| `structured-code-active-line` | Code active line | structured | line | rowAccent | transient | piece |
| `structured-code-function-blocks` | Code function blocks | structured | paragraph | block | transient | generation |
| `structured-code-line-glow` | Code line glow | structured | line | gradientHighlight | transient | piece |
| `structured-heading-then-body` | Heading then body | structured | line | heading | persistent | none |
| `structured-section-sentence-stream` | Section sentence stream | structured | sentence | fade | transient | generation |
| `structured-section-focus` | Section focus | structured | paragraph | rowAccent | transient | piece |
| `structured-checklist-phrase-stream` | Checklist phrase stream | structured | phrase | fade | transient | generation |
| `structured-checklist-row-focus` | Checklist row focus | structured | line | rowFocus | transient | piece |
| `structured-buffered-checklist` | Buffered checklist | structured | all | fade | transient | generation |
| `structured-data-row-focus` | Data row focus | structured | line | rowAccent | transient | piece |
| `structured-data-header-first` | Data header first | structured | line | heading | persistent | none |
| `structured-buffered-data` | Buffered data | structured | all | fade | transient | generation |
| `structured-outline-hierarchy` | Outline hierarchy | structured | line | heading | persistent | none |
| `structured-outline-active-branch` | Outline active branch | structured | line | rowAccent | transient | piece |
| `structured-buffered-outline` | Buffered outline | structured | all | fade | transient | generation |
| `structured-quote-phrase-reveal` | Quote phrase reveal | structured | phrase | fade | transient | generation |
| `structured-quote-highlight` | Quote highlight | structured | paragraph | gradientHighlight | transient | piece |
| `structured-buffered-quotation` | Buffered quotation | structured | all | fade | transient | generation |
| `structured-explanation-word-stream` | Explanation word stream | structured | word | spring | transient | generation |
| `structured-explanation-checkpoints` | Explanation checkpoints | structured | sentence | checkpoint | transient | piece |
| `structured-explanation-emphasis` | Explanation emphasis | structured | phrase | emphasis | transient | piece |

## Notes

- Display names are not behavioral keys; engine branches use pattern ids via `pattern-flags.ts`.
- Aesthetic colorMode never overrides lifecycle.
- Reduced motion: registry e2e sweeps all ids with `reduce: true`.
