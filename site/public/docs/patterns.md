# Pattern registry

Version 0.1.0 · 96 patterns. Machine-readable: [/registry/patterns.json](/registry/patterns.json).

## New response (`new`)

An empty answer surface becomes readable as text arrives.

### Token stream

<a id="new-token-stream"></a>

- **id:** `new-token-stream`
- **kind:** `token`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- Immediate token-like delivery for conversational responses. Partial words are allowed, as in real model streams.

### Word settle

<a id="new-word-settle"></a>

- **id:** `new-word-settle`
- **kind:** `word`
- **effect:** `spring`
- **lifecycle:** `transient` / `piece`
- Complete words enter with a tiny damped rise. A readable default for prose.

### Phrase fade

<a id="new-phrase-fade"></a>

- **id:** `new-phrase-fade`
- **kind:** `phrase`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Short phrases arrive as a unit, with a gentle opacity ramp for natural reading.

### Sentence reveal

<a id="new-sentence-reveal"></a>

- **id:** `new-sentence-reveal`
- **kind:** `sentence`
- **effect:** `wipe`
- **lifecycle:** `transient` / `piece`
- Complete sentences reveal in reading order; useful when output is buffered into meaningful thoughts.

### Paragraph arrival

<a id="new-paragraph-arrival"></a>

- **id:** `new-paragraph-arrival`
- **kind:** `paragraph`
- **effect:** `block`
- **lifecycle:** `transient` / `piece`
- Whole paragraphs arrive together, suitable for a structured research answer.

### Quiet cursor

<a id="new-quiet-cursor"></a>

- **id:** `new-quiet-cursor`
- **kind:** `token`
- **effect:** `cursor`
- **lifecycle:** `transient` / `piece`
- A steady insertion caret indicates the exact edge of a live response.

### Buffered words

<a id="new-buffered-words"></a>

- **id:** `new-buffered-words`
- **kind:** `word`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- Wait for a complete word before showing it; avoids distracting partial words.

### Reading line

<a id="new-reading-line"></a>

- **id:** `new-reading-line`
- **kind:** `phrase`
- **effect:** `guide`
- **lifecycle:** `transient` / `piece`
- A thin guide follows the actual last rendered line as text wraps, then clears.

### Progressive emphasis

<a id="new-progressive-emphasis"></a>

- **id:** `new-progressive-emphasis`
- **kind:** `phrase`
- **effect:** `emphasis`
- **lifecycle:** `transient` / `piece`
- Each incoming phrase is highlighted in readable ink, then settles independently without recoloring earlier text.

### Skeleton to prose

<a id="new-skeleton-to-prose"></a>

- **id:** `new-skeleton-to-prose`
- **kind:** `word`
- **effect:** `skeleton`
- **lifecycle:** `transient` / `piece`
- Reserve a short answer preview before streaming actual words.

### Sentence checkpoint

<a id="new-sentence-checkpoint"></a>

- **id:** `new-sentence-checkpoint`
- **kind:** `sentence`
- **effect:** `checkpoint`
- **lifecycle:** `transient` / `piece`
- Reveal a complete thought, briefly mark only that sentence and count completed sentences in the status area.

### Instant answer

<a id="new-instant-answer"></a>

- **id:** `new-instant-answer`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Buffer a short answer completely before presenting it; useful for concise answers.

### Gradient ink

<a id="new-gradient-ink"></a>

- **id:** `new-gradient-ink`
- **kind:** `phrase`
- **effect:** `gradientInk`
- **lifecycle:** `transient` / `piece`
- A single colored sweep travels through each incoming phrase, then returns to normal ink.

### Gradient highlight

<a id="new-gradient-highlight"></a>

- **id:** `new-gradient-highlight`
- **kind:** `phrase`
- **effect:** `gradientHighlight`
- **lifecycle:** `transient` / `piece`
- A localized traveling highlight marks new words while preserving readable foreground text.

### Diffused glow

<a id="new-diffused-glow"></a>

- **id:** `new-diffused-glow`
- **kind:** `sentence`
- **effect:** `gradientGlow`
- **lifecycle:** `transient` / `piece`
- A soft gradient glow blooms around a complete thought, then dissipates without moving text.

### Luminous underline

<a id="new-luminous-underline"></a>

