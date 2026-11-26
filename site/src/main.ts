import {
  cases,
  createGlyptide,
  getPatternsByCase,
  makeEngine,
  patternCount,
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
} from "./appearance-panel";
import { mountPatternSelect } from "./pattern-select";
import { initHero } from "./hero";
import { syncThemeSwitch, initTheme } from "./theme";
import { buildCopyForAiPrompt } from "./copy-ai";
import { buildExportHtml, INTEGRATE_SNIPPETS } from "./export";
import { readPlaygroundParams, writePlaygroundParams } from "./url-state";
import { isStressScenario, stressOverrides } from "./stress";
import {
  MOTION_HINTS,
  cacheEnglish,
  englishFromCache,
  urduForCase,
  type SampleLang,
} from "./locale-samples";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

initTheme();
syncThemeSwitch();

$("heroMeta").textContent =
  `${patternCount} patterns · 6 use cases · Open source`;

initHero($("heroSentence"), $("heroPause"));

/* —— Integration strip —— */
let codeTab: keyof typeof INTEGRATE_SNIPPETS = "js";
function renderIntegrate(): void {
  $("integrateCode").textContent = INTEGRATE_SNIPPETS[codeTab];
}
document.querySelectorAll<HTMLButtonElement>("[data-code-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    codeTab = btn.dataset.codeTab as keyof typeof INTEGRATE_SNIPPETS;
    document.querySelectorAll("[data-code-tab]").forEach((b) =>
      b.setAttribute("aria-selected", String(b === btn)),
    );
    renderIntegrate();
  });
});
renderIntegrate();

$("copyIntegrate").onclick = async () => {
  try {
    await navigator.clipboard.writeText(INTEGRATE_SNIPPETS[codeTab]);
    $("copyIntegrateStatus").textContent = "Copied";
    setTimeout(() => ($("copyIntegrateStatus").textContent = ""), 1600);
  } catch {
    $("copyIntegrateStatus").textContent = "Select and copy manually";
  }
};

/* —— Playground —— */
let currentCase = 0;
let selectedPattern = 1;
let structuredFilter = "All";
let sampleLang: SampleLang = "en";
const cardEngines: {
  engine: ReturnType<typeof makeEngine>;
  start: () => void;
  stop: () => void;
  el: HTMLElement;
  observer?: IntersectionObserver;
}[] = [];

const defaults = {
  speed: 54,
  latency: 600,
  scenario: "steady" as const,
};

