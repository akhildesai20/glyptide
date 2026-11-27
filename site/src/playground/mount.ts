import {
  cases,
  getPatternsByCase,
  makeEngine,
  patterns,
  searchPatterns,
  type CaseId,
  type EngineState,
  type PatternDefinition,
  type ResolvedConfig,
} from "glyptide";
import {
  appearanceToConfig,
  mountAppearancePanel,
  resetAppearanceDefaults,
} from "../appearance-panel";
import { mountPatternSelect } from "../pattern-select";
import { buildCopyForAiPrompt } from "../copy-ai";
import { buildExportHtml } from "../export";
import { $maybe } from "../dom";
import type { IconName } from "../icons";
import {
  copyWithIconFeedback,
  setIconLabel,
  wireControlAnim,
} from "../icons/controls";
import {
  MOTION_HINTS,
  cacheEnglish,
  englishFromCache,
  urduForCase,
  type SampleLang,
} from "../locale-samples";
import { isStressScenario, stressOverrides } from "../stress";
import { readPlaygroundParams, writePlaygroundParams } from "../url-state";

export type PlaygroundMode = "simple" | "full";

export interface MountPlaygroundOptions {
  mode: PlaygroundMode;
  /** When Try / Open playground should navigate (simple mode). Absolute path like /playground/ */
  playgroundPath?: string;
  /** Whether to mount the pattern library section (full mode only). */
  library?: boolean;
}

const ACTIVE_STATES: EngineState[] = ["Waiting", "Generating", "Waiting for text"];

/** Card-demo excerpt limits (library previews only; the playground keeps full samples). */
const CARD_SAMPLE_MAX_CHARS = 180;
const CARD_SAMPLE_MAX_LINES = 3;

/**
 * Shorten a pattern sample for a library card demo.
 * Keeps at most `maxLines` non-empty lines and ~`maxChars` characters, preferring
 * sentence / word boundaries, and re-closes an unbalanced [[range]] marker.
 */
export function conciseSample(
  text: string,
  maxChars = CARD_SAMPLE_MAX_CHARS,
  maxLines = CARD_SAMPLE_MAX_LINES,
): string {
  if (!text) return text;
  const lines = text.replace(/\s+$/, "").split("\n");
  const kept: string[] = [];
  let content = 0;
  for (const line of lines) {
    if (line.trim()) {
      if (content >= maxLines) break;
      content++;
    }
    kept.push(line);
  }
  let out = kept.join("\n").replace(/\s+$/, "");
  if (out.length > maxChars) {
    let cut = out.slice(0, maxChars);
    const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
    if (sentence >= maxChars * 0.5) {
      cut = cut.slice(0, sentence + 1);
    } else {
      const ws = cut.search(/\s\S*$/);
      if (ws > 40) cut = cut.slice(0, ws);
      cut = `${cut.replace(/\s+$/, "")}…`;
    }
    out = cut.replace(/\s+$/, "");
  }
  const opens = (out.match(/\[\[/g) ?? []).length;
  const closes = (out.match(/\]\]/g) ?? []).length;
  if (opens > closes) out += "]]";
  return out;
}