- **id:** `new-luminous-underline`
- **kind:** `phrase`
- **effect:** `gradientUnderline`
- **lifecycle:** `transient` / `piece`
- A moving underline identifies the active generation range without changing glyph color.

### Thinking shimmer

<a id="new-thinking-shimmer"></a>

- **id:** `new-thinking-shimmer`
- **kind:** `word`
- **effect:** `shimmer`
- **lifecycle:** `transient` / `piece`
- A gradient sweeps across the waiting label only; incoming text streams quietly.

## Inline insertion (`insert`)

Generate missing text inside an existing sentence or between paragraphs.

### Caret insertion

<a id="insert-caret-insertion"></a>

- **id:** `insert-caret-insertion`
- **kind:** `word`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- A live caret marks the insertion point while surrounding text remains intact.

### Marked insertion

<a id="insert-marked-insertion"></a>

- **id:** `insert-marked-insertion`
- **kind:** `phrase`
- **effect:** `mark`
- **lifecycle:** `transient` / `generation`
- A subtle temporary highlight identifies exactly what was added within the paragraph.

### Reserved gap

<a id="insert-reserved-gap"></a>

- **id:** `insert-reserved-gap`
- **kind:** `sentence`
- **effect:** `block`
- **lifecycle:** `transient` / `piece`
- A short reserved space signals an incoming sentence before the surrounding text reflows.

### Colored insertion

<a id="insert-colored-insertion"></a>

- **id:** `insert-colored-insertion`
- **kind:** `phrase`
- **effect:** `color`
- **lifecycle:** `transient` / `generation`
- Keep inserted prose in high-contrast green until generation completes.

### Underline insertion

<a id="insert-underline-insertion"></a>

- **id:** `insert-underline-insertion`
- **kind:** `word`
- **effect:** `underline`
- **lifecycle:** `transient` / `generation`
- Mark the exact added range without relying on color.

### Insertion preview

<a id="insert-insertion-preview"></a>

- **id:** `insert-insertion-preview`
- **kind:** `phrase`
- **effect:** `ghost`
- **lifecycle:** `review-bound` / `accept`
- Preview the new text in context; accept or discard it.

### Atomic insertion

<a id="insert-atomic-insertion"></a>

- **id:** `insert-atomic-insertion`
- **kind:** `all`
- **effect:** `spring`
- **lifecycle:** `transient` / `piece`
- Keep surrounding text intact until the entire insertion is available.

### Inline placeholder

<a id="insert-inline-placeholder"></a>

- **id:** `insert-inline-placeholder`
- **kind:** `word`
- **effect:** `placeholder`
- **lifecycle:** `transient` / `piece`
- A short inline placeholder marks the pending insertion point.

### Tracked addition

<a id="insert-tracked-addition"></a>

- **id:** `insert-tracked-addition`
- **kind:** `phrase`
- **effect:** `addition`
- **lifecycle:** `review-bound` / `accept`
- Keep the added text visibly marked after generation; accept or discard.

### Sentence insertion

<a id="insert-sentence-insertion"></a>

- **id:** `insert-sentence-insertion`
- **kind:** `sentence`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Insert complete sentences to avoid incomplete thoughts inside existing prose.

### Gradient insertion

<a id="insert-gradient-insertion"></a>

- **id:** `insert-gradient-insertion`
- **kind:** `phrase`
- **effect:** `gradientHighlight`
- **lifecycle:** `transient` / `piece`
- A traveling highlight marks the exact inline insertion; existing text remains unchanged.

### Luminous insertion

<a id="insert-luminous-insertion"></a>

- **id:** `insert-luminous-insertion`
- **kind:** `word`
- **effect:** `gradientUnderline`
- **lifecycle:** `transient` / `piece`
- A localized luminous underline follows incoming words inside the paragraph.

## Selection rewrite (`replace`)

Replace a selected phrase or sentence without losing its surrounding context.

### Direct replacement

<a id="replace-direct-replacement"></a>

- **id:** `replace-direct-replacement`
- **kind:** `phrase`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Keep the selection visible during the wait, then replace only that range as new text arrives.

### Atomic rewrite

<a id="replace-atomic-rewrite"></a>

- **id:** `replace-atomic-rewrite`
- **kind:** `all`
- **effect:** `spring`
- **lifecycle:** `transient` / `piece`
- Keep the old sentence readable until the complete replacement is ready, then swap it in one step.

### Review in place