function reduced(): boolean {
  return (
    ($("reduce") as HTMLInputElement).checked ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function casePatterns(i = currentCase): PatternDefinition[] {
  return getPatternsByCase(cases[i].id as CaseId);
}

function currentPattern(): PatternDefinition {
  return casePatterns()[selectedPattern];
}

function onState(s: EngineState): void {
  $("status").textContent = s;
  $("status").dataset.active = String(
    ["Waiting", "Generating", "Waiting for text"].includes(s),
  );
  const active = ["Waiting", "Generating", "Waiting for text", "Paused"].includes(s);
  const play = $("play") as HTMLButtonElement;
  play.textContent = active
    ? "Restart"
    : s === "Interrupted"
      ? "Resume stream"
      : cases[currentCase].id === "replace" || cases[currentCase].id === "rewrite"
        ? "Rewrite"
        : "Generate";
  ($("pause") as HTMLButtonElement).disabled = !active;
  ($("pause") as HTMLButtonElement).textContent = s === "Paused" ? "Resume" : "Pause";
  ($("stop") as HTMLButtonElement).disabled = !active && s !== "Interrupted";
  ($("accept") as HTMLButtonElement).hidden = s !== "Review";
  ($("reject") as HTMLButtonElement).hidden = s !== "Review";
}

const main = makeEngine({
  out: $("output"),
  wait: $("waiting"),
  status: (s) => ($("status").textContent = s),
  announce: (s) => ($("announce").textContent = s),
  change: onState,
});

const appearance = mountAppearancePanel({
  root: $("appearanceRoot"),
  getEffect: () => currentPattern().effect,
  getCaseId: () => cases[currentCase].id as CaseId,
  getPatternName: () => currentPattern().name,
  onChange: (state) => {
    const cfg = appearanceToConfig(state);
    main.updateAppearance({
      preset: cfg.preset,
      palette: cfg.palette,
      theme: cfg.theme,
      colors: null,
      appearance: cfg.appearance,
    });
    cardEngines.forEach((c) =>
      c.engine.updateAppearance({
        preset: cfg.preset,
        palette: cfg.palette,
        theme: cfg.theme,
        colors: null,
        appearance: cfg.appearance,
      }),
    );
  },
});

const patternSelect = mountPatternSelect({
  root: $("patternSelect"),
  getPatterns: () => casePatterns(),
  getSelectedIndex: () => selectedPattern,
  onSelect: (index) => choose(index),
  grouped: cases[0]?.id === "structured",
});

function buildConfig(
  c = cases[currentCase],
  p = currentPattern(),
  source = ($("source") as HTMLTextAreaElement).value,
  text = ($("sample") as HTMLTextAreaElement).value,
): ResolvedConfig {
  const appearanceCfg = appearanceToConfig(appearance.getState());
  const motionEl = document.getElementById("motionPreset") as HTMLSelectElement | null;
  const catchUpEl = document.getElementById("catchUp") as HTMLSelectElement | null;
  const waitThreshEl = document.getElementById("waitingThreshold") as HTMLInputElement | null;
  const rawScenario = ($("scenario") as HTMLSelectElement).value;
  let speed = +($("speed") as HTMLInputElement).value;
  let latency = +($("latency") as HTMLInputElement).value;
  let scenario: ResolvedConfig["scenario"] = rawScenario as ResolvedConfig["scenario"];
  if (isStressScenario(rawScenario)) {
    const o = stressOverrides(rawScenario);
    scenario = o.scenario;
    speed = o.speed;
    latency = o.latency;
  }
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
    waitingThresholdMs: waitThreshEl ? +waitThreshEl.value : 180,
    stallMs: 2500,
    catchUp: (catchUpEl?.value as ResolvedConfig["catchUp"]) || "catchUp",
    scenario,
    reduce: reduced(),
    motion: motionEl?.value
      ? { preset: motionEl.value as NonNullable<ResolvedConfig["motion"]>["preset"] }
      : null,
    colors: null,
    preset: appearanceCfg.preset,
    palette: appearanceCfg.palette,
    theme: appearanceCfg.theme,
    persistGradient: false,
    appearance: appearanceCfg.appearance,
  };
}

function updateAppearanceVisibility(): void {
  appearance.syncEffect();
}

function setCase(i: number, patternIndex?: number): void {
  currentCase = i;
  structuredFilter = "All";
  selectedPattern =
    patternIndex != null && patternIndex >= 0
      ? patternIndex
      : i === 0
        ? 1
        : 0;
  const c = cases[i];
  [...$("caseTabs").children].forEach((b, j) => {
    b.setAttribute("aria-selected", String(j === i));
    (b as HTMLElement).tabIndex = j === i ? 0 : -1;
  });
  $("caseDescription").textContent = c.desc;
  $("surfaceName").textContent = c.surface;
  ($("sourceField") as HTMLElement).hidden = !c.source;
  ($("source") as HTMLTextAreaElement).value = c.source;
  $("sourceHint").textContent = c.id === "continue" ? "Prefix" : "Editable range";
  ($("markRange") as HTMLButtonElement).hidden = c.id === "continue";
  $("markerNote").textContent =
    c.id === "continue"
      ? "The incoming text is appended to the end."
      : "Use [[ and ]] to mark the insertion or replacement range.";
  ($("sample") as HTMLTextAreaElement).value = c.text;
  $("sampleLabel").textContent =
    c.id === "replace" || c.id === "rewrite" ? "Replacement text" : "Incoming text";

  patternSelect.setGrouped(c.id === "structured");
  patternSelect.refresh();
  $("patternNote").textContent = casePatterns(i)[selectedPattern].description;
  updateAppearanceVisibility();
  // Re-apply language pack for the new case (keeps EN/UR toggle sticky)
  if (sampleLang === "ur") {
    setSampleLang("ur", { force: true });
  } else {
    cacheEnglish(c.id, ($("sample") as HTMLTextAreaElement).value, ($("source") as HTMLTextAreaElement).value);
    main.reset(buildConfig());
  }
  renderCards();
  writePlaygroundParams({
    case: c.id,
    pattern: casePatterns(i)[selectedPattern].id,
  });
}

function choose(i: number, run = false): void {
  selectedPattern = i;
  patternSelect.refresh();
  const list = casePatterns();
  $("patternNote").textContent = list[i].description;
  if (cases[currentCase].id === "structured") {
    if (sampleLang === "ur") {
      ($("sample") as HTMLTextAreaElement).value = urduForCase("structured").sample;
    } else {
      ($("sample") as HTMLTextAreaElement).value = list[i].sample;
    }
  }
  updateAppearanceVisibility();
  main.reset(buildConfig());
  writePlaygroundParams({
    case: cases[currentCase].id,
    pattern: list[i].id,
  });
  if (run) {
    main.start(buildConfig());
    $("playground").scrollIntoView({
      block: "start",
      behavior: reduced() ? "auto" : "smooth",
    });
  }
}

function teardownCards(): void {
  for (const c of cardEngines) {
    c.observer?.disconnect();
    c.engine.destroy();
  }
  cardEngines.length = 0;
  $("grid").replaceChildren();
}

function renderCards(): void {
  teardownCards();
  const c = cases[currentCase];
  const list = casePatterns();
  const heading = document.getElementById("lib-heading");
  if (heading) heading.textContent = `${c.title} patterns`;

  const filters = $("structuredFilter");
  filters.hidden = c.id !== "structured";
  filters.replaceChildren();
  if (c.id === "structured") {
    const groups = ["All", ...new Set(list.map((p) => p.group).filter(Boolean))];
    for (const group of groups) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = group as string;
      b.setAttribute("aria-pressed", String(group === structuredFilter));
      b.onclick = () => {
        structuredFilter = group as string;
        renderCards();
      };
      filters.append(b);
    }
  }

  const query = ($("libSearch") as HTMLInputElement).value;
  let visible = 0;

  list.forEach((p, i) => {
    if (
      c.id === "structured" &&
      structuredFilter !== "All" &&
      p.group !== structuredFilter
    ) {
      return;
    }
    if (query && !searchPatterns(query).some((x) => x.id === p.id)) return;

    visible++;
    const article = document.createElement("article");
    article.className = "card";
    article.id = `pattern-${p.id}`;
    article.innerHTML = `
      <div class="cardhead">
        <h3></h3>
        <span class="mono"></span>
      </div>
      <div class="mini glyptide-stage" tabindex="0" aria-label="Pattern preview">
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
          <button type="button" class="btn btn-ghost btn-sm use">Try ↗</button>
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

    const engine = makeEngine({
      out,
      wait,
      change: (s) => {
        replay.textContent = ["Waiting", "Generating", "Waiting for text"].includes(s)
          ? "Stop"
          : "Replay";
        (article.querySelector(".miniaccept") as HTMLElement).hidden = s !== "Review";
        (article.querySelector(".minireject") as HTMLElement).hidden = s !== "Review";
      },
    });

    const demo = (): ResolvedConfig => ({
      ...buildConfig(c, p, c.source, p.sample),
      speed: 70,
      latency: 350,
      scenario: "steady",
    });

    engine.reset(demo());
    if (!c.source) {
      out.textContent = p.sample;
      wait.textContent = "Ready to preview.";
    }

    (article.querySelector(".miniaccept") as HTMLButtonElement).onclick = () =>
      engine.accept();
    (article.querySelector(".minireject") as HTMLButtonElement).onclick = () =>
      engine.reject();
    replay.onclick = () =>
      ["Waiting", "Generating", "Waiting for text"].includes(engine.state)
        ? engine.stop()
        : engine.start(demo());
    (article.querySelector(".use") as HTMLButtonElement).onclick = () =>
      choose(i, true);
    (article.querySelector(".copy-snip") as HTMLButtonElement).onclick = async () => {
      const snip = buildCopyForAiPrompt({
        pattern: p,
        config: demo(),
        appearanceState: appearance.getState(),
      });
      try {
        await navigator.clipboard.writeText(snip);
        (article.querySelector(".copy-snip") as HTMLButtonElement).textContent =
          "Copied for AI";
        setTimeout(() => {
          (article.querySelector(".copy-snip") as HTMLButtonElement).textContent =
            "Copy for AI";
        }, 1400);
      } catch {
        /* ignore */
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) {
            if (["Waiting", "Generating", "Waiting for text"].includes(engine.state)) {
              engine.stop();
            }
          }
        }
      },
      { rootMargin: "40px", threshold: 0.05 },
    );
    observer.observe(article);

    cardEngines.push({
      engine,
      start: () => engine.start(demo()),
      stop: () => engine.stop(),
      el: article,
      observer,
    });
    $("grid").append(article);
  });

  ($("libEmpty") as HTMLElement).hidden = visible > 0;
}

/* Case tabs */
cases.forEach((c, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.id = `tab${i}`;
  b.setAttribute("role", "tab");
  b.setAttribute("aria-controls", "playground");
  b.textContent = c.title;
  b.onclick = () => setCase(i);
  b.onkeydown = (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const j =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? cases.length - 1
            : (i + (e.key === "ArrowRight" ? 1 : -1) + cases.length) %
              cases.length;
      setCase(j);
      ($("caseTabs").children[j] as HTMLElement).focus();
    }
  };
  $("caseTabs").append(b);
});

/* Controls */
($("markRange") as HTMLButtonElement).onclick = () => {
  const el = $("source") as HTMLTextAreaElement;
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
};

($("play") as HTMLButtonElement).onclick = () =>
  main.state === "Interrupted" ? main.resume() : main.start(buildConfig());
($("pause") as HTMLButtonElement).onclick = () =>
  main.state === "Paused" ? main.resume() : main.pause();
($("stop") as HTMLButtonElement).onclick = () => main.stop();
($("reset") as HTMLButtonElement).onclick = () => main.reset(buildConfig());
($("accept") as HTMLButtonElement).onclick = () => main.accept();
($("reject") as HTMLButtonElement).onclick = () => main.reject();

const speed = $("speed") as HTMLInputElement;
const latency = $("latency") as HTMLInputElement;
const syncSpeed = () => {
  $("speedValue").textContent = `${speed.value} chars/s`;
};
const syncLatency = () => {
  $("latencyValue").textContent = `${latency.value} ms`;
};
speed.oninput = syncSpeed;
latency.oninput = syncLatency;
syncSpeed();
syncLatency();

($("reduce") as HTMLInputElement).onchange = () => {
  syncReduceHint();
  main.reset(buildConfig());
  renderCards();
};

($("defaults") as HTMLButtonElement).onclick = () => {
  speed.value = String(defaults.speed);
  latency.value = String(defaults.latency);
  ($("scenario") as HTMLSelectElement).value = defaults.scenario;
  ($("reduce") as HTMLInputElement).checked = false;
  if (motionPresetEl) motionPresetEl.value = "natural";
  const waitEl = document.getElementById("waitingThreshold") as HTMLInputElement | null;
  if (waitEl) waitEl.value = "180";
  const catchEl = document.getElementById("catchUp") as HTMLSelectElement | null;
  if (catchEl) catchEl.value = "catchUp";
  appearance.setState(resetAppearanceDefaults());
  setSampleLang("en", { force: true });
  syncSpeed();
  syncLatency();
  syncWaitingThreshold();
  syncMotionHint();
  syncReduceHint();
  main.reset(buildConfig());
};

($("libSearch") as HTMLInputElement).oninput = () => renderCards();

document.addEventListener("keydown", (e) => {
  if (
    (e.target as HTMLElement).matches("textarea,input,select") ||
    ($("codeDialog") as HTMLDialogElement).open
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
});

/* Export / share */
($("exportCode") as HTMLButtonElement).onclick = () => {
  const html = buildExportHtml(buildConfig());
  $("codeText").textContent = html;
  $("copyStatus").textContent = "";
  ($("codeDialog") as HTMLDialogElement).showModal();
};

($("closeCode") as HTMLButtonElement).onclick = () =>
  ($("codeDialog") as HTMLDialogElement).close();

($("copyCode") as HTMLButtonElement).onclick = async () => {
  try {
    await navigator.clipboard.writeText($("codeText").textContent || "");
    $("copyStatus").textContent = "Copied.";
  } catch {
    $("copyStatus").textContent = "Select and copy manually.";
  }
};

($("downloadCode") as HTMLButtonElement).onclick = () => {
  const blob = new Blob([$("codeText").textContent || ""], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `glyptide-${currentPattern().id}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
};

($("sharePlay") as HTMLButtonElement).onclick = async () => {
  writePlaygroundParams({
    case: cases[currentCase].id,
    pattern: currentPattern().id,
    speed: speed.value,
    latency: latency.value,
    scenario: ($("scenario") as HTMLSelectElement).value,
  });
  try {
    await navigator.clipboard.writeText(location.href);
    ($("sharePlay") as HTMLButtonElement).textContent = "Link copied";
    setTimeout(() => {
      ($("sharePlay") as HTMLButtonElement).textContent = "Share";
    }, 1400);
  } catch {
    /* ignore */
  }
};

($("copyForAi") as HTMLButtonElement).onclick = async () => {
  const prompt = buildCopyForAiPrompt({
    pattern: currentPattern(),
    config: buildConfig(),
    appearanceState: appearance.getState(),
  });
  try {
    await navigator.clipboard.writeText(prompt);
    ($("copyForAi") as HTMLButtonElement).textContent = "Copied for AI";
    setTimeout(() => {
      ($("copyForAi") as HTMLButtonElement).textContent = "Copy for AI";
    }, 1600);
  } catch {
    ($("copyForAi") as HTMLButtonElement).textContent = "Copy failed";
    setTimeout(() => {
      ($("copyForAi") as HTMLButtonElement).textContent = "Copy for AI";
    }, 1600);
  }
};

/* Deep link — apply case + pattern atomically (setCase alone would reset pattern) */
const params = readPlaygroundParams();
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

if (params.speed) speed.value = params.speed;
if (params.latency) latency.value = params.latency;
if (params.scenario) ($("scenario") as HTMLSelectElement).value = params.scenario;
syncSpeed();
syncLatency();

const waitingThreshold = document.getElementById(
  "waitingThreshold",
) as HTMLInputElement | null;
const waitingThresholdValue = document.getElementById("waitingThresholdValue");
function syncWaitingThreshold(): void {
  if (waitingThreshold && waitingThresholdValue) {
    waitingThresholdValue.textContent = `${waitingThreshold.value} ms`;
  }
}
waitingThreshold?.addEventListener("input", syncWaitingThreshold);
syncWaitingThreshold();

/* Host environment simulation */
const hostFg = document.getElementById("hostFg") as HTMLInputElement | null;
const hostBg = document.getElementById("hostBg") as HTMLInputElement | null;
function applyHostColors(): void {
  const stage = document.querySelector(".stage") as HTMLElement | null;
  if (!stage) return;
  if (hostFg) stage.style.color = hostFg.value;
  if (hostBg) stage.style.background = hostBg.value;
}
hostFg?.addEventListener("input", applyHostColors);
hostBg?.addEventListener("input", applyHostColors);

/* Sample language: English ↔ Urdu (RTL) */
function setSampleLang(lang: SampleLang, opts?: { force?: boolean }): void {
  if (lang === sampleLang && !opts?.force) return;
  const sampleEl = $("sample") as HTMLTextAreaElement;
  const sourceEl = $("source") as HTMLTextAreaElement;
  const out = $("output");
  const caseId = cases[currentCase].id;

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
    if (ur.source != null && !($("sourceField") as HTMLElement).hidden) {
      sourceEl.value = ur.source;
      sourceEl.dir = "rtl";
      sourceEl.lang = "ur";
    }
    out.dir = "rtl";
    out.lang = "ur";
  } else {
    const cached = englishFromCache(caseId);
    const c = cases[currentCase];
    const p = currentPattern();
    sampleEl.value = cached?.sample ?? (c.id === "structured" ? p.sample : c.text);
    sampleEl.dir = "ltr";
    sampleEl.lang = "en";
    if (!($("sourceField") as HTMLElement).hidden) {
      sourceEl.value = cached?.source ?? c.source;
      sourceEl.dir = "ltr";
      sourceEl.lang = "en";
    }
    out.dir = "ltr";
    out.lang = "en";
  }
  main.reset(buildConfig());
}

document.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setSampleLang((btn.dataset.lang as SampleLang) || "en");
  });
});

