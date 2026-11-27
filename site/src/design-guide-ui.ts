/**
 * Interactive Design & Motion Guidance — visual companion to /docs/design.md.
 * Preserves every guideline; demos use the real Glyptide runtime where possible.
 */
import { createGlyptide, type GlyptideInstance } from "glyptide";
import { createIcon, type IconName } from "./icons";
import { setIconLabel } from "./icons/controls";

interface DemoHandle {
  play: () => void;
  destroy: () => void;
  root: HTMLElement;
}

const SAMPLE =
  "Motion should help people follow change, not decorate every glyph.";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function sectionHead(title: string, lead?: string): HTMLElement {
  const head = el("header", "dg-section-head");
  const h = el("h3", "dg-section-title");
  h.textContent = title;
  head.append(h);
  if (lead) {
    const p = el("p", "dg-section-lead");
    p.textContent = lead;
    head.append(p);
  }
  return head;
}

function replayBtn(onPlay: () => void): HTMLButtonElement {
  const btn = el("button", "btn btn-ghost btn-sm") as HTMLButtonElement;
  btn.type = "button";
  setIconLabel(btn, "replay", "Replay");
  btn.addEventListener("click", () => onPlay());
  return btn;
}

function stageShell(label: string): {
  wrap: HTMLElement;
  out: HTMLElement;
  wait: HTMLElement;
  bar: HTMLElement;
} {
  const wrap = el("div", "dg-stage");
  const bar = el("div", "dg-stage-bar");
  const name = el("span", "dg-stage-label");
  name.textContent = label;
  bar.append(name);
  const out = el("div", "glyptide-document dg-stage-out");
  const wait = el("div", "glyptide-waiting dg-stage-wait");
  wait.hidden = true;
  wrap.append(bar, out, wait);
  return { wrap, out, wait, bar };
}

/** Jade matches the site’s green accent — readable against light and dark hosts. */
const DEMO_PRESET = "jade";

const ACCENT_GRADIENT = {
  colorMode: "gradient" as const,
  treatment: "ink" as const,
  intensity: 1,
  gradientDirection: 110,
  gradientMotion: "animated" as const,
};

function mountGlyptideDemo(
  out: HTMLElement,
  wait: HTMLElement,
  opts: {
    pattern: string;
    text?: string;
    source?: string;
    reduce?: boolean;
    /** When true, keep the pattern’s own sample/source instead of SAMPLE. */
    usePatternDefaults?: boolean;
    appearance?: Record<string, unknown>;
    preset?: string;
    /** Forced host theme for isolated light/dark demos. Defaults to inherit. */
    theme?: "light" | "dark" | "inherit";
    speed?: number;
    latency?: number;
    onReview?: (g: GlyptideInstance) => void;
    onSettled?: (g: GlyptideInstance) => void;
  },
): DemoHandle {
  let g: GlyptideInstance | null = null;
  const play = () => {
    try {
      g?.destroy();
    } catch {
      /* ignore */
    }
    const config: Record<string, unknown> = {
      appearance: (opts.appearance ?? undefined) as never,
    };
    if (!opts.usePatternDefaults) {
      if (opts.source != null) config.source = opts.source;
      config.text = opts.text ?? SAMPLE;
    } else {
      if (opts.source != null) config.source = opts.source;
      if (opts.text != null) config.text = opts.text;
    }
    g = createGlyptide({
      element: out,
      waiting: wait,
      pattern: opts.pattern,
      reduce: opts.reduce ?? false,
      speed: opts.speed ?? 70,
      latency: opts.latency ?? 200,
      preset: opts.preset ?? DEMO_PRESET,
      theme: opts.theme ?? "inherit",
      config: config as never,
    });
    if (opts.onReview) {
      g.on("review", () => opts.onReview?.(g!));
    }
    if (opts.onSettled) {
      const done = () => opts.onSettled?.(g!);
      g.on("settled", done);
      g.on("complete", done);
    }
    if (opts.usePatternDefaults && opts.source == null && opts.text == null) {
      g.start();
    } else {
      g.start(
        opts.source != null
          ? { source: opts.source, text: opts.text }
          : { text: opts.text ?? SAMPLE },
      );
    }
  };
  return {
    play,
    destroy: () => {
      try {
        g?.destroy();
      } catch {
        /* ignore */
      }
      g = null;
    },
    root: out,
  };
}