<a id="replace-review-in-place"></a>

- **id:** `replace-review-in-place`
- **kind:** `phrase`
- **effect:** `review`
- **lifecycle:** `review-bound` / `accept`
- Show the proposed replacement beside the struck-out original; accept or discard explicitly.

### Tracked replacement

<a id="replace-tracked-replacement"></a>

- **id:** `replace-tracked-replacement`
- **kind:** `phrase`
- **effect:** `diff`
- **lifecycle:** `review-bound` / `accept`
- Strike through original text and underline the proposed replacement for explicit review.

### Replacement ink

<a id="replace-replacement-ink"></a>

- **id:** `replace-replacement-ink`
- **kind:** `word`
- **effect:** `replacementInk`
- **lifecycle:** `transient` / `generation`
- Keep the replacement distinctly colored and underlined during generation, then settle after completion.

### Keep original until ready

<a id="replace-keep-original-until-ready"></a>

- **id:** `replace-keep-original-until-ready`
- **kind:** `all`
- **effect:** `review`
- **lifecycle:** `review-bound` / `accept`
- Preserve the selected text and reveal the complete alternative for review.

### Rewrite placeholder

<a id="replace-rewrite-placeholder"></a>

- **id:** `replace-rewrite-placeholder`
- **kind:** `phrase`
- **effect:** `placeholder`
- **lifecycle:** `transient` / `piece`
- Reserve an inline target while the replacement is being prepared.

### Underline replacement

<a id="replace-underline-replacement"></a>

- **id:** `replace-underline-replacement`
- **kind:** `phrase`
- **effect:** `underline`
- **lifecycle:** `transient` / `generation`
- Identify the exact rewritten range with an underline independent of color.

### Sentence-by-sentence

<a id="replace-sentence-by-sentence"></a>

- **id:** `replace-sentence-by-sentence`
- **kind:** `sentence`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Replace with complete sentences, useful for longer selections.

### Word-level diff

<a id="replace-word-level-diff"></a>

- **id:** `replace-word-level-diff`
- **kind:** `all`
- **effect:** `worddiff`
- **lifecycle:** `review-bound` / `accept`
- Keep matching words intact and mark only changed words for review. Useful for small corrections.

### Gradient rewrite

<a id="replace-gradient-rewrite"></a>

- **id:** `replace-gradient-rewrite`
- **kind:** `phrase`
- **effect:** `gradientInk`
- **lifecycle:** `transient` / `piece`
- Revised phrases briefly arrive in gradient ink to distinguish them from the surrounding paragraph.

### Revision glow

<a id="replace-revision-glow"></a>

- **id:** `replace-revision-glow`
- **kind:** `sentence`
- **effect:** `gradientGlow`
- **lifecycle:** `transient` / `piece`
- A temporary soft glow locates each newly replaced sentence.

## Multi-paragraph rewrite (`rewrite`)

Revise larger blocks while keeping the rest of a document available.

### Block-by-block

<a id="rewrite-block-by-block"></a>

- **id:** `rewrite-block-by-block`
- **kind:** `paragraph`
- **effect:** `block`
- **lifecycle:** `transient` / `piece`
- Replace one original paragraph at a time, so unfinished sections remain readable.

### Original and revised

<a id="rewrite-original-and-revised"></a>

- **id:** `rewrite-original-and-revised`
- **kind:** `paragraph`
- **effect:** `review`
- **lifecycle:** `review-bound` / `accept`
- Keep the original selected blocks alongside the proposed version until the reader accepts.

### Complete document swap

<a id="rewrite-complete-document-swap"></a>

- **id:** `rewrite-complete-document-swap`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Buffer the entire selected section, then replace it atomically for a coherent editorial change.

### Tracked blocks

<a id="rewrite-tracked-blocks"></a>

- **id:** `rewrite-tracked-blocks`
- **kind:** `paragraph`
- **effect:** `diff`
- **lifecycle:** `review-bound` / `accept`
- Show removed and added document blocks using both color and explicit decoration.

### Paragraph checkpoints

<a id="rewrite-paragraph-checkpoints"></a>

- **id:** `rewrite-paragraph-checkpoints`
- **kind:** `paragraph`
- **effect:** `checkpoint`
- **lifecycle:** `transient` / `piece`
- Signal each completed paragraph before proceeding to the next.

### Revision preview

