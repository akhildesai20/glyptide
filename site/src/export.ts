import type { ResolvedConfig } from "glyptide";

export const INTEGRATE_SNIPPETS = {
  js: `// From this repository (package not yet on npm):
//   npm install ./packages/glyptide
import { createGlyptide } from "glyptide";
import "glyptide/styles.css";

const text = createGlyptide({
  element: document.querySelector("#out"),
  pattern: "new-word-settle",
  preset: "aurora",
  theme: "system",
  speed: 54,
  config: {
    // Appearance is independent of pattern motion
    appearance: {
      colorMode: "gradient",
      treatment: "ink",
      intensity: 1,
      gradientDirection: 110,
      gradientMotion: "animated",
    },
  },
});

text.start({
  text: "Thoughtful motion makes interfaces feel alive.",
});

// Theme-aware custom palette:
// createGlyptide({ element, palette: { light: {...}, dark: {...} }, theme: "inherit" })

// Or stream from your own source:
// for await (const chunk of stream) text.append(chunk);
// text.finish();`,

  react: `// npm install ./packages/glyptide ./packages/glyptide-react
import { Glyptide } from "@glyptide/react";
import "glyptide/styles.css";

export function Example() {
  return (
    <Glyptide
      pattern="new-word-settle"
      text="Thoughtful motion makes interfaces feel alive."
      appearance={{
        colorMode: "gradient",
        treatment: "ink",
        gradientMotion: "animated",
      }}
      autoPlay
    />
  );
}`,

  download: `Local install (verified):

  npm install ./packages/glyptide
  npm install ./packages/glyptide-react

Built files:
  packages/glyptide/dist/index.js
  packages/glyptide/dist/glyptide.iife.js
  packages/glyptide/dist/styles.css

Use playground Code export for a self-contained HTML example
with the selected preset and both light/dark palette variants.`,
};

/** Standalone HTML that inlines config and loads the local IIFE after build. */
export function buildExportHtml(cfg: ResolvedConfig): string {
  const exportCfg = {
    ...cfg,
    theme: cfg.theme || "system",
  };
  const configJson = JSON.stringify(exportCfg).replace(/</g, "\\u003c");
  const paletteJson = JSON.stringify(cfg.palette).replace(/</g, "\\u003c");
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark";

  return `<!doctype html>
<html lang="en" data-theme="${dark ? "dark" : "light"}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Glyptide — ${cfg.patternName}</title>
<style>
:root{color-scheme:light;--page:#fafafa;--ink:#171717;--muted:#737373;--border:#e5e5e5;--added:#135b32;--tint:#d6efdd;--selection:#dbe8ff;--removed:#a12228;--accent:#17633c}
html[data-theme=dark]{color-scheme:dark;--page:#0a0a0a;--ink:#ededed;--muted:#8a8a8a;--border:#292929;--added:#a9e8ba;--tint:#294c36;--selection:#354c76;--removed:#ffb2b4;--accent:#a9e8ba}
body{margin:0;background:var(--page);color:var(--ink);font:16px/1.55 system-ui,sans-serif}
main{max-width:66ch;margin:48px auto;padding:0 20px}
.document{font-size:18px;line-height:1.76;white-space:pre-wrap;overflow-wrap:anywhere;position:relative}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
button{font:inherit;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;cursor:pointer}
html[data-theme=dark] button{background:#111;color:var(--ink)}
#status{font-size:12px;color:var(--muted);margin-bottom:12px}
.waiting{color:var(--muted);font-size:12px;min-height:22px;margin-top:12px}
pre.palette{font:11px/1.45 ui-monospace,monospace;background:var(--page);border:1px solid var(--border);padding:10px;border-radius:8px;overflow:auto}
</style>
<link rel="stylesheet" href="./styles.css">
<body>
<main>
  <p id="status" role="status">Ready</p>
  <div class="document glyptide-document" id="out"></div>
  <div class="waiting glyptide-waiting" id="wait"></div>
  <div class="toolbar">
    <button type="button" id="go">Generate</button>
    <button type="button" id="pause">Pause</button>
    <button type="button" id="stop">Stop</button>
    <button type="button" id="accept" hidden>Accept</button>
    <button type="button" id="discard" hidden>Discard</button>
  </div>
  <p style="margin-top:24px;font-size:12px;color:var(--muted)">
    Place beside <code>glyptide.iife.js</code> and <code>styles.css</code> from <code>packages/glyptide/dist</code>.
    Preset: <strong>${cfg.preset || "custom"}</strong>. Semantic revision colors stay independent of the aesthetic palette.
  </p>
  <pre class="palette">// Theme-aware palette exported from playground
const palette = ${paletteJson};</pre>
</main>
<script src="./glyptide.iife.js"></script>
<script>
(function () {
  var cfg = ${configJson};
  if (!window.Glyptide) {
    document.getElementById("status").textContent = "Load glyptide.iife.js beside this file.";
    return;
  }
  var g = Glyptide.createGlyptide({
    element: document.getElementById("out"),
    waiting: document.getElementById("wait"),
    preset: cfg.preset,
    palette: cfg.palette,
    theme: cfg.theme || "system",
    onStatus: function (s) { document.getElementById("status").textContent = s; },
    onChange: function (s) {
      document.getElementById("accept").hidden = s !== "Review";
      document.getElementById("discard").hidden = s !== "Review";
      var active = ["Waiting","Generating","Waiting for text","Paused"].indexOf(s) >= 0;
      document.getElementById("pause").disabled = !active;
      document.getElementById("stop").disabled = !active && s !== "Interrupted";
      document.getElementById("go").textContent = s === "Interrupted" ? "Resume stream" : "Generate";
      document.getElementById("pause").textContent = s === "Paused" ? "Resume" : "Pause";
    },
    config: {
      caseId: cfg.caseId,
      patternName: cfg.patternName,
      kind: cfg.kind,
      effect: cfg.effect,
      source: cfg.source,
      text: cfg.text,
      speed: cfg.speed,
      latency: cfg.latency,
      scenario: cfg.scenario,
      reduce: cfg.reduce,
      appearance: cfg.appearance || null,
      persistGradient: cfg.persistGradient
    }
  });
  document.getElementById("go").onclick = function () {
    g.state === "Interrupted" ? g.resume() : g.start(cfg);
  };
  document.getElementById("pause").onclick = function () {
    g.state === "Paused" ? g.resume() : g.pause();
  };
  document.getElementById("stop").onclick = function () { g.stop(); };
  document.getElementById("accept").onclick = function () { g.accept(); };
  document.getElementById("discard").onclick = function () { g.reject(); };
})();
</script>
</body>
</html>`;
}