/**
 * Side-by-side / stacked demos: all in-view demos play and stay.
 * Replay refreshes only that demo — siblings are not cleared.
 */
function bindParallelPlayback(demos: DemoHandle[]): () => void {
  const observers: IntersectionObserver[] = [];
  const live = new Set<DemoHandle>();

  const start = (demo: DemoHandle) => {
    demo.play();
    live.add(demo);
  };

  const stop = (demo: DemoHandle) => {
    if (!live.has(demo)) return;
    demo.destroy();
    live.delete(demo);
  };

  for (const demo of demos) {
    const host = demo.root.closest(".dg-demo") ?? demo.root;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!live.has(demo)) start(demo);
          } else {
            stop(demo);
          }
        }
      },
      { threshold: 0.2, rootMargin: "40px 0px" },
    );
    obs.observe(host);
    observers.push(obs);

    const btn = host.querySelector<HTMLButtonElement>("[data-dg-replay]");
    btn?.addEventListener("click", () => start(demo));
  }

  return () => {
    observers.forEach((o) => o.disconnect());
    demos.forEach((d) => {
      try {
        d.destroy();
      } catch {
        /* ignore */
      }
    });
    live.clear();
  };
}

function buildPrinciples(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(
    sectionHead(
      "Principles",
      "Motion should help people follow change — not decorate every glyph.",
    ),
  );

  const principles: { icon: IconName; title: string; body: string }[] = [
    {
      icon: "docs",
      title: "Reading first",
      body: "Motion should help people follow change, not decorate every glyph.",
    },
    {
      icon: "speed",
      title: "Restraint",
      body: "Prefer opacity and subtle emphasis for ordinary prose; reserve spatial springs for meaningful arrivals.",
    },
    {
      icon: "recipes",
      title: "Stability",
      body: "Existing text should not reanimate, jump lines, or flicker when new content arrives.",
    },
    {
      icon: "success",
      title: "Honesty",
      body: "Temporary generation paint must not pretend to be permanent document styling.",
    },
    {
      icon: "monitor",
      title: "Host respect",
      body: "Finished text inherits the application’s foreground, typography, and theme.",
    },
  ];

  const grid = el("div", "dg-principle-grid");
  for (const p of principles) {
    const tile = el("div", "dg-principle");
    const iconWrap = el("div", "dg-principle-icon");
    iconWrap.setAttribute("aria-hidden", "true");
    iconWrap.append(createIcon(p.icon, { size: "lg", strokeWidth: 1.5 }));
    const title = el("h4", "dg-principle-title");
    title.textContent = p.title;
    const body = el("p", "dg-principle-body");
    body.textContent = p.body;
    tile.append(iconWrap, title, body);
    grid.append(tile);
  }
  section.append(grid);
  return section;
}