<a id="rewrite-revision-preview"></a>

- **id:** `rewrite-revision-preview`
- **kind:** `paragraph`
- **effect:** `ghost`
- **lifecycle:** `review-bound` / `accept`
- Generate a provisional document section that requires acceptance.

### Buffered section review

<a id="rewrite-buffered-section-review"></a>

- **id:** `rewrite-buffered-section-review`
- **kind:** `all`
- **effect:** `review`
- **lifecycle:** `review-bound` / `accept`
- Keep all original blocks visible until the complete proposed section is available.

### Revision margin

<a id="rewrite-revision-margin"></a>

- **id:** `rewrite-revision-margin`
- **kind:** `paragraph`
- **effect:** `linebar`
- **lifecycle:** `transient` / `generation`
- Mark the revised section with a temporary change bar.

### Document diff

<a id="rewrite-document-diff"></a>

- **id:** `rewrite-document-diff`
- **kind:** `all`
- **effect:** `worddiff`
- **lifecycle:** `review-bound` / `accept`
- Compare original and revised wording without marking unchanged text as a replacement.

### Gradient revision blocks

<a id="rewrite-gradient-revision-blocks"></a>

- **id:** `rewrite-gradient-revision-blocks`
- **kind:** `paragraph`
- **effect:** `gradientHighlight`
- **lifecycle:** `transient` / `piece`
- A restrained gradient marks each new paragraph without animating the surrounding document.

## Continue writing (`continue`)

Extend existing prose or suggest the next sentence without rewriting the prefix.

### Append stream

<a id="continue-append-stream"></a>

- **id:** `continue-append-stream`
- **kind:** `phrase`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Continue directly at the end of the existing prose with no motion on the prefix.

### Ghost suggestion

<a id="continue-ghost-suggestion"></a>

- **id:** `continue-ghost-suggestion`
- **kind:** `sentence`
- **effect:** `ghost`
- **lifecycle:** `review-bound` / `accept`
- Present a faint, uncommitted continuation. It becomes ordinary text only after acceptance.

### Next paragraph

<a id="continue-next-paragraph"></a>

- **id:** `continue-next-paragraph`
- **kind:** `paragraph`
- **effect:** `block`
- **lifecycle:** `transient` / `piece`
- Start a new paragraph and deliver the continuation as a coherent block.

### Inline prediction

<a id="continue-inline-prediction"></a>

- **id:** `continue-inline-prediction`
- **kind:** `word`
- **effect:** `ghost`
- **lifecycle:** `review-bound` / `accept`
- Offer a word-by-word continuation that remains uncommitted until accepted.

### Colored continuation

<a id="continue-colored-continuation"></a>

- **id:** `continue-colored-continuation`
- **kind:** `phrase`
- **effect:** `color`
- **lifecycle:** `transient` / `generation`
- Separate newly generated prose from the author’s existing text.

### Paragraph suggestion

<a id="continue-paragraph-suggestion"></a>

- **id:** `continue-paragraph-suggestion`
- **kind:** `paragraph`
- **effect:** `ghost`
- **lifecycle:** `review-bound` / `accept`
- Offer a complete next paragraph for review before committing it.

### Sentence continuation

<a id="continue-sentence-continuation"></a>

- **id:** `continue-sentence-continuation`
- **kind:** `sentence`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- Append complete thoughts without additional motion.

### Continuation boundary

<a id="continue-continuation-boundary"></a>

- **id:** `continue-continuation-boundary`
- **kind:** `phrase`
- **effect:** `underline`
- **lifecycle:** `transient` / `generation`
- Temporarily underline the newly appended range.

### Buffered ending

<a id="continue-buffered-ending"></a>

- **id:** `continue-buffered-ending`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Present a complete conclusion at once, preserving the original prefix.

### Gradient continuation

<a id="continue-gradient-continuation"></a>

- **id:** `continue-gradient-continuation`
- **kind:** `phrase`
- **effect:** `gradientUnderline`
- **lifecycle:** `transient` / `piece`
- A gradient underline shows the boundary of newly appended writing.

## Structured output (`structured`)

Generate text with meaningful boundaries, such as lists, code, and document sections.

### List item arrival

<a id="structured-list-item-arrival"></a>

- **id:** `structured-list-item-arrival`
- **kind:** `line`
- **effect:** `spring`
- **lifecycle:** `transient` / `piece`
- Reveal each complete list item, keeping numbering and text together.