/* Motion preset feedback */
const motionPresetEl = document.getElementById(
  "motionPreset",
) as HTMLSelectElement | null;
const motionHint = document.getElementById("motionHint");
const reduceHint = document.getElementById("reduceHint");

function syncMotionHint(): void {
  if (!motionHint || !motionPresetEl) return;
  motionHint.textContent =
    MOTION_HINTS[motionPresetEl.value] ?? MOTION_HINTS.natural;
  writePlaygroundParams({ motion: motionPresetEl.value });
}

function syncReduceHint(): void {
  const on = ($("reduce") as HTMLInputElement).checked;
  if (reduceHint) reduceHint.hidden = !on;
}

motionPresetEl?.addEventListener("change", syncMotionHint);
motionPresetEl?.addEventListener("input", syncMotionHint);
($("reduce") as HTMLInputElement).addEventListener("change", syncReduceHint);
syncMotionHint();
syncReduceHint();
// Apply motion from URL after listeners exist
if (params.motion && motionPresetEl) {
  motionPresetEl.value = params.motion;
  syncMotionHint();
}

/* Compare mode — second stage sharing the same config clock */
const compareMode = document.getElementById("compareMode") as HTMLInputElement | null;
let compareEngine: ReturnType<typeof makeEngine> | null = null;
compareMode?.addEventListener("change", () => {
  const stage = document.querySelector(".stage") as HTMLElement | null;
  let compareOut = document.getElementById("compareOutput");
  let compareWait = document.getElementById("compareWaiting");
  if (compareMode.checked) {
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
      compareEngine = makeEngine({
        out: compareOut as HTMLElement,
        wait: compareWait as HTMLElement,
      });
      const cfg = buildConfig();
      const alt = getPatternsByCase(cfg.caseId)[Math.min(selectedPattern + 1, casePatterns().length - 1)];
      compareEngine.reset({
        ...cfg,
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

const _origPlay = ($("play") as HTMLButtonElement).onclick;
($("play") as HTMLButtonElement).addEventListener("click", () => {
  if (compareEngine && compareMode?.checked) {
    const cfg = buildConfig();
    const alt = getPatternsByCase(cfg.caseId)[
      Math.min(selectedPattern + 1, casePatterns().length - 1)
    ];
    compareEngine.start({
      ...cfg,
      patternId: alt.id,
      patternName: alt.name,
      kind: alt.kind,
      effect: alt.effect,
    });
  }
});
void _origPlay;

/* Embed mode — chrome-less playground */
if (params.embed === "1") {
  document.documentElement.classList.add("embed-mode");
  document.body.classList.add("embed-mode");
  writePlaygroundParams({ embed: "1" });
}

/* Hash deep-link to pattern card */
if (location.hash.startsWith("#pattern-")) {
  requestAnimationFrame(() => {
    document.querySelector(location.hash)?.scrollIntoView({ block: "start" });
  });
}

/* Theme palette refresh — switch preset variants without restarting */
window.addEventListener("glyptide-theme", () => {
  appearance.syncTheme();
});

appearance.applyInitial();

// Keep createGlyptide referenced for tree / docs demos
void createGlyptide;
void patterns;