export function mountPlayground(options: MountPlaygroundOptions): {
  destroy: () => void;
  getShareQuery: () => string;
} {
  const full = options.mode === "full";
  const simple = !full;
  const playgroundPath = options.playgroundPath ?? "/playground/";

  const ac = new AbortController();
  const { signal } = ac;
  const on = <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | null | undefined,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
  ): void => {
    target?.addEventListener(type, handler as EventListener, { signal });
  };

  /** URL sync is a full-playground concern; the simple (home) page keeps its URL clean. */
  const writeParams: typeof writePlaygroundParams = (p) => {
    if (full) writePlaygroundParams(p);
  };

  const label = (id: string, icon: IconName, text: string): HTMLElement | null => {
    const el = $maybe(id);
    if (el) setIconLabel(el, icon, text);
    return el;
  };
  const setText = (id: string, text: string): void => {
    const el = $maybe(id);
    if (el) el.textContent = text;
  };

  /* —— Elements (null-safe; detached fallbacks keep logic simple on lean pages) —— */
  const outputEl = $maybe("output") ?? document.createElement("div");
  const waitingEl = $maybe("waiting") ?? document.createElement("div");
  const sourceEl = $maybe<HTMLTextAreaElement>("source") ?? document.createElement("textarea");
  const sampleEl = $maybe<HTMLTextAreaElement>("sample") ?? document.createElement("textarea");
  const sourceField = $maybe("sourceField");
  const caseTabs = $maybe("caseTabs");
  const playBtn = $maybe<HTMLButtonElement>("play");
  const pauseBtn = $maybe<HTMLButtonElement>("pause");
  const stopBtn = $maybe<HTMLButtonElement>("stop");
  const acceptBtn = $maybe<HTMLButtonElement>("accept");
  const rejectBtn = $maybe<HTMLButtonElement>("reject");
  const speedEl = $maybe<HTMLInputElement>("speed");
  const latencyEl = $maybe<HTMLInputElement>("latency");
  const scenarioEl = $maybe<HTMLSelectElement>("scenario");
  const reduceEl = $maybe<HTMLInputElement>("reduce");
  const motionPresetEl = $maybe<HTMLSelectElement>("motionPreset");
  const catchUpEl = $maybe<HTMLSelectElement>("catchUp");
  const waitingThreshold = $maybe<HTMLInputElement>("waitingThreshold");
  const waitingThresholdValue = $maybe("waitingThresholdValue");
  const motionHint = $maybe("motionHint");
  const reduceHint = $maybe("reduceHint");
  const codeDialog = $maybe<HTMLDialogElement>("codeDialog");
  const openFullEl = $maybe("openFullPlayground");
  const grid = $maybe("grid");
  const libSearch = $maybe<HTMLInputElement>("libSearch");

  /* Fallback scalar state when the page omits the control (e.g. simple page without sliders). */
  const params = readPlaygroundParams();
  const fallback = {
    speed: 54,
    latency: 600,
    scenario: "steady",
    motion: "",
  };

  const getSpeed = (): number => (speedEl ? +speedEl.value : fallback.speed);
  const getLatency = (): number => (latencyEl ? +latencyEl.value : fallback.latency);
  const getScenario = (): string => scenarioEl?.value ?? fallback.scenario;
  const getMotion = (): string => motionPresetEl?.value ?? fallback.motion;
  const setScenario = (v: string): void => {
    if (scenarioEl) scenarioEl.value = v;
    else fallback.scenario = v;
  };
  const setMotion = (v: string): void => {
    if (motionPresetEl) motionPresetEl.value = v;
    else fallback.motion = v;
  };

  /* Simple mode: hide advanced chrome if the page happens to include it. */
  if (simple) {
    if (sourceField) sourceField.hidden = true;
    ($maybe("sample")?.closest(".field") as HTMLElement | null)?.setAttribute("hidden", "");
    scenarioEl?.closest("details")?.setAttribute("hidden", "");
    ($maybe("compareMode")?.closest("label") as HTMLElement | null)?.setAttribute("hidden", "");
    document.querySelector(".lang-switch")?.setAttribute("hidden", "");
  }

  /* —— State —— */
  let currentCase = 0;
  let selectedPattern = 1;
  let sampleLang: SampleLang = "en";
  /** Library browsing state — independent from the playground case tabs. */
  let libCase = 0;
  let structuredFilter = "All";
  let compareEngine: ReturnType<typeof makeEngine> | null = null;
  const cardEngines: {
    engine: ReturnType<typeof makeEngine>;
    observer?: IntersectionObserver;
  }[] = [];
  const injected: HTMLElement[] = [];

  const defaults = {
    speed: 54,
    latency: 600,
    scenario: "steady" as const,
  };

  function reduced(): boolean {
    return !!reduceEl?.checked || matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function casePatterns(i = currentCase): PatternDefinition[] {
    return getPatternsByCase(cases[i].id as CaseId);
  }

  function currentPattern(): PatternDefinition {
    return casePatterns()[selectedPattern];
  }

  /* —— Playback chrome —— */
  label("play", "play", "Generate");
  label("pause", "pause", "Pause");
  label("stop", "stop", "Stop");
  label("accept", "accept", "Accept");
  label("reject", "reject", "Discard");
  label("reset", "reset", "Reset");
  label("exportCode", "code", "Code");
  label("copyForAi", "sparkles", "Copy for AI");
  label("sharePlay", "share", "Share");
  for (const [id, kind] of [
    ["reset", "reset"],
    ["stop", "stop"],
    ["play", "play"],
    ["sharePlay", "share"],
  ] as const) {
    const el = $maybe(id);
    if (el) wireControlAnim(el, kind);
  }

  function onState(s: EngineState): void {
    setText("status", s);
    const statusEl = $maybe("status");
    if (statusEl) statusEl.dataset.active = String(ACTIVE_STATES.includes(s));
    const active = [...ACTIVE_STATES, "Paused"].includes(s);
    if (playBtn) {
      if (active) setIconLabel(playBtn, "replay", "Restart");
      else if (s === "Interrupted") setIconLabel(playBtn, "play", "Resume stream");
      else if (
        cases[currentCase].id === "replace" ||
        cases[currentCase].id === "rewrite"
      )
        setIconLabel(playBtn, "play", "Rewrite");
      else setIconLabel(playBtn, "play", "Generate");
    }
    if (pauseBtn) {
      pauseBtn.disabled = !active;
      setIconLabel(
        pauseBtn,
        s === "Paused" ? "play" : "pause",
        s === "Paused" ? "Resume" : "Pause",
      );
    }
    if (stopBtn) stopBtn.disabled = !active && s !== "Interrupted";
    if (acceptBtn) acceptBtn.hidden = s !== "Review";
    if (rejectBtn) rejectBtn.hidden = s !== "Review";
  }

  const main = makeEngine({
    out: outputEl,
    wait: waitingEl,
    status: (s) => setText("status", s),
    announce: (s) => setText("announce", s),
    change: onState,
  });

  const appearance = mountAppearancePanel({
    root: $maybe("appearanceRoot") ?? document.createElement("div"),
    getEffect: () => currentPattern().effect,
    getCaseId: () => cases[currentCase].id as CaseId,
    getPatternName: () => currentPattern().name,
    onChange: (state) => {
      const cfg = appearanceToConfig(state);
      const next = {
        preset: cfg.preset,
        palette: cfg.palette,
        theme: cfg.theme,
        colors: null,
        appearance: cfg.appearance,
      };
      main.updateAppearance(next);
      cardEngines.forEach((c) => c.engine.updateAppearance(next));
    },
  });

  const patternSelectRoot = $maybe("patternSelect");
  const patternSelect = mountPatternSelect({
    root: patternSelectRoot ?? document.createElement("div"),
    getPatterns: () => casePatterns(),
    getSelectedIndex: () => selectedPattern,
    onSelect: (index) => choose(index),
    grouped: cases[0]?.id === "structured",
  });

  function buildConfig(
    c = cases[currentCase],
    p = currentPattern(),
    source = sourceEl.value,
    text = sampleEl.value,
  ): ResolvedConfig {
    const appearanceCfg = appearanceToConfig(appearance.getState());
    const rawScenario = getScenario();
    let speed = getSpeed();
    let latency = getLatency();
    let scenario: ResolvedConfig["scenario"] = rawScenario as ResolvedConfig["scenario"];
    if (isStressScenario(rawScenario)) {
      const o = stressOverrides(rawScenario);
      scenario = o.scenario;
      speed = o.speed;
      latency = o.latency;
    }
    const motion = getMotion();
    return {
      caseId: c.id as CaseId,
      patternId: p.id,
      patternName: p.name,
      kind: p.kind,
      effect: p.effect,
      source,
      text,
      speed,
      latency,
      waitingThresholdMs: waitingThreshold ? +waitingThreshold.value : 180,
      stallMs: 2500,
      catchUp: (catchUpEl?.value as ResolvedConfig["catchUp"]) || "catchUp",
      scenario,
      reduce: reduced(),
      motion: motion
        ? { preset: motion as NonNullable<ResolvedConfig["motion"]>["preset"] }
        : null,
      colors: null,
      preset: appearanceCfg.preset,
      palette: appearanceCfg.palette,
      theme: appearanceCfg.theme,
      persistGradient: false,
      appearance: appearanceCfg.appearance,
    };
  }

  /* —— Share / navigation helpers —— */
  /** Query string (with leading "?", or "") describing the current playground state. */
  function getShareQuery(): string {
    const q = new URLSearchParams();
    q.set("case", cases[currentCase].id);
    const p = casePatterns()[selectedPattern];
    if (p) q.set("pattern", p.id);
    q.set("speed", String(getSpeed()));
    q.set("latency", String(getLatency()));
    const motion = getMotion();
    if (motion) q.set("motion", motion);
    q.set("scenario", getScenario());
    const s = q.toString();
    return s ? `?${s}` : "";
  }

  function fullPlaygroundUrl(): string {
    return `${playgroundPath}${getShareQuery()}`;
  }

  function syncOpenFull(): void {
    if (openFullEl instanceof HTMLAnchorElement) openFullEl.href = fullPlaygroundUrl();
  }

  function updateAppearanceVisibility(): void {
    appearance.syncEffect();
  }

  function setCase(i: number, patternIndex?: number): void {
    currentCase = i;
    selectedPattern =
      patternIndex != null && patternIndex >= 0 ? patternIndex : i === 0 ? 1 : 0;
    const c = cases[i];
    if (caseTabs) {
      [...caseTabs.children].forEach((b, j) => {
        b.setAttribute("aria-selected", String(j === i));
        (b as HTMLElement).tabIndex = j === i ? 0 : -1;
      });
    }
    setText("caseDescription", c.desc);
    setText("surfaceName", c.surface);
    if (sourceField) sourceField.hidden = simple || !c.source;
    sourceEl.value = c.source;
    setText("sourceHint", c.id === "continue" ? "Prefix" : "Editable range");
    const markRange = $maybe("markRange");
    if (markRange) markRange.hidden = c.id === "continue";
    setText(
      "markerNote",
      c.id === "continue"
        ? "The incoming text is appended to the end."
        : "Use [[ and ]] to mark the insertion or replacement range.",
    );
    sampleEl.value = c.text;
    setText(
      "sampleLabel",
      c.id === "replace" || c.id === "rewrite" ? "Replacement text" : "Incoming text",
    );

    patternSelect.setGrouped(c.id === "structured");
    patternSelect.refresh();
    setText("patternNote", casePatterns(i)[selectedPattern].description);
    updateAppearanceVisibility();
    // Re-apply language pack for the new case (keeps EN/UR toggle sticky)
    if (sampleLang === "ur") {
      setSampleLang("ur", { force: true });
    } else {
      cacheEnglish(c.id, sampleEl.value, sourceEl.value);
      main.reset(buildConfig());
    }
    writeParams({
      case: c.id,
      pattern: casePatterns(i)[selectedPattern].id,
    });
    syncOpenFull();
  }

  function choose(i: number, run = false): void {
    selectedPattern = i;
    patternSelect.refresh();
    const list = casePatterns();
    setText("patternNote", list[i].description);
    if (cases[currentCase].id === "structured") {
      sampleEl.value =
        sampleLang === "ur" ? urduForCase("structured").sample : list[i].sample;
    }
    updateAppearanceVisibility();
    main.reset(buildConfig());
    writeParams({
      case: cases[currentCase].id,
      pattern: list[i].id,
    });
    syncOpenFull();
    if (run) {
      main.start(buildConfig());
      // Scroll to the live preview when the page has one; lean pages simply play in place.
      $maybe("playground")?.scrollIntoView({
        block: "start",
        behavior: reduced() ? "auto" : "smooth",
      });
    }
  }

  /* —— Library (full mode) —— */
  const libraryEnabled =
    full && options.library !== false && !!grid && !!$maybe("library");

  function teardownCards(): void {
    for (const c of cardEngines) {
      c.observer?.disconnect();
      c.engine.destroy();
    }
    cardEngines.length = 0;
    grid?.replaceChildren();
  }

  function setLibCase(i: number): void {
    if (i === libCase) return;
    libCase = i;
    structuredFilter = "All";
    renderCards();
  }

  /** Independent library case chips (separate from the playground case tabs). */
  let libCaseTabs: HTMLElement | null = null;
  function mountLibCaseTabs(): void {
    if (!libraryEnabled) return;
    libCaseTabs = $maybe("libCaseTabs");
    if (!libCaseTabs) {
      libCaseTabs = document.createElement("div");
      libCaseTabs.id = "libCaseTabs";
      libCaseTabs.className = "chip-row lib-case-tabs";
      libCaseTabs.setAttribute("role", "group");
      libCaseTabs.setAttribute("aria-label", "Library use cases");
      const anchor = $maybe("structuredFilter") ?? grid!;
      anchor.before(libCaseTabs);
      injected.push(libCaseTabs);
    }
    libCaseTabs.replaceChildren();
    cases.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.libCase = c.id;
      b.textContent = c.title;
      b.setAttribute("aria-pressed", String(i === libCase));
      on(b, "click", () => setLibCase(i));
      libCaseTabs!.append(b);
    });
  }

  function syncLibCaseTabs(): void {
    if (!libCaseTabs) return;
    [...libCaseTabs.children].forEach((b, j) =>
      b.setAttribute("aria-pressed", String(j === libCase)),
    );
  }

  /** Playground "Try": point the live preview at this card's pattern and run it. */
  function tryPattern(patternIndex: number): void {
    if (currentCase !== libCase) setCase(libCase, patternIndex);
    choose(patternIndex, true);
  }

  function renderCards(): void {
    if (!libraryEnabled || !grid) return;
    teardownCards();
    syncLibCaseTabs();
    const c = cases[libCase];
    const list = casePatterns(libCase);
    setText("lib-heading", `${c.title} patterns`);

    const filters = $maybe("structuredFilter");
    if (filters) {
      filters.hidden = c.id !== "structured";
      filters.replaceChildren();
      if (c.id === "structured") {
        const groups = ["All", ...new Set(list.map((p) => p.group).filter(Boolean))];
        for (const group of groups) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = group as string;
          b.setAttribute("aria-pressed", String(group === structuredFilter));
          on(b, "click", () => {
            structuredFilter = group as string;
            renderCards();
          });
          filters.append(b);
        }
      }
    }

    const query = libSearch?.value ?? "";
    const matches = query ? new Set(searchPatterns(query).map((x) => x.id)) : null;
    let visible = 0;

    list.forEach((p, i) => {
      if (
        c.id === "structured" &&
        structuredFilter !== "All" &&
        p.group !== structuredFilter
      ) {
        return;
      }
      if (matches && !matches.has(p.id)) return;

      visible++;
      const article = document.createElement("article");
      article.className = "card";
      article.id = `pattern-${p.id}`;
      article.innerHTML = `
      <div class="cardhead">
        <h3></h3>
        <span class="mono"></span>
      </div>
      <div class="mini mini-concise glyptide-stage" tabindex="0" aria-label="Pattern preview">
        <div class="glyptide-document"></div>
        <div class="glyptide-waiting"></div>
      </div>
      <p class="carddesc"></p>
      <div class="cardfoot">
        <span class="mono"></span>
        <div>
          <button type="button" class="btn btn-secondary btn-sm replay">Play</button>
          <button type="button" class="btn btn-secondary btn-sm miniaccept" hidden>Accept</button>
          <button type="button" class="btn btn-secondary btn-sm minireject" hidden>Discard</button>
          <button type="button" class="btn btn-ghost btn-sm use">Try</button>
          <button type="button" class="btn btn-ghost btn-sm copy-snip">Copy for AI</button>
        </div>
      </div>`;

      article.querySelector("h3")!.textContent = p.name;
      (article.querySelector(".cardhead .mono") as HTMLElement).textContent = String(
        i + 1,
      ).padStart(2, "0");
      article.querySelector(".carddesc")!.textContent = p.description;
      (article.querySelector(".cardfoot .mono") as HTMLElement).textContent = p.kind;

      const out = article.querySelector(".glyptide-document") as HTMLElement;
      const wait = article.querySelector(".glyptide-waiting") as HTMLElement;
      const replay = article.querySelector(".replay") as HTMLButtonElement;
      const useBtn = article.querySelector(".use") as HTMLButtonElement;
      const copySnip = article.querySelector(".copy-snip") as HTMLButtonElement;
      const miniAccept = article.querySelector(".miniaccept") as HTMLButtonElement;
      const miniReject = article.querySelector(".minireject") as HTMLButtonElement;

      const engine = makeEngine({
        out,
        wait,
        change: (s) => {
          if (ACTIVE_STATES.includes(s)) setIconLabel(replay, "stop", "Stop");
          else setIconLabel(replay, "replay", "Replay");
          miniAccept.hidden = s !== "Review";
          miniReject.hidden = s !== "Review";
        },
      });

      const cardSample = conciseSample(p.sample);
      /** `concise` previews are for the card stage; Copy-for-AI keeps the full sample. */
      const demo = (concise = true): ResolvedConfig => ({
        ...buildConfig(c, p, c.source, concise ? cardSample : p.sample),
        speed: 70,
        latency: 350,
        scenario: "steady",
      });

      engine.reset(demo());
      if (!c.source) {
        out.textContent = cardSample;
        wait.textContent = "Ready to preview.";
      }

      setIconLabel(replay, "play", "Play");
      setIconLabel(useBtn, "arrowRight", "Try");
      setIconLabel(copySnip, "sparkles", "Copy for AI");
      setIconLabel(miniAccept, "accept", "Accept");
      setIconLabel(miniReject, "reject", "Discard");
      wireControlAnim(replay, "replay");

      on(miniAccept, "click", () => engine.accept());
      on(miniReject, "click", () => engine.reject());
      on(replay, "click", () =>
        ACTIVE_STATES.includes(engine.state) ? engine.stop() : engine.start(demo()),
      );
      on(useBtn, "click", () => tryPattern(i));
      on(copySnip, "click", async () => {
        const snip = buildCopyForAiPrompt({
          pattern: p,
          config: demo(false),
          appearanceState: appearance.getState(),
        });
        await copyWithIconFeedback(copySnip, snip, {
          idleIcon: "sparkles",
          idleLabel: "Copy for AI",
          successLabel: "Copied for AI",
          holdMs: 1400,
        });
      });

      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting && ACTIVE_STATES.includes(engine.state)) {
              engine.stop();
            }
          }
        },
        { rootMargin: "40px", threshold: 0.05 },
      );
      observer.observe(article);

      cardEngines.push({ engine, observer });
      grid.append(article);
    });

    const empty = $maybe("libEmpty");
    if (empty) empty.hidden = visible > 0;
  }

  /** Resolve `#pattern-{id}` to its case, switch the library to it, and scroll the card into view. */
  function revealHashPattern(): void {
    if (!libraryEnabled || !location.hash.startsWith("#pattern-")) return;
    const id = decodeURIComponent(location.hash.slice("#pattern-".length));
    const p = patterns.find((x) => x.id === id);
    if (!p) return;
    const idx = cases.findIndex((c) => c.id === p.caseId);
    if (idx < 0) return;
    let needsRender = idx !== libCase;
    if (needsRender) {
      libCase = idx;
      structuredFilter = "All";
    }
    if (libSearch?.value) {
      libSearch.value = "";
      needsRender = true;
    }
    if (isFilteredOutByGroup(p)) {
      structuredFilter = "All";
      needsRender = true;
    }
    if (needsRender) renderCards();
    requestAnimationFrame(() => {
      document.getElementById(`pattern-${id}`)?.scrollIntoView({ block: "start" });
    });
  }

  function isFilteredOutByGroup(p: PatternDefinition): boolean {
    return (
      cases[libCase].id === "structured" &&
      structuredFilter !== "All" &&
      p.group !== structuredFilter
    );
  }

  /* —— Case tabs —— */
  if (caseTabs) {
    caseTabs.replaceChildren();
    cases.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.id = `tab${i}`;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "playground");
      b.textContent = c.title;
      on(b, "click", () => setCase(i));
      on(b, "keydown", (e) => {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const j =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? cases.length - 1
                : (i + (e.key === "ArrowRight" ? 1 : -1) + cases.length) % cases.length;
          setCase(j);
          (caseTabs.children[j] as HTMLElement).focus();
        }
      });
      caseTabs.append(b);
    });
  }

  /* —— Controls —— */
  on($maybe("markRange"), "click", () => {
    const el = sourceEl;
    const a = el.selectionStart;
    const b = el.selectionEnd;
    const raw = el.value;
    const clean = (t: string) => t.replace(/\[\[|\]\]/g, "");
    const before = clean(raw.slice(0, a));
    const mid = clean(raw.slice(a, b));
    const after = clean(raw.slice(b));
    el.value = `${before}[[${mid}]]${after}`;
    main.reset(buildConfig());
    el.focus();
    el.setSelectionRange(before.length + 2, before.length + 2 + mid.length);
  });

  on(playBtn, "click", () =>
    main.state === "Interrupted" ? main.resume() : main.start(buildConfig()),
  );
  on(pauseBtn, "click", () => (main.state === "Paused" ? main.resume() : main.pause()));
  on(stopBtn, "click", () => main.stop());
  on($maybe("reset"), "click", () => main.reset(buildConfig()));
  on(acceptBtn, "click", () => main.accept());
  on(rejectBtn, "click", () => main.reject());

  const syncSpeed = (): void => setText("speedValue", `${getSpeed()} chars/s`);
  const syncLatency = (): void => setText("latencyValue", `${getLatency()} ms`);
  on(speedEl, "input", syncSpeed);
  on(latencyEl, "input", syncLatency);
  syncSpeed();
  syncLatency();

  function syncWaitingThreshold(): void {
    if (waitingThreshold && waitingThresholdValue) {
      waitingThresholdValue.textContent = `${waitingThreshold.value} ms`;
    }
  }
  on(waitingThreshold, "input", syncWaitingThreshold);
  syncWaitingThreshold();

  function syncMotionHint(): void {
    if (motionHint && motionPresetEl) {
      motionHint.textContent = MOTION_HINTS[motionPresetEl.value] ?? MOTION_HINTS.natural;
    }
    if (motionPresetEl) writeParams({ motion: motionPresetEl.value });
    syncOpenFull();
  }

  function syncReduceHint(): void {
    if (reduceHint) reduceHint.hidden = !reduceEl?.checked;
  }

  on(reduceEl, "change", () => {
    syncReduceHint();
    main.reset(buildConfig());
    renderCards();
  });

  on($maybe("defaults"), "click", () => {
    if (speedEl) speedEl.value = String(defaults.speed);
    else fallback.speed = defaults.speed;
    if (latencyEl) latencyEl.value = String(defaults.latency);
    else fallback.latency = defaults.latency;
    setScenario(defaults.scenario);
    if (reduceEl) reduceEl.checked = false;
    setMotion("natural");
    if (waitingThreshold) waitingThreshold.value = "180";
    if (catchUpEl) catchUpEl.value = "catchUp";
    appearance.setState(resetAppearanceDefaults());
    setSampleLang("en", { force: true });
    syncSpeed();
    syncLatency();
    syncWaitingThreshold();
    syncMotionHint();
    syncReduceHint();
    main.reset(buildConfig());
  });

  on(libSearch, "input", () => renderCards());

  document.addEventListener(
    "keydown",
    (e) => {
      if (
        (e.target instanceof HTMLElement && e.target.matches("textarea,input,select")) ||
        codeDialog?.open
      )
        return;
      if (main.state === "Review" && e.key === "Escape") {
        e.preventDefault();
        main.reject();
      }
      if (main.state === "Review" && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        main.accept();
      }
    },
    { signal },
  );

  /* —— Export / share —— */
  const exportCodeBtn = $maybe("exportCode");
  const copyCodeBtn = label("copyCode", "copy", "Copy");
  on(exportCodeBtn, "click", () => {
    if (!codeDialog) return;
    setText("codeText", buildExportHtml(buildConfig()));
    setText("copyStatus", "");
    codeDialog.showModal();
  });
  on($maybe("closeCode"), "click", () => codeDialog?.close());
  on(copyCodeBtn, "click", async () => {
    const ok = await copyWithIconFeedback(
      copyCodeBtn!,
      $maybe("codeText")?.textContent || "",
      { idleLabel: "Copy", successLabel: "Copied" },
    );
    setText("copyStatus", ok ? "Copied." : "Select and copy manually.");
  });
  on($maybe("downloadCode"), "click", () => {
    const blob = new Blob([$maybe("codeText")?.textContent || ""], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glyptide-${currentPattern().id}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const shareBtn = $maybe("sharePlay");
  on(shareBtn, "click", async () => {
    let url: string;
    if (full) {
      writePlaygroundParams({
        case: cases[currentCase].id,
        pattern: currentPattern().id,
        speed: String(getSpeed()),
        latency: String(getLatency()),
        scenario: getScenario(),
      });
      url = location.href;
    } else {
      url = new URL(fullPlaygroundUrl(), location.origin).href;
    }
    await copyWithIconFeedback(shareBtn!, url, {
      idleIcon: "share",
      idleLabel: "Share",
      successLabel: "Link copied",
      holdMs: 1400,
    });
  });

  const copyForAiBtn = $maybe("copyForAi");
  on(copyForAiBtn, "click", async () => {
    const prompt = buildCopyForAiPrompt({
      pattern: currentPattern(),
      config: buildConfig(),
      appearanceState: appearance.getState(),
    });
    await copyWithIconFeedback(copyForAiBtn!, prompt, {
      idleIcon: "sparkles",
      idleLabel: "Copy for AI",
      successLabel: "Copied for AI",
    });
  });

  /* —— Open full playground (simple mode) —— */
  on(openFullEl, "click", (e) => {
    if (!openFullEl) return;
    if (openFullEl instanceof HTMLAnchorElement) {
      // Let the native navigation proceed with a fresh query.
      openFullEl.href = fullPlaygroundUrl();
      return;
    }
    e.preventDefault();
    location.assign(fullPlaygroundUrl());
  });

  /* —— Host environment simulation (full only) —— */
  if (full) {
    const hostFg = $maybe<HTMLInputElement>("hostFg");
    const hostBg = $maybe<HTMLInputElement>("hostBg");
    const applyHostColors = (): void => {
      const stage = document.querySelector<HTMLElement>(".stage");
      if (!stage) return;
      if (hostFg) stage.style.color = hostFg.value;
      if (hostBg) stage.style.background = hostBg.value;
    };
    on(hostFg, "input", applyHostColors);
    on(hostBg, "input", applyHostColors);
  }

  /* —— Sample language: English ↔ Urdu (RTL) (full only) —— */
  function setSampleLang(lang: SampleLang, opts?: { force?: boolean }): void {
    if (lang === sampleLang && !opts?.force) return;
    const caseId = cases[currentCase].id;
    const sourceVisible = !!sourceField && !sourceField.hidden;

    if (sampleLang === "en") {
      cacheEnglish(caseId, sampleEl.value, sourceEl.value);
    }

    sampleLang = lang;
    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    });

    if (lang === "ur") {
      const ur = urduForCase(caseId);
      sampleEl.value = ur.sample;
      sampleEl.dir = "rtl";
      sampleEl.lang = "ur";
      if (ur.source != null && sourceVisible) {
        sourceEl.value = ur.source;
        sourceEl.dir = "rtl";
        sourceEl.lang = "ur";
      }
      outputEl.dir = "rtl";
      outputEl.lang = "ur";
    } else {
      const cached = englishFromCache(caseId);
      const c = cases[currentCase];
      const p = currentPattern();
      sampleEl.value = cached?.sample ?? (c.id === "structured" ? p.sample : c.text);
      sampleEl.dir = "ltr";
      sampleEl.lang = "en";
      if (sourceVisible) {
        sourceEl.value = cached?.source ?? c.source;
        sourceEl.dir = "ltr";
        sourceEl.lang = "en";
      }
      outputEl.dir = "ltr";
      outputEl.lang = "en";
    }
    main.reset(buildConfig());
  }

  if (full) {
    document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((btn) => {
      on(btn, "click", () => setSampleLang((btn.dataset.lang as SampleLang) || "en"));
    });
  }

  /* —— Motion preset feedback —— */
  on(motionPresetEl, "change", syncMotionHint);
  on(motionPresetEl, "input", syncMotionHint);
  on(reduceEl, "change", syncReduceHint);

  /* —— Compare mode: second stage sharing the same config clock (full only) —— */
  const compareMode = full ? $maybe<HTMLInputElement>("compareMode") : null;
  const altPattern = (): PatternDefinition => {
    const cfg = buildConfig();
    return getPatternsByCase(cfg.caseId)[
      Math.min(selectedPattern + 1, casePatterns().length - 1)
    ];
  };
  on(compareMode, "change", () => {
    const stage = $maybe("stage") ?? document.querySelector<HTMLElement>(".stage");
    let compareOut = document.getElementById("compareOutput");
    let compareWait = document.getElementById("compareWaiting");
    if (compareMode!.checked) {
      if (!compareOut && stage?.parentElement) {
        const wrap = document.createElement("div");
        wrap.className = "stage compare-stage";
        wrap.id = "compareStage";
        wrap.innerHTML =
          '<div class="glyptide-document" id="compareOutput"></div><div class="glyptide-waiting" id="compareWaiting"></div>';
        stage.parentElement.append(wrap);
        compareOut = document.getElementById("compareOutput");
        compareWait = document.getElementById("compareWaiting");
      }
      if (compareOut && compareWait) {
        compareEngine = makeEngine({ out: compareOut, wait: compareWait });
        const alt = altPattern();
        compareEngine.reset({
          ...buildConfig(),
          patternId: alt.id,
          patternName: alt.name,
          kind: alt.kind,
          effect: alt.effect,
        });
      }
    } else {
      compareEngine?.destroy();
      compareEngine = null;
      document.getElementById("compareStage")?.remove();
    }
  });
  on(playBtn, "click", () => {
    if (compareEngine && compareMode?.checked) {
      const alt = altPattern();
      compareEngine.start({
        ...buildConfig(),
        patternId: alt.id,
        patternName: alt.name,
        kind: alt.kind,
        effect: alt.effect,
      });
    }
  });

  /* —— Library case tabs (before first render) —— */
  mountLibCaseTabs();

  /* —— Deep link: case + pattern atomically, then control values —— */
  if (params.speed) {
    if (speedEl) speedEl.value = params.speed;
    else fallback.speed = +params.speed || fallback.speed;
  }
  if (params.latency) {
    if (latencyEl) latencyEl.value = params.latency;
    else fallback.latency = +params.latency || fallback.latency;
  }
  if (params.scenario) setScenario(params.scenario);
  syncSpeed();
  syncLatency();

  if (params.case) {
    const idx = cases.findIndex((c) => c.id === params.case);
    if (idx >= 0) {
      const pi = params.pattern
        ? casePatterns(idx).findIndex((p) => p.id === params.pattern)
        : -1;
      setCase(idx, pi >= 0 ? pi : undefined);
    } else setCase(0);
  } else {
    setCase(0);
  }

  // Library starts on the playground's case; a #pattern-… hash may redirect it below.
  libCase = currentCase;

  syncMotionHint();
  syncReduceHint();
  // Apply motion from URL after listeners exist
  if (params.motion) {
    setMotion(params.motion);
    syncMotionHint();
  }

  /* Embed mode — chrome-less playground */
  if (params.embed === "1") {
    document.documentElement.classList.add("embed-mode");
    document.body.classList.add("embed-mode");
    writeParams({ embed: "1" });
  }

  renderCards();
  revealHashPattern();
  window.addEventListener("hashchange", revealHashPattern, { signal });

  /* Theme palette refresh — switch preset variants without restarting */
  window.addEventListener("glyptide-theme", () => appearance.syncTheme(), { signal });

  appearance.applyInitial();
  syncOpenFull();

  function destroy(): void {
    ac.abort();
    main.destroy();
    compareEngine?.destroy();
    compareEngine = null;
    document.getElementById("compareStage")?.remove();
    teardownCards();
    patternSelect.close();
    patternSelectRoot?.replaceChildren();
    caseTabs?.replaceChildren();
    $maybe("structuredFilter")?.replaceChildren();
    for (const el of injected) el.remove();
    injected.length = 0;
  }

  return { destroy, getShareQuery };
}
