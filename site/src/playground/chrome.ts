/** Shared playground lab markup for simple (home) and full pages. */
export type LabMode = "simple" | "full";

export function playgroundLabHtml(mode: LabMode): string {
  const full = mode === "full";
  const advancedStream = full
    ? `<details class="advanced">
              <summary>Stream &amp; host</summary>
              <div class="field">
                <label for="scenario">Stream behavior</label>
                <select id="scenario">
                  <option value="steady">Steady</option>
                  <option value="bursts">Bursty</option>
                  <option value="stall">Temporary stall</option>
                  <option value="interrupt">Connection interrupted</option>
                  <option value="stress-fast">Stress: fast</option>
                  <option value="stress-slow">Stress: slow</option>
                  <option value="stress-burst">Stress: irregular bursts</option>
                </select>
              </div>
              <div class="field">
                <label for="waitingThreshold"
                  >Waiting threshold <span id="waitingThresholdValue" class="muted"></span
                ></label>
                <input
                  type="range"
                  id="waitingThreshold"
                  min="0"
                  max="800"
                  step="20"
                  value="180"
                />
              </div>
              <div class="field">
                <label for="catchUp">Catch-up policy</label>
                <select id="catchUp">
                  <option value="catchUp">Catch up</option>
                  <option value="pace">Pace (bounded)</option>
                  <option value="flush">Flush</option>
                </select>
              </div>
              <div class="field host-colors">
                <label>Host colors</label>
                <div class="host-color-row">
                  <label class="host-swatch" for="hostFg"
                    ><span>Text</span>
                    <input type="color" id="hostFg" value="#1a1a1a" />
                  </label>
                  <label class="host-swatch" for="hostBg"
                    ><span>Bg</span>
                    <input type="color" id="hostBg" value="#ffffff" />
                  </label>
                </div>
              </div>
              <label class="check">
                <input type="checkbox" id="compareMode" /> Compare next pattern
              </label>
            </details>`
    : `<select id="scenario" hidden>
            <option value="steady" selected>Steady</option>
          </select>`;

  const textFields = full
    ? `<div class="field" id="sourceField">
              <label for="source"
                >Existing text <span class="muted" id="sourceHint"></span
              ></label>
              <textarea id="source" spellcheck="false" rows="4"></textarea>
              <p class="hint" id="markerNote"></p>
              <button type="button" class="btn btn-ghost btn-sm" id="markRange">
                Use selected range
              </button>
            </div>
            <div class="field">
              <div class="field-head">
                <label for="sample" id="sampleLabel">Incoming text</label>
                <div class="lang-switch" role="group" aria-label="Sample language">
                  <button type="button" class="lang-btn" data-lang="en" aria-pressed="true" id="langEn">EN</button>
                  <button type="button" class="lang-btn" data-lang="ur" aria-pressed="false" id="langUr" title="Urdu">اردو</button>
                </div>
              </div>
              <textarea id="sample" spellcheck="false" rows="5" dir="ltr" lang="en"></textarea>
            </div>`
    : `<div class="field" id="sourceField" hidden>
              <label for="source">Existing text <span class="muted" id="sourceHint"></span></label>
              <textarea id="source" spellcheck="false" rows="2"></textarea>
              <p class="hint" id="markerNote" hidden></p>
              <button type="button" class="btn btn-ghost btn-sm" id="markRange" hidden>Use selected range</button>
            </div>
            <div class="field" hidden>
              <label for="sample" id="sampleLabel">Incoming text</label>
              <textarea id="sample" spellcheck="false" rows="2" dir="ltr" lang="en"></textarea>
            </div>`;

  const motionExtras = full
    ? `<div class="field">
                <label for="speed"
                  >Delivery rate <span id="speedValue" class="muted"></span
                ></label>
                <input type="range" id="speed" min="8" max="140" value="54" />
              </div>
              <div class="field">
                <label for="latency"
                  >Initial wait <span id="latencyValue" class="muted"></span
                ></label>
                <input type="range" id="latency" min="0" max="2500" step="100" value="600" />
              </div>
              <label class="check">
                <input type="checkbox" id="reduce" /> Reduce motion
              </label>
              <p class="hint" id="reduceHint" hidden>
                Reduced motion disables presets — turn off to compare motion.
              </p>`
    : `<input type="range" id="speed" min="8" max="140" value="54" hidden />
              <input type="range" id="latency" min="0" max="2500" step="100" value="600" hidden />
              <input type="checkbox" id="reduce" hidden />
              <span id="speedValue" hidden></span>
              <span id="latencyValue" hidden></span>
              <p class="hint" id="reduceHint" hidden></p>`;

  const toolbarExtras = full
    ? `<button type="button" class="btn btn-ghost btn-sm" id="exportCode">&lt;/&gt; Code</button>
              <button type="button" class="btn btn-ghost btn-sm" id="copyForAi">Copy for AI</button>
              <button type="button" class="btn btn-ghost btn-sm" id="sharePlay">Share</button>`
    : `<a class="btn btn-secondary btn-sm" id="openFullPlayground" href="/playground/">Open playground</a>`;

  const heading =
    mode === "simple"
      ? `<div class="section-head">
          <div>
            <p class="section-kicker">Playground</p>
            <h2 id="play-heading">Try a pattern</h2>
            <p class="section-sub" id="caseDescription">
              Pick a use case, pattern, motion and appearance — then generate.
            </p>
          </div>
        </div>`
      : `<div class="section-head">
          <div>
            <p class="section-kicker">Playground</p>
            <h2 id="play-heading">Configure and compare</h2>
            <p class="section-sub" id="caseDescription">
              Experiment with generation speed, colors, and stream behavior.
            </p>
          </div>
        </div>`;

  return `${heading}
        <div class="case-tabs" id="caseTabs" role="tablist" aria-label="Generation use cases"></div>
        <div class="lab" id="lab">
          <div class="preview">
            <div class="preview-toolbar">
              <span class="mono" id="surfaceName">Assistant response</span>
              <span class="state-pill" id="status" role="status">Ready</span>
            </div>
            <div class="playback-bar">
              <button type="button" class="btn btn-primary btn-sm" id="play">Generate</button>
              <button type="button" class="btn btn-secondary btn-sm" id="pause" disabled>Pause</button>
              <button type="button" class="btn btn-secondary btn-sm" id="stop" disabled>Stop</button>
              <button type="button" class="btn btn-secondary btn-sm" id="accept" hidden>Accept</button>
              <button type="button" class="btn btn-secondary btn-sm" id="reject" hidden>Discard</button>
              <button type="button" class="btn btn-ghost btn-sm" id="reset">Reset</button>
              <span class="spacer"></span>
              ${toolbarExtras}
            </div>
            <div class="stage glyptide-stage" id="stage" tabindex="0" aria-label="Generated text preview">
              <div class="glyptide-document" id="output"></div>
              <div class="glyptide-waiting" id="waiting"></div>
              <div class="sr-only" id="announce" aria-live="polite" aria-atomic="true"></div>
            </div>
          </div>
          <aside class="controls" aria-label="Pattern configuration">
            <div class="field">
              <span class="field-label" id="patternFieldLabel">Interaction pattern</span>
              <div id="patternSelect" class="pattern-select" aria-labelledby="patternFieldLabel"></div>
              <p class="hint" id="patternNote"></p>
            </div>
            ${textFields}
            <details class="advanced" id="motionDetails" open>
              <summary>Motion</summary>
              <div class="field">
                <label for="motionPreset">Preset</label>
                <select id="motionPreset">
                  <option value="natural">Natural</option>
                  <option value="quiet">Quiet</option>
                  <option value="instant">Instant</option>
                  <option value="fluid">Fluid</option>
                  <option value="precise">Precise</option>
                  <option value="editorial">Editorial</option>
                  <option value="expressive">Expressive</option>
                </select>
                <p class="hint" id="motionHint">
                  Soft fade-in · ~210ms reveal. Applies on Generate.
                </p>
              </div>
              ${motionExtras}
            </details>
            <details class="advanced" id="colorDetails" open>
              <summary>Appearance</summary>
              <div id="appearanceRoot"></div>
            </details>
            ${advancedStream}
            <div class="controls-footer">
              <button type="button" class="btn btn-ghost btn-sm" id="defaults">
                Reset to defaults
              </button>
              <p class="hint control-note">
                Motion &amp; appearance apply on the next Generate.
              </p>
            </div>
          </aside>
        </div>`;
}