function buildFourConcerns(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(sectionHead("Four concerns"));

  const concerns: {
    id: string;
    title: string;
    meaning: string;
    example: string;
  }[] = [
    {
      id: "pattern",
      title: "Pattern",
      meaning: "What generation does (insert, rewrite, stream list…)",
      example: "insert-marked-insertion",
    },
    {
      id: "motion",
      title: "Motion",
      meaning: "Timing, buffering, easing, stream scenario",
      example: "word buffer, speed 54",
    },
    {
      id: "appearance",
      title: "Appearance",
      meaning: "Temporary paint (solid / gradient / highlight…)",
      example: 'colorMode: "gradient"',
    },
    {
      id: "lifecycle",
      title: "Lifecycle",
      meaning: "When paint clears",
      example: "transient → inherited styles",
    },
  ];

  const tabs = el("div", "dg-concern-tabs");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Design concerns");
  const panel = el("div", "dg-concern-panel");
  panel.setAttribute("role", "tabpanel");

  const demoHost = el("div", "dg-demo dg-concern-demo");
  const stage = stageShell("Preview");
  const status = el("span", "dg-stage-status");
  status.setAttribute("aria-live", "polite");
  const replay = replayBtn(() => undefined);
  replay.dataset.dgReplay = "1";
  stage.bar.append(status, replay);
  demoHost.append(stage.wrap);

  let demo: DemoHandle | null = null;

  const setStatus = (text: string) => {
    status.textContent = text;
  };

  const playConcern = (id: string) => {
    demo?.destroy();
    setStatus("");
    if (id === "pattern") {
      // Canonical insert: surrounding prose stays host-colored; insert paints jade.
      demo = mountGlyptideDemo(stage.out, stage.wait, {
        pattern: "insert-marked-insertion",
        usePatternDefaults: true,
        preset: DEMO_PRESET,
        appearance: ACCENT_GRADIENT,
        speed: 72,
        latency: 220,
        onSettled: () => setStatus("Inserted · surrounding text unchanged"),
      });
      setStatus("Inserting · jade accent on new phrase");
    } else if (id === "motion") {
      demo = mountGlyptideDemo(stage.out, stage.wait, {
        pattern: "new-word-settle",
        text: SAMPLE,
        preset: DEMO_PRESET,
        appearance: ACCENT_GRADIENT,
        speed: 54,
        latency: 280,
        onSettled: () => setStatus("Paced word delivery · speed 54"),
      });
    } else if (id === "appearance") {
      demo = mountGlyptideDemo(stage.out, stage.wait, {
        pattern: "new-word-settle",
        text: SAMPLE,
        preset: DEMO_PRESET,
        appearance: ACCENT_GRADIENT,
        speed: 64,
        latency: 180,
        onSettled: () =>
          setStatus("Gradient was temporary · now host foreground"),
      });
      setStatus("Generating · jade gradient paint");
    } else {
      // Lifecycle: vivid jade gradient during generation, then clear to inherited.
      demo = mountGlyptideDemo(stage.out, stage.wait, {
        pattern: "new-progressive-emphasis",
        text: "Incoming phrase briefly emphasized, then settles while later phrases continue.",
        preset: DEMO_PRESET,
        appearance: ACCENT_GRADIENT,
        speed: 48,
        latency: 200,
        onSettled: () =>
          setStatus("Settled · transient paint cleared to inherited styles"),
      });
      setStatus("Generating · temporary accent paint");
    }
    demo.play();
  };

  concerns.forEach((c, i) => {
    const btn = el("button", "dg-concern-tab") as HTMLButtonElement;
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(i === 0));
    btn.dataset.concern = c.id;
    btn.innerHTML = `<strong>${c.title}</strong><span>${c.meaning}</span>`;
    btn.addEventListener("click", () => {
      tabs.querySelectorAll("[role=tab]").forEach((t) =>
        t.setAttribute("aria-selected", String(t === btn)),
      );
      panel.innerHTML = `<p class="dg-concern-meaning">${c.meaning}</p><p class="dg-muted">Example: <code>${c.example}</code></p>`;
      stage.bar.querySelector(".dg-stage-label")!.textContent = c.title;
      playConcern(c.id);
    });
    tabs.append(btn);
  });

  panel.innerHTML = `<p class="dg-concern-meaning">${concerns[0].meaning}</p><p class="dg-muted">Example: <code>${concerns[0].example}</code></p>`;
  replay.onclick = () => {
    const active =
      tabs.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset
        .concern ?? "pattern";
    playConcern(active);
  };

  const note = el("p", "dg-callout");
  note.innerHTML =
    "<strong>Appearance customization must not change a pattern’s intended final state.</strong> A gradient on <code>new-word-settle</code> may travel during generation; after completion, text returns to the host color.";

  const tableWrap = el("div", "dg-table-wrap");
  tableWrap.innerHTML = `
    <table class="docs-table dg-table">
      <thead><tr><th>Concern</th><th>Meaning</th><th>Example</th></tr></thead>
      <tbody>
        ${concerns
          .map(
            (c) =>
              `<tr><td><strong>${c.title}</strong></td><td>${c.meaning}</td><td><code>${c.example}</code></td></tr>`,
          )
          .join("")}
      </tbody>
    </table>`;

  const viz = el("div", "dg-concern-viz");
  viz.append(tabs, panel, demoHost);

  section.append(viz, note, tableWrap);

  // Lazy first play when section enters view
  const obs = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        playConcern("pattern");
        obs.disconnect();
      }
    },
    { threshold: 0.2 },
  );
  obs.observe(section);

  (section as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    demo?.destroy();
    obs.disconnect();
  };

  return section;
}