### Code line stream

<a id="structured-code-line-stream"></a>

- **id:** `structured-code-line-stream`
- **kind:** `line`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- Deliver complete lines with preserved indentation and a stable monospace layout.

### Section assembly

<a id="structured-section-assembly"></a>

- **id:** `structured-section-assembly`
- **kind:** `paragraph`
- **effect:** `block`
- **lifecycle:** `transient` / `piece`
- Deliver whole sections with headings and supporting prose as coherent blocks.

### Checklist assembly

<a id="structured-checklist-assembly"></a>

- **id:** `structured-checklist-assembly`
- **kind:** `line`
- **effect:** `checkpoint`
- **lifecycle:** `transient` / `piece`
- Reveal complete actionable checklist rows with a restrained completion cue.

### Data rows

<a id="structured-data-rows"></a>

- **id:** `structured-data-rows`
- **kind:** `line`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- Deliver complete aligned rows in a monospace layout.

### Outline generation

<a id="structured-outline-generation"></a>

- **id:** `structured-outline-generation`
- **kind:** `line`
- **effect:** `linebar`
- **lifecycle:** `transient` / `generation`
- Reveal hierarchical outline entries with a temporary reading guide.

### Buffered code block

<a id="structured-buffered-code-block"></a>

- **id:** `structured-buffered-code-block`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Present complete code together to avoid showing invalid partial snippets.

### Quoted passages

<a id="structured-quoted-passages"></a>

- **id:** `structured-quoted-passages`
- **kind:** `paragraph`
- **effect:** `ink`
- **lifecycle:** `transient` / `piece`
- Reveal complete passages with temporary emphasis on the incoming excerpt.

### Progressive explanation

<a id="structured-progressive-explanation"></a>

- **id:** `structured-progressive-explanation`
- **kind:** `sentence`
- **effect:** `none`
- **lifecycle:** `transient` / `piece`
- Deliver complete explanatory sentences without distracting motion.

### List token stream

<a id="structured-list-token-stream"></a>

- **id:** `structured-list-token-stream`
- **kind:** `token`
- **effect:** `cursor`
- **lifecycle:** `transient` / `piece`
- A continuous list stream for short items; a caret marks the current insertion point.

### List phrase reveal

<a id="structured-list-phrase-reveal"></a>

- **id:** `structured-list-phrase-reveal`
- **kind:** `phrase`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Long list items become readable in phrases rather than arriving all at once.

### List item focus

<a id="structured-list-item-focus"></a>

- **id:** `structured-list-item-focus`
- **kind:** `line`
- **effect:** `rowFocus`
- **lifecycle:** `transient` / `piece`
- Each completed item receives temporary ink emphasis; earlier items settle.

### List checkpoint

<a id="structured-list-checkpoint"></a>

- **id:** `structured-list-checkpoint`
- **kind:** `line`
- **effect:** `checkpoint`
- **lifecycle:** `transient` / `piece`
- Confirm each complete list entry in the status area, without adding characters to the list.

### Code token stream

<a id="structured-code-token-stream"></a>

- **id:** `structured-code-token-stream`
- **kind:** `token`
- **effect:** `cursor`
- **lifecycle:** `transient` / `piece`
- Stream raw code incrementally with indentation preserved and a caret at the live edge.

### Code active line

<a id="structured-code-active-line"></a>

- **id:** `structured-code-active-line`
- **kind:** `line`
- **effect:** `rowAccent`
- **lifecycle:** `transient` / `piece`
- Highlight only the latest complete code line so readers can follow the live edge.

### Code function blocks

<a id="structured-code-function-blocks"></a>

- **id:** `structured-code-function-blocks`
- **kind:** `paragraph`
- **effect:** `block`
- **lifecycle:** `transient` / `piece`
- Reveal logically grouped code blocks separated by blank lines.

### Code line glow

<a id="structured-code-line-glow"></a>

- **id:** `structured-code-line-glow`
- **kind:** `line`
- **effect:** `gradientHighlight`
- **lifecycle:** `transient` / `piece`
- A transient gradient marks each complete incoming code line without recoloring syntax.

### Heading then body

<a id="structured-heading-then-body"></a>