export function librarySectionHtml(): string {
  return `<section class="library-section wrap" id="library" aria-labelledby="lib-heading">
        <div class="section-head">
          <div>
            <p class="section-kicker">Pattern library</p>
            <h2 id="lib-heading">Browse all patterns</h2>
            <p class="section-sub">
              Searchable, filterable previews. Open any pattern in the playground above.
            </p>
          </div>
          <div class="lib-tools">
            <label class="search-field">
              <span class="sr-only">Search patterns</span>
              <input type="search" id="libSearch" placeholder="Search patterns…" autocomplete="off" />
            </label>
          </div>
        </div>
        <div id="libCaseTabs" class="chip-row lib-case-tabs" role="group" aria-label="Library use cases"></div>
        <div id="structuredFilter" class="chip-row" hidden></div>
        <div class="grid" id="grid"></div>
        <p class="empty-state" id="libEmpty" hidden>No patterns match that search.</p>
      </section>`;
}

export function codeDialogHtml(): string {
  return `<dialog id="codeDialog" class="dialog">
      <div class="dialog-head">
        <h2>Standalone example</h2>
        <button type="button" class="btn btn-ghost btn-sm" id="closeCode">Close</button>
      </div>
      <p class="hint">
        Production-equivalent snippet using the Glyptide engine. Save as an HTML
        file or copy into your project.
      </p>
      <pre class="code-block" id="codeText" tabindex="0"></pre>
      <div class="dialog-actions">
        <button type="button" class="btn btn-primary btn-sm" id="copyCode">Copy</button>
        <button type="button" class="btn btn-secondary btn-sm" id="downloadCode">
          Download HTML
        </button>
        <span class="copy-status" id="copyStatus" role="status"></span>
      </div>
    </dialog>`;
}