function buildGoodVsUndesirable(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(sectionHead("Good vs undesirable"));

  const pairs: {
    title: string;
    goodLabel: string;
    badLabel: string;
    goodNote: string;
    badNote: string;
    mountGood: (host: HTMLElement) => DemoHandle;
    mountBad: (host: HTMLElement) => { play: () => void; destroy: () => void };
  }[] = [
    {
      title: "Appearance settlement",
      goodLabel: "Good",
      badLabel: "Undesirable",
      goodNote:
        "Incoming phrase briefly emphasized, then settles while later phrases continue.",
      badNote:
        "Gradient text left transparent / background-clip after completion.",
      mountGood: (host) => {
        const stage = stageShell("Good");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "new-progressive-emphasis",
          text: "Incoming phrase briefly emphasized, then settles while later phrases continue.",
          preset: DEMO_PRESET,
          appearance: ACCENT_GRADIENT,
        });
      },
      mountBad: (host) => {
        const stage = stageShell("Undesirable fixture");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        const out = stage.out;
        host.append(stage.wrap);
        return {
          play: () => {
            out.className =
              "glyptide-document dg-stage-out dg-bad-stuck-gradient";
            out.textContent =
              "This text pretends generation paint is permanent.";
          },
          destroy: () => {
            out.className = "glyptide-document dg-stage-out";
            out.textContent = "";
          },
        };
      },
    },
    {
      title: "Ghost review",
      goodLabel: "Good",
      badLabel: "Undesirable",
      goodNote: "Ghost suggestion stays muted until Accept.",
      badNote: "Auto-dismissing review chrome on a timer.",
      mountGood: (host) => {
        const stage = stageShell("Good");
        const actions = el("div", "dg-review-actions");
        const accept = el("button", "btn btn-secondary btn-sm") as HTMLButtonElement;
        const reject = el("button", "btn btn-ghost btn-sm") as HTMLButtonElement;
        accept.type = "button";
        reject.type = "button";
        setIconLabel(accept, "accept", "Accept");
        setIconLabel(reject, "reject", "Discard");
        accept.hidden = true;
        reject.hidden = true;
        actions.append(accept, reject);
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(actions, btn);
        host.append(stage.wrap);
        let instance: GlyptideInstance | null = null;
        const handle = mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "continue-ghost-suggestion",
          source:
            "The next version should give customers a clearer overview of commitments.",
          text: " Upcoming repayments could be grouped by due date.",
          onReview: (g) => {
            instance = g;
            accept.hidden = false;
            reject.hidden = false;
          },
        });
        accept.onclick = () => {
          instance?.accept();
          accept.hidden = true;
          reject.hidden = true;
        };
        reject.onclick = () => {
          instance?.reject();
          accept.hidden = true;
          reject.hidden = true;
        };
        return handle;
      },
      mountBad: (host) => {
        const stage = stageShell("Undesirable fixture");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        let timer = 0;
        return {
          play: () => {
            window.clearTimeout(timer);
            stage.out.innerHTML =
              'Prefix text <span class="dg-bad-ghost">timed ghost that will vanish…</span>';
            timer = window.setTimeout(() => {
              stage.out.textContent = "Prefix text";
            }, 1800);
          },
          destroy: () => {
            window.clearTimeout(timer);
            stage.out.textContent = "";
          },
        };
      },
    },
    {
      title: "Text stability",
      goodLabel: "Good",
      badLabel: "Undesirable",
      goodNote: "Existing text stays stable as new content arrives.",
      badNote: "Re-playing the whole paragraph to “fix” styles.",
      mountGood: (host) => {
        const stage = stageShell("Good");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "new-word-settle",
          text: "Existing words remain stable while new words arrive at a readable pace.",
        });
      },
      mountBad: (host) => {
        const stage = stageShell("Undesirable fixture");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        let timer = 0;
        let frame = 0;
        return {
          play: () => {
            window.clearInterval(timer);
            const full =
              "Replaying the whole paragraph on every chunk is undesirable.";
            frame = 0;
            timer = window.setInterval(() => {
              frame = (frame + 1) % 8;
              stage.out.className =
                "glyptide-document dg-stage-out dg-bad-flicker";
              stage.out.style.opacity = String(0.45 + (frame % 2) * 0.55);
              stage.out.textContent = full;
            }, 120);
            window.setTimeout(() => {
              window.clearInterval(timer);
              stage.out.style.opacity = "1";
              stage.out.className = "glyptide-document dg-stage-out";
            }, 1600);
          },
          destroy: () => {
            window.clearInterval(timer);
            stage.out.style.opacity = "1";
            stage.out.textContent = "";
          },
        };
      },
    },
    {
      title: "Reduced motion",
      goodLabel: "Good",
      badLabel: "Undesirable",
      goodNote:
        "Reduced motion skips travel animations but keeps content correct.",
      badNote: "Hardcoding #000 / #fff when clearing paint.",
      mountGood: (host) => {
        const stage = stageShell("Good · reduce");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "new-word-settle",
          text: SAMPLE,
          reduce: true,
          preset: DEMO_PRESET,
          appearance: ACCENT_GRADIENT,
        });
      },
      mountBad: (host) => {
        const stage = stageShell("Undesirable fixture");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return {
          play: () => {
            stage.out.className =
              "glyptide-document dg-stage-out dg-bad-hardcoded";
            stage.out.textContent =
              "Cleared paint forced to #000 / #fff instead of inherited host styles.";
          },
          destroy: () => {
            stage.out.className = "glyptide-document dg-stage-out";
            stage.out.textContent = "";
          },
        };
      },
    },
  ];

  const demos: DemoHandle[] = [];
  for (const pair of pairs) {
    const block = el("div", "dg-compare");
    const title = el("h4", "dg-compare-title");
    title.textContent = pair.title;
    const grid = el("div", "dg-compare-grid");

    const goodCol = el("div", "dg-compare-col dg-compare-good");
    const goodHead = el("p", "dg-compare-label dg-compare-label--good");
    goodHead.textContent = pair.goodLabel;
    const goodNote = el("p", "dg-compare-note");
    goodNote.textContent = pair.goodNote;
    const goodHost = el("div", "dg-demo");
    goodCol.append(goodHead, goodNote, goodHost);

    const badCol = el("div", "dg-compare-col dg-compare-bad");
    const badHead = el("p", "dg-compare-label dg-compare-label--bad");
    badHead.textContent = pair.badLabel;
    const badNote = el("p", "dg-compare-note");
    badNote.textContent = pair.badNote;
    const badHost = el("div", "dg-demo");
    badCol.append(badHead, badNote, badHost);

    grid.append(goodCol, badCol);
    block.append(title, grid);
    section.append(block);

    const good = pair.mountGood(goodHost);
    const bad = pair.mountBad(badHost);
    demos.push(good);
    demos.push({
      play: bad.play,
      destroy: bad.destroy,
      root: badHost,
    });
  }

  const warnings = el("div", "dg-warnings");
  warnings.innerHTML = `
    <h4>Additional guidance</h4>
    <ul class="doc-list">
      <li>Code lines keep syntax colors; glow treatments are unavailable.</li>
      <li>Embedding model API keys in the browser to “make Glyptide work” is undesirable.</li>
    </ul>`;
  section.append(warnings);

  const cleanup = bindParallelPlayback(demos);
  (section as HTMLElement & { __cleanup?: () => void }).__cleanup = cleanup;
  return section;
}