- **id:** `structured-heading-then-body`
- **kind:** `line`
- **effect:** `heading`
- **lifecycle:** `persistent` / `none`
- Reveal section headings distinctly before their supporting text.

### Section sentence stream

<a id="structured-section-sentence-stream"></a>

- **id:** `structured-section-sentence-stream`
- **kind:** `sentence`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Reveal complete sentences within sections for research-style answers.

### Section focus

<a id="structured-section-focus"></a>

- **id:** `structured-section-focus`
- **kind:** `paragraph`
- **effect:** `rowAccent`
- **lifecycle:** `transient` / `piece`
- Highlight the active section briefly, retaining earlier sections in normal ink.

### Checklist phrase stream

<a id="structured-checklist-phrase-stream"></a>

- **id:** `structured-checklist-phrase-stream`
- **kind:** `phrase`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Long action descriptions become readable progressively without marking them as done.

### Checklist row focus

<a id="structured-checklist-row-focus"></a>

- **id:** `structured-checklist-row-focus`
- **kind:** `line`
- **effect:** `rowFocus`
- **lifecycle:** `transient` / `piece`
- Briefly mark the latest generated task; checkbox notation remains unchecked.

### Buffered checklist

<a id="structured-buffered-checklist"></a>

- **id:** `structured-buffered-checklist`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Deliver a coherent task list together when completeness is important.

### Data row focus

<a id="structured-data-row-focus"></a>

- **id:** `structured-data-row-focus`
- **kind:** `line`
- **effect:** `rowAccent`
- **lifecycle:** `transient` / `piece`
- Highlight only the newest complete aligned row so partial values are never shown.

### Data header first

<a id="structured-data-header-first"></a>

- **id:** `structured-data-header-first`
- **kind:** `line`
- **effect:** `heading`
- **lifecycle:** `persistent` / `none`
- Present the header first, then deliver complete rows in a stable monospace layout.

### Buffered data

<a id="structured-buffered-data"></a>

- **id:** `structured-buffered-data`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Hold incomplete data until the entire aligned block is ready.

### Outline hierarchy

<a id="structured-outline-hierarchy"></a>

- **id:** `structured-outline-hierarchy`
- **kind:** `line`
- **effect:** `heading`
- **lifecycle:** `persistent` / `none`
- Emphasize top-level headings as they arrive; preserve indentation of child entries.

### Outline active branch

<a id="structured-outline-active-branch"></a>

- **id:** `structured-outline-active-branch`
- **kind:** `line`
- **effect:** `rowAccent`
- **lifecycle:** `transient` / `piece`
- A temporary highlight follows the newest outline entry.

### Buffered outline

<a id="structured-buffered-outline"></a>

- **id:** `structured-buffered-outline`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Reveal the complete hierarchy atomically to preserve relationships.

### Quote phrase reveal

<a id="structured-quote-phrase-reveal"></a>

- **id:** `structured-quote-phrase-reveal`
- **kind:** `phrase`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Reveal longer quoted passages gently in readable phrases.

### Quote highlight

<a id="structured-quote-highlight"></a>

- **id:** `structured-quote-highlight`
- **kind:** `paragraph`
- **effect:** `gradientHighlight`
- **lifecycle:** `transient` / `piece`
- A soft sweep distinguishes each new passage, then clears.

### Buffered quotation

<a id="structured-buffered-quotation"></a>

- **id:** `structured-buffered-quotation`
- **kind:** `all`
- **effect:** `fade`
- **lifecycle:** `transient` / `piece`
- Show all quotations together when exact context matters.

### Explanation word stream

<a id="structured-explanation-word-stream"></a>

- **id:** `structured-explanation-word-stream`
- **kind:** `word`
- **effect:** `spring`
- **lifecycle:** `transient` / `piece`
- Reveal complete words at a steady conversational pace.

### Explanation checkpoints

<a id="structured-explanation-checkpoints"></a>

- **id:** `structured-explanation-checkpoints`
- **kind:** `sentence`
- **effect:** `checkpoint`
- **lifecycle:** `transient` / `piece`
- Indicate when a complete explanatory sentence has arrived.

### Explanation emphasis

<a id="structured-explanation-emphasis"></a>

- **id:** `structured-explanation-emphasis`
- **kind:** `phrase`
- **effect:** `emphasis`
- **lifecycle:** `transient` / `piece`
- Temporarily emphasize incoming phrases without disturbing prior text.
