import {
  PALETTE_PRESETS,
  makeEngine,
  type ResolvedConfig,
} from "glyptide";

interface HeroBeat {
  text: string;
}

const BEATS: HeroBeat[] = [
  { text: "Give words a natural rhythm." },
  { text: "Make waiting feel meaningful." },
  { text: "Let ideas take shape." },
  { text: "Bring generated text to life." },
  { text: "Make every word feel intentional." },
  { text: "Give AI a better way to write." },
  { text: "Make change feel natural." },
];

const HOLD_MS = 6000;

function prefersReduced(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pickPresetId(previous: string | null): string {
  const ids = PALETTE_PRESETS.map((p) => p.id);
  if (ids.length <= 1) return ids[0] || "aurora";
  let next = ids[Math.floor(Math.random() * ids.length)];
  if (previous && ids.length > 1) {
    let guard = 0;
    while (next === previous && guard < 8) {
      next = ids[Math.floor(Math.random() * ids.length)];
      guard++;
    }
  }
  return next;
}

/**
 * Hero rotator using the production Glyptide engine.
 * Every sentence uses Gradient ink with a random curated palette,
 * and keeps the gradient visible through the readable hold period.
 */
export function initHero(
  sentenceEl: HTMLElement,
  pauseBtn: HTMLButtonElement,
): void {
  sentenceEl.classList.add("glyptide-document", "hero-sentence");

  const wait = document.createElement("div");
  wait.className = "waiting glyptide-waiting";
  wait.hidden = true;
  sentenceEl.after(wait);

  const engine = makeEngine({
    out: sentenceEl,
    wait,
    announce: () => {
      /* Decorative — static copy is already in .sr-only */
    },
  });

  let index = 0;
  let paused = false;
  let holdTimer = 0;
  let visible = true;
  let tabActive = true;
  let lastPreset: string | null = null;
  let activePreset: string | null = null;

  function configFor(beat: HeroBeat): ResolvedConfig {
    const preset = pickPresetId(lastPreset);
    lastPreset = preset;
    activePreset = preset;
    sentenceEl.dataset.preset = preset;
    return {
      caseId: "new",
      patternId: "new-gradient-ink",
      patternName: "Gradient ink",
      kind: "phrase",
      effect: prefersReduced() ? "none" : "gradientInk",
      source: "",
      text: beat.text,
      speed: 42,
      latency: 220,
      waitingThresholdMs: 180,
      stallMs: 2500,
      catchUp: "catchUp",
      scenario: "steady",
      reduce: prefersReduced(),
      motion: null,
      colors: null,
      preset,
      palette: null,
      theme: "inherit",
      persistGradient: !prefersReduced(),
      appearance: {
        colorMode: prefersReduced() ? "default" : "gradient",
        treatment: "ink",
        intensity: 1,
        gradientDirection: 110,
        gradientMotion: "animated",
      },
    };
  }

  function clearHold(): void {
    clearTimeout(holdTimer);
  }

  function scheduleNext(): void {
    clearHold();
    holdTimer = window.setTimeout(() => {
      index = (index + 1) % BEATS.length;
      play();
    }, HOLD_MS);
  }

  function play(): void {
    clearHold();
    if (paused || !visible || !tabActive) return;
    const beat = BEATS[index];
    engine.start(configFor(beat));
    const check = window.setInterval(() => {
      if (engine.state === "Complete" || engine.state === "Stopped") {
        clearInterval(check);
        if (!paused && visible && tabActive) scheduleNext();
      }
    }, 120);
  }

  pauseBtn.onclick = () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Play" : "Pause";
    if (paused) {
      clearHold();
      if (["Waiting", "Generating"].includes(engine.state)) engine.pause();
    } else {
      if (engine.state === "Paused") engine.resume();
      else if (engine.state === "Complete" || engine.state === "Ready") play();
      else scheduleNext();
    }
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        clearHold();
        if (["Waiting", "Generating", "Paused"].includes(engine.state)) {
          engine.stop();
        }
      } else if (!paused && tabActive) {
        play();
      }
    },
    { threshold: 0.35 },
  );
  io.observe(sentenceEl.closest(".hero") || sentenceEl);

  document.addEventListener("visibilitychange", () => {
    tabActive = document.visibilityState === "visible";
    if (!tabActive) {
      clearHold();
      if (["Waiting", "Generating"].includes(engine.state)) engine.pause();
    } else if (!paused && visible) {
      if (engine.state === "Paused") engine.resume();
      else if (engine.state === "Complete" || engine.state === "Ready") play();
    }
  });

  window.addEventListener("glyptide-theme", () => {
    if (activePreset) {
      engine.updateAppearance({
        preset: activePreset,
        palette: null,
        theme: "inherit",
        colors: null,
      });
    } else {
      engine.palette();
    }
  });

  sentenceEl.style.minHeight = "1.15em";
  play();
}