function buildStreamingCadence(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(
    sectionHead(
      "Streaming cadence",
      "Prefer complete words/phrases for prose; tokens are fine for chat-like edges.",
    ),
  );

  const guide = el("ul", "doc-list dg-list");
  guide.innerHTML = `
    <li>Prefer complete words/phrases for prose; tokens are fine for chat-like edges.</li>
    <li>Buffer (<code>kind: "all"</code>) when partial code or tables would be misleading.</li>
    <li>Support irregular chunk boundaries; never assume chunks align to words.</li>`;
  section.append(guide);

  const chunkViz = el("div", "dg-chunk-viz");
  const chunkLabel = el("p", "dg-muted");
  chunkLabel.textContent = "Irregular transport chunks (not reveal units):";
  const chunkRow = el("div", "dg-chunks");
  const chunks = ["Mot", "ion sh", "ould help ", "people ", "follow change."];
  for (const c of chunks) {
    const pill = el("span", "dg-chunk");
    pill.textContent = JSON.stringify(c);
    chunkRow.append(pill);
  }
  chunkViz.append(chunkLabel, chunkRow);

  const units: { id: string; label: string; pattern: string; kind: string }[] = [
    { id: "token", label: "Token", pattern: "new-token-stream", kind: "token" },
    { id: "word", label: "Word", pattern: "new-word-settle", kind: "word" },
    { id: "phrase", label: "Phrase", pattern: "new-phrase-fade", kind: "phrase" },
    {
      id: "sentence",
      label: "Sentence",
      pattern: "new-sentence-reveal",
      kind: "sentence",
    },
    {
      id: "atomic",
      label: "Atomic",
      pattern: "new-instant-answer",
      kind: "all",
    },
  ];

  const unitTabs = el("div", "dg-unit-tabs");
  unitTabs.setAttribute("role", "tablist");
  unitTabs.setAttribute("aria-label", "Delivery units");
  const demoHost = el("div", "dg-demo");
  const stage = stageShell("Word delivery");
  const replay = replayBtn(() => undefined);
  replay.dataset.dgReplay = "1";
  stage.bar.append(replay);
  demoHost.append(stage.wrap);

  let demo: DemoHandle | null = null;
  let current = units[1];

  const playUnit = (u: (typeof units)[0]) => {
    current = u;
    stage.bar.querySelector(".dg-stage-label")!.textContent =
      `${u.label} · kind: ${u.kind}`;
    demo?.destroy();
    demo = mountGlyptideDemo(stage.out, stage.wait, {
      pattern: u.pattern,
      text:
        u.id === "atomic"
          ? "A short buffered answer appears complete."
          : SAMPLE,
      speed: u.id === "token" ? 100 : 70,
      latency: 120,
    });
    demo.play();
  };

  for (const u of units) {
    const btn = el("button", "dg-unit-tab") as HTMLButtonElement;
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", String(u.id === "word"));
    btn.textContent = u.label;
    btn.addEventListener("click", () => {
      unitTabs
        .querySelectorAll("[role=tab]")
        .forEach((t) => t.setAttribute("aria-selected", String(t === btn)));
      playUnit(u);
    });
    unitTabs.append(btn);
  }
  replay.onclick = () => playUnit(current);

  section.append(chunkViz, unitTabs, demoHost);

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        playUnit(units[1]);
        obs.disconnect();
      }
    },
    { threshold: 0.25 },
  );
  obs.observe(section);
  (section as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    demo?.destroy();
    obs.disconnect();
  };

  return section;
}

function buildLayoutStructure(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(sectionHead("Layout & structure"));

  const rows: {
    title: string;
    body: string;
    mount: (host: HTMLElement) => DemoHandle;
  }[] = [
    {
      title: "Inline insertion",
      body: "Inline insertion should minimize surrounding reflow (reserved gap / placeholders when needed).",
      mount: (host) => {
        const stage = stageShell("Insert");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "insert-reserved-gap",
          usePatternDefaults: true,
          preset: DEMO_PRESET,
        });
      },
    },
    {
      title: "Structured output",
      body: "Structured output should preserve lists, code whitespace, tables, outlines — do not flatten to plain text just to animate.",
      mount: (host) => {
        const stage = stageShell("List");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "structured-list-item-arrival",
          text: "1. Review the journey\n2. Prioritize common issues\n3. Test with customers",
          preset: DEMO_PRESET,
          speed: 60,
        });
      },
    },
    {
      title: "Multi-line highlights",
      body: "Multi-line highlights use `box-decoration-break: clone` so wraps stay continuous.",
      mount: (host) => {
        const stage = stageShell("Highlight");
        const btn = replayBtn(() => undefined);
        btn.dataset.dgReplay = "1";
        stage.bar.append(btn);
        host.append(stage.wrap);
        return mountGlyptideDemo(stage.out, stage.wait, {
          pattern: "new-progressive-emphasis",
          text: "Multi-line highlights should wrap continuously across line breaks without broken boxes or clipped corners on each fragment.",
          preset: DEMO_PRESET,
          appearance: {
            colorMode: "solid",
            treatment: "highlight",
            intensity: 1,
          },
        });
      },
    },
  ];

  const demos: DemoHandle[] = [];
  for (const row of rows) {
    const block = el("div", "dg-layout-row");
    const copy = el("div", "dg-layout-copy");
    const h = el("h4");
    h.textContent = row.title;
    const p = el("p");
    p.textContent = row.body.replace(/`([^`]+)`/g, "$1");
    // Keep code formatting for box-decoration-break
    if (row.body.includes("`")) {
      p.innerHTML = row.body.replace(
        /`([^`]+)`/g,
        "<code>$1</code>",
      );
    }
    copy.append(h, p);
    const host = el("div", "dg-demo dg-layout-demo");
    block.append(copy, host);
    section.append(block);
    demos.push(row.mount(host));
  }

  const cleanup = bindParallelPlayback(demos);
  (section as HTMLElement & { __cleanup?: () => void }).__cleanup = cleanup;
  return section;
}

function buildGradientsThemes(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(
    sectionHead(
      "Gradients & themes",
      "Gradients communicate activity, then settle or clear per lifecycle.",
    ),
  );

  const list = el("ul", "doc-list dg-list");
  list.innerHTML = `
    <li>Gradients communicate <em>activity</em>, then settle or clear per lifecycle.</li>
    <li>Light and dark presets are independent; <code>theme: "inherit"</code> follows the host, not necessarily the OS.</li>
    <li>Semantic add/remove colors stay accessible and separate from aesthetic palettes.</li>`;
  section.append(list);

  const grid = el("div", "dg-theme-grid");
  const demos: DemoHandle[] = [];

  for (const mode of ["light", "dark"] as const) {
    const col = el("div", `dg-theme-col dg-theme-col--${mode}`);
    const label = el("p", "dg-compare-label");
    label.textContent = mode === "light" ? "Light host" : "Dark host";
    const host = el("div", "dg-demo");
    const stage = stageShell(`${mode} · temporary paint`);
    const btn = replayBtn(() => undefined);
    btn.dataset.dgReplay = "1";
    stage.bar.append(btn);
    // Forced host surface + matching Glyptide theme (independent of page theme).
    stage.wrap.dataset.theme = mode;
    host.append(stage.wrap);
    col.append(label, host);
    grid.append(col);

    demos.push(
      mountGlyptideDemo(stage.out, stage.wait, {
        pattern: "new-gradient-ink",
        text: "Temporary gradient paint clears to the inherited host foreground.",
        preset: DEMO_PRESET,
        theme: mode,
        appearance: ACCENT_GRADIENT,
        speed: 64,
      }),
    );
  }

  section.append(grid);
  const cleanup = bindParallelPlayback(demos);
  (section as HTMLElement & { __cleanup?: () => void }).__cleanup = cleanup;
  return section;
}

function buildAccessibility(): HTMLElement {
  const section = el("section", "dg-section");
  section.append(sectionHead("Accessibility"));

  const list = el("ul", "doc-list dg-list");
  list.innerHTML = `
    <li>Honor <code>prefers-reduced-motion</code>.</li>
    <li>Announce completion and review readiness, not every token.</li>
    <li>Keyboard paths for Accept / Discard.</li>`;
  section.append(list);

  const demoBlock = el("div", "dg-a11y-demo");
  const controls = el("div", "dg-a11y-controls");
  const toggle = el("label", "check dg-a11y-toggle");
  toggle.innerHTML =
    '<input type="checkbox" id="dgReduceToggle" checked /> Reduced motion';
  const btn = replayBtn(() => undefined);
  btn.dataset.dgReplay = "1";
  controls.append(toggle, btn);

  const stage = stageShell("Reduced motion");
  stage.bar.append();
  const host = el("div", "dg-demo");
  host.append(stage.wrap);
  demoBlock.append(controls, host);

  const input = toggle.querySelector("input") as HTMLInputElement;
  let demo: DemoHandle | null = null;
  const play = () => {
    demo?.destroy();
    demo = mountGlyptideDemo(stage.out, stage.wait, {
      pattern: "new-word-settle",
      text: SAMPLE,
      reduce: input.checked,
      preset: DEMO_PRESET,
      appearance: ACCENT_GRADIENT,
    });
    stage.bar.querySelector(".dg-stage-label")!.textContent = input.checked
      ? "Reduced motion"
      : "Full motion";
    demo.play();
  };
  btn.onclick = play;
  input.addEventListener("change", play);

  section.append(demoBlock);

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        play();
        obs.disconnect();
      }
    },
    { threshold: 0.3 },
  );
  obs.observe(section);
  (section as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    demo?.destroy();
    obs.disconnect();
  };

  return section;
}

export function mountDesignGuide(root: HTMLElement): () => void {
  root.classList.add("design-guide");
  root.replaceChildren();

  const intro = el("header", "dg-intro");
  intro.innerHTML = `
    <h2 class="dg-title">Glyptide design &amp; motion guidance</h2>
    <p class="dg-lead">
      This document explains <em>why</em> patterns behave the way they do. It is Glyptide’s UX guidance for humans and agents — not a formal industry standard.
      Canonical source: <a href="/docs/design.md">design.md</a>.
    </p>`;

  const sections = [
    buildPrinciples(),
    buildFourConcerns(),
    buildGoodVsUndesirable(),
    buildStreamingCadence(),
    buildLayoutStructure(),
    buildGradientsThemes(),
    buildAccessibility(),
  ];

  root.append(intro, ...sections);

  return () => {
    for (const s of sections) {
      (s as HTMLElement & { __cleanup?: () => void }).__cleanup?.();
    }
  };
}
