import { resolveVisualTreatment } from "./appearance";
import {
  appearanceLifecycleFor,
  clearTransientAppearance,
  settlePieceAppearance,
} from "./lifecycle";
import { applyPalette, resolveGenerationColors } from "./palette";
import { springFrames } from "./spring";
import { splitText } from "./split";
import type {
  EngineCallbacks,
  EngineState,
  ResolvedConfig,
} from "./types";

interface ParsedRange {
  before: string;
  old: string;
  after: string;
  valid: boolean;
}

export interface InternalEngine {
  start: (config: ResolvedConfig) => void;
  reset: (config: ResolvedConfig) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  accept: () => void;
  reject: () => void;
  palette: () => void;
  /** Update appearance fields and re-apply CSS vars without restarting generation */
  updateAppearance: (
    patch: Partial<
      Pick<
        ResolvedConfig,
        "colors" | "preset" | "palette" | "theme" | "appearance" | "persistGradient"
      >
    >,
  ) => void;
  /** Real-stream append (bypasses simulated scheduler) */
  append: (chunk: string) => void;
  finish: () => void;
  destroy: () => void;
  readonly state: EngineState;
  readonly rendered: string;
}

function put(el: Node, t: string): void {
  if (!t) return;
  const last = el.lastChild;
  if (last?.nodeType === 3) (last as Text).appendData(t);
  else el.appendChild(document.createTextNode(t));
}

function node(tag: string, cls?: string, t = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = t;
  return e;
}

function parseRange(src: string): ParsedRange {
  const a = src.indexOf("[[");
  const b = src.indexOf("]]", a + 2);
  return a >= 0 && b >= a
    ? {
        before: src.slice(0, a),
        old: src.slice(a + 2, b),
        after: src.slice(b + 2),
        valid: true,
      }
    : { before: src, old: "", after: "", valid: false };
}

/**
 * Core Glyptide playback engine — behavior preserved from the v5 prototype.
 */
export function makeEngine(cb: EngineCallbacks): InternalEngine {
  const { out, wait } = cb;
  let guide: HTMLElement | null = null;
  let timer = 0;
  let due = 0;
  let next: (() => void) | null = null;
  let left = 0;
  let state: EngineState = "Ready";
  let previous: EngineState = "Ready";
  let opt: ResolvedConfig;
  let parts: string[] = [];
  let index = 0;
  let range: ParsedRange = { before: "", old: "", after: "", valid: true };
  let chunk: HTMLElement | null = null;
  let cursor: HTMLElement | null = null;
  const activeAnimations = new Set<Animation>();
  let didStall = false;
  let didInterrupt = false;
  let oldBlocks: string[] = [];
  let blockTail: HTMLElement | null = null;
  let rendered = "";
  let review = false;
  let liveMode = false;
  const settleTimers = new Set<number>();

  const status = (s: EngineState) => cb.status?.(s);
  const announce = (m: string) => cb.announce?.(m);
  const change = (s: EngineState) => cb.change?.(s);

  function later(fn: () => void, ms: number): void {
    const id = window.setTimeout(() => {
      settleTimers.delete(id);
      fn();
    }, ms);
    settleTimers.add(id);
  }

  function lifecycleMeta() {
    return appearanceLifecycleFor(opt.effect, opt.caseId, opt.patternName);
  }

  /** Hero/showcase may keep traveling gradients; aesthetic colorMode never forces keep. */
  function shouldPersistShowcase(): boolean {
    return !!opt.persistGradient;
  }

  function settleTransientPiece(el: HTMLElement): void {
    const meta = lifecycleMeta();
    if (shouldPersistShowcase()) {
      const under = el.classList.contains("grad-underline");
      el.style.backgroundPosition = under ? "0 100%" : "0% 0";
      return;
    }
    if (meta.lifecycle !== "transient") return;
    if (meta.settlement === "piece") settlePieceAppearance(el);
  }

  function set(s: EngineState): void {
    state = s;
    status(s);
    change(s);
  }

  function palette(): void {
    if (!opt) return;
    const resolved = resolveGenerationColors({
      theme: opt.theme,
      preset: opt.preset,
      palette: opt.palette,
      colors: opt.colors,
      root: out,
    });
    // Prefer theme-aware resolution; flat colors remain a fallback.
    opt.colors = resolved.colors;
    applyPalette([out, wait], resolved.colors, resolved.mode === "dark");
  }

  function cue(text: string, dots = true): void {
    wait.replaceChildren();
    if (opt?.effect === "shimmer" && dots && !opt.reduce) {
      wait.append(node("span", "shimmer-label", text));
      return;
    }
    if (dots && !opt?.reduce) {
      const d = node("span", "dots");
      d.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 3; i++) d.append(node("i"));
      wait.append(d);
    }
    put(wait, text);
  }

  function clear(): void {
    guide?.remove();
    guide = null;
    clearTimeout(timer);
    next = null;
    cursor?.remove();
    cursor = null;
    for (const a of activeAnimations) a.cancel();
    activeAnimations.clear();
    for (const id of settleTimers) clearTimeout(id);
    settleTimers.clear();
    out.classList.remove("paused");
    wait.classList.remove("paused");
    wait.replaceChildren();
  }

  function animate(el: HTMLElement, effect: string): void {
    if (opt.reduce || effect === "none" || !el.animate) return;
    let frames: Keyframe[];
    let duration = 210;
    if (effect === "ink") {
      // Settle to inherited host color — never hardcode black/white
      frames = [{ color: "var(--gen)" }, { color: "inherit" }];
      duration = 850;
    } else if (effect === "spring") {
      frames = el.classList.contains("motion-block")
        ? springFrames()
        : [{ opacity: 0.28 }, { opacity: 1 }];
      duration = el.classList.contains("motion-block") ? 400 : 210;
    } else if (effect === "wipe") {
      frames = [{ opacity: 0.25 }, { opacity: 1 }];
      duration = 220;
    } else if (effect === "mark") {
      frames = [
        { backgroundColor: "var(--hilite)" },
        { backgroundColor: "transparent" },
      ];
      duration = 900;
    } else if (effect === "block") {
      frames = [
        { opacity: 0, transform: "translateY(3px)" },
        { opacity: 1, transform: "none" },
      ];
      duration = 320;
    } else {
      frames = [{ opacity: 0.28 }, { opacity: 1 }];
    }
    const a = el.animate(frames, {
      duration,
      easing: effect === "spring" ? "linear" : "cubic-bezier(.22,.75,.25,1)",
      fill: "none",
    });
    activeAnimations.add(a);
    a.onfinish = a.oncancel = () => {
      activeAnimations.delete(a);
      if (effect === "ink" || effect === "mark") {
        el.style.removeProperty("color");
        el.style.removeProperty("background-color");
      }
    };
  }

  function base(selected = true): void {
    out.replaceChildren();
    if (opt.caseId === "new" || opt.caseId === "structured") return;
    put(out, range.before);
    if (range.old.trim() && selected) out.append(node("span", "selected", range.old));
    else if (opt.caseId === "insert") out.append(node("span", "inlinewait", "│"));
    else if (range.old) put(out, range.old);
    put(out, range.after);
  }

  function setup(): void {
    out.replaceChildren();
    put(out, range.before);
    if (opt.effect === "worddiff") {
      chunk = node("span", "worddiff");
      out.append(chunk);
      put(out, range.after);
      const old = node("span", "pending-target", range.old);
      chunk.append(old);
      return;
    }
    if (review && opt.caseId !== "insert") {
      if (opt.caseId === "rewrite") {
        const old = node("div", "reviewblock stale", range.old);
        out.append(old);
        chunk = node("div", "reviewblock proposed");
      } else {
        out.append(node("span", "oldstrike", range.old));
        put(out, " ");
        chunk = node("span", "proposed");
      }
    } else {
      const cls =
        (
          {
            ghost: "ghost",
            color: "ink",
            replacementInk: "ink-range",
            underline: "underlined",
            addition: "added",
            linebar: "changebar",
          } as Record<string, string>
        )[opt.effect] || "";
      chunk = node("span", cls);
    }
    if (opt.patternName === "Reserved gap") chunk.classList.add("gapmark");
    out.append(chunk);
    if (opt.caseId === "rewrite" && opt.patternName === "Block-by-block") {
      oldBlocks = splitText(range.old, "paragraph");
      blockTail = node("span", "stale", oldBlocks.join(""));
      out.append(blockTail);
    }
    put(out, range.after);
  }

  function add(t: string): void {
    if (!chunk) return;

    if (opt.effect === "worddiff") {
      rendered += t;
      const a = range.old.match(/\S+\s*|\s+/g) || [];
      const b = rendered.match(/\S+\s*|\s+/g) || [];
      const dp = Array.from(
        { length: a.length + 1 },
        () => new Uint16Array(b.length + 1),
      );
      for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
          dp[i][j] =
            a[i] === b[j]
              ? 1 + dp[i + 1][j + 1]
              : Math.max(dp[i + 1][j], dp[i][j + 1]);
      chunk.replaceChildren();
      let i = 0;
      let j = 0;
      while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i] === b[j]) {
          put(chunk, a[i++]);
          j++;
        } else if (
          i < a.length &&
          (j === b.length || dp[i + 1][j] >= dp[i][j + 1])
        ) {
          chunk.append(node("span", "diff-removed", a[i++]));
        } else {
          chunk.append(node("span", "diff-added", b[j++]));
        }
      }
      return;
    }

    const scroller = out.closest(".stage, .mini, .glyptide-stage") as HTMLElement | null;
    const follow =
      scroller &&
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
    cursor?.remove();
    cursor = null;
    rendered += t;

    if (opt.caseId === "rewrite" && opt.patternName === "Block-by-block") {
      oldBlocks.shift();
      if (blockTail) blockTail.textContent = oldBlocks.join("");
    }

    const effect = opt.effect;
    const prior = chunk.querySelector(
      ".active-guide,.checkpoint-active,.row-accent,.row-focus",
    );
    if (prior)
      prior.classList.remove(
        "active-guide",
        "checkpoint-active",
        "row-accent",
        "row-focus",
      );

    const visual = resolveVisualTreatment(effect, opt.appearance, !!opt.reduce);
    const intensity = Math.max(0, Math.min(1, opt.appearance?.intensity ?? 1));
    const direction = opt.appearance?.gradientDirection ?? 110;
    const underlineLike =
      visual.className === "grad-underline" ||
      visual.className?.includes("appear-underline");

    const specialMotion = [
      "guide",
      "checkpoint",
      "emphasis",
      "rowAccent",
      "rowFocus",
      "heading",
    ].includes(effect);

    if (visual.className || specialMotion) {
      const e = node("span", "piece", t);
      chunk.append(e);
      if (
        effect === "heading" &&
        (opt.patternName === "Data header first"
          ? index === 1
          : opt.patternName === "Outline hierarchy"
            ? /^\d+\.\s/.test(t)
            : t.trim() && !/[.!?]\s*$/.test(t) && t.trim().length < 50)
      ) {
        e.style.fontWeight = "650";
      }
      if (!opt.reduce) {
        if (visual.className) {
          for (const cls of visual.className.split(/\s+/)) {
            if (cls) e.classList.add(cls);
          }
          e.style.setProperty("--appear-intensity", String(intensity));
          if (!visual.solidOnly) {
            e.style.setProperty("--appear-angle", `${direction}deg`);
          }
          if (visual.animateGradient && e.animate) {
            const a = e.animate(
              [
                {
                  backgroundPosition: underlineLike ? "130% 100%" : "130% 0",
                },
                {
                  backgroundPosition: underlineLike ? "-110% 100%" : "-110% 0",
                },
              ],
              { duration: 950, easing: "cubic-bezier(.2,.65,.25,1)" },
            );
            activeAnimations.add(a);
            a.onfinish = () => {
              activeAnimations.delete(a);
              settleTransientPiece(e);
            };
            a.oncancel = () => {
              activeAnimations.delete(a);
              settleTransientPiece(e);
            };
          } else if (!visual.solidOnly && visual.className?.includes("grad-")) {
            // Static gradient: either showcase-hold or transient settle
            if (shouldPersistShowcase()) {
              e.style.backgroundPosition = underlineLike ? "0 100%" : "0% 0";
            } else {
              later(() => settleTransientPiece(e), 700);
            }
          } else if (visual.solidOnly) {
            // Solid aesthetic treatment — clear per piece lifecycle after a beat
            const meta = lifecycleMeta();
            if (meta.lifecycle === "transient" && meta.settlement === "piece") {
              later(() => settleTransientPiece(e), 850);
            }
          }
        }

        // Pattern-specific motion cues (can combine with appearance treatments)
        if (effect === "guide") {
          const r = document.createRange();
          const tn = e.firstChild;
          const value = tn?.textContent || "";
          const pos = value.trimEnd().length;
          if (pos && tn) {
            r.setStart(tn, pos - 1);
            r.setEnd(tn, pos);
            const rect = r.getBoundingClientRect();
            const parent = out.getBoundingClientRect();
            if (!guide) {
              guide = node("span", "visual-guide");
              guide.setAttribute("aria-hidden", "true");
              out.append(guide);
            }
            guide.style.left = "0px";
            guide.style.top = `${rect.bottom - parent.top + 2}px`;
            guide.style.width = `${Math.max(0, rect.right - parent.left)}px`;
          }
        } else if (effect === "checkpoint") {
          e.classList.add("checkpoint-active");
          const count = parts.slice(0, index).filter((x) => x.trim()).length;
          cue(
            `${count} ${
              opt.kind === "sentence"
                ? "sentence"
                : opt.kind === "paragraph"
                  ? "paragraph"
                  : "row"
            }${count === 1 ? "" : "s"} generated`,
            false,
          );
          later(() => {
            e.classList.remove("checkpoint-active");
            e.style.removeProperty("background-color");
          }, 1100);
        } else if (effect === "emphasis") {
          const a = e.animate(
            [
              { color: "var(--gen)", backgroundColor: "var(--hilite)" },
              {
                color: "var(--gen)",
                backgroundColor: "var(--hilite)",
                offset: 0.35,
              },
              // Inherit host foreground — never settle to hardcoded ink
              { color: "inherit", backgroundColor: "transparent" },
            ],
            { duration: 1150, easing: "ease-out" },
          );
          activeAnimations.add(a);
          a.onfinish = a.oncancel = () => {
            activeAnimations.delete(a);
            e.style.removeProperty("color");
            e.style.removeProperty("background-color");
            settleTransientPiece(e);
          };
        } else if (effect === "rowAccent") {
          e.classList.add("row-accent");
          later(() => {
            e.classList.remove("row-accent");
            e.style.removeProperty("background-color");
          }, 1000);
        } else if (effect === "rowFocus") {
          e.classList.add("row-focus");
          later(() => {
            e.classList.remove("row-focus");
            e.style.removeProperty("color");
          }, 1000);
        } else if (effect === "heading") animate(e, "fade");
      } else if (effect === "checkpoint") {
        cue(`${index} complete`, false);
      }
    } else if (
      [
        "none",
        "ghost",
        "review",
        "diff",
        "color",
        "replacementInk",
        "underline",
        "addition",
        "linebar",
        "cursor",
        "placeholder",
        "skeleton",
        "shimmer",
      ].includes(effect) ||
      opt.reduce
    ) {
      put(chunk, t);
    } else if (effect === "block" && opt.caseId !== "insert") {
      const e = node("span", "piece", t);
      chunk.append(e);
      animate(e, "fade");
    } else {
      for (const bit of t.match(/\S+|\s+/g) || []) {
        if (!bit.trim()) put(chunk, bit);
        else {
          const e = node("span", "piece", bit);
          chunk.append(e);
          animate(e, effect);
        }
      }
    }

    if (
      !opt.reduce &&
      (effect === "cursor" ||
        opt.patternName === "Caret insertion" ||
        opt.patternName === "Token stream" ||
        opt.effect === "ghost")
    ) {
      cursor = node("span", "caret");
      cursor.setAttribute("aria-hidden", "true");
      if (effect === "cursor") cursor.classList.add("cursorsteady");
      chunk.append(cursor);
    }

    if (follow && ["new", "structured", "continue"].includes(opt.caseId) && scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }

  function schedule(fn: () => void, ms: number): void {
    next = fn;
    due = performance.now() + ms;
    timer = window.setTimeout(() => {
      next = null;
      fn();
    }, Math.max(0, ms));
  }

  function finalize(): void {
    cursor?.remove();
    cursor = null;
    wait.replaceChildren();
    if (review || opt.effect === "ghost") {
      set("Review");
      cue(
        opt.effect === "ghost"
          ? "Suggestion ready — accept or discard."
          : "Revision ready — accept or discard.",
        false,
      );
      announce("Proposed text is ready for review.");
      return;
    }
    clear();
    if (chunk) {
      const meta = lifecycleMeta();
      if (shouldPersistShowcase()) {
        // Showcase / hero: keep gradient paint, drop active-line cues
        chunk
          .querySelectorAll(".active-guide,.checkpoint-active,.row-accent,.row-focus")
          .forEach((e) =>
            e.classList.remove(
              "active-guide",
              "checkpoint-active",
              "row-accent",
              "row-focus",
            ),
          );
        chunk
          .querySelectorAll(".grad-ink,.grad-highlight,.grad-glow,.grad-underline")
          .forEach((el) => {
            const nodeEl = el as HTMLElement;
            const under = nodeEl.classList.contains("grad-underline");
            nodeEl.style.backgroundPosition = under ? "0 100%" : "0% 0";
          });
      } else if (meta.lifecycle === "persistent") {
        // Clear temporary cues; keep intentional formatting (e.g. heading weight)
        clearTransientAppearance(chunk, { preservePersistent: true });
        chunk.classList.remove(
          "ink",
          "ink-range",
          "underlined",
          "changebar",
          "gapmark",
        );
      } else if (meta.lifecycle === "review-bound") {
        // Should have returned earlier — leave review chrome intact
      } else {
        // Transient: aesthetic colorMode never overrides — restore inherited styles
        clearTransientAppearance(chunk, { preservePersistent: true });
        chunk.className = "";
      }
      if (blockTail) blockTail.remove();
    }
    guide?.remove();
    guide = null;
    set("Complete");
    announce("Generation complete.");
  }

  function tick(): void {
    if (index >= parts.length) {
      schedule(
        finalize,
        opt.reduce
          ? 0
          : Math.max(
              0,
              opt.effect === "mark"
                ? 900
                : opt.effect === "spring"
                  ? 400
                  : [
                        "ink",
                        "emphasis",
                        "replacementInk",
                        "color",
                        "checkpoint",
                        "guide",
                        "rowAccent",
                        "rowFocus",
                      ].includes(opt.effect)
                    ? 1200
                    : opt.effect.startsWith("gradient")
                      ? 1050
                      : 220,
            ),
      );
      return;
    }

    const threshold = Math.max(1, Math.floor(parts.length * 0.38));
    if (index === threshold && opt.scenario === "interrupt" && !didInterrupt) {
      didInterrupt = true;
      cue("Connection interrupted. Resume or stop.", false);
      set("Interrupted");
      return;
    }
    if (index === threshold && opt.scenario === "stall" && !didStall) {
      didStall = true;
      set("Waiting for text");
      cue("Waiting for more text…");
      schedule(() => {
        wait.replaceChildren();
        set("Generating");
        tick();
      }, 1500);
      return;
    }

    const t = parts[index++];
    add(t);
    let delay = Math.max(16, (t.length / opt.speed) * 1000);
    if (opt.kind === "word" || opt.kind === "token") {
      delay = Math.min(270, delay);
      if (/[.!?]\s*$/.test(t)) delay += 65;
      else if (/[,;:]\s*$/.test(t)) delay += 25;
    }
    if (index === parts.length) delay = 25;
    else if (opt.kind === "all") delay = 400;
    if (opt.scenario === "bursts" && index % 4 === 0)
      delay += Math.min(120, delay * 0.4);
    schedule(tick, delay);
  }

  function reset(config: ResolvedConfig): void {
    clear();
    liveMode = false;
    chunk = null;
    blockTail = null;
    oldBlocks = [];
    review = false;
    opt = config;
    palette();
    range = parseRange(opt.source || "");
    if (opt.caseId === "new" || opt.caseId === "structured") {
      range = { before: "", old: "", after: "", valid: true };
    }
    out.classList.toggle(
      "code",
      opt.caseId === "structured" &&
        /^(Code|Data|Buffered code|Buffered data)/.test(opt.patternName),
    );
    out.classList.toggle("reduced", opt.reduce);
    wait.classList.toggle("reduced", opt.reduce);
    rendered = "";
    applyAppearanceVars();
    base();
    set("Ready");
    if (opt.caseId === "new" || opt.caseId === "structured") {
      cue("Ready to generate.", false);
    }
  }

  function start(config: ResolvedConfig): void {
    reset(config);
    liveMode = false;
    if (!config.text.trim()) {
      cue("Enter incoming text first.", false);
      return;
    }
    if (
      ["insert", "replace", "rewrite"].includes(opt.caseId) &&
      !range.valid
    ) {
      cue("Mark the target range with [[ and ]].", false);
      return;
    }

    let text = opt.text;
    if (["Next paragraph", "Paragraph suggestion"].includes(opt.patternName)) {
      text = "\n\n" + text.trim();
    }
    if (
      opt.caseId === "insert" &&
      !range.old.trim() &&
      range.before &&
      !/\s$/.test(range.before)
    ) {
      text = " " + text;
    }
    if (
      opt.caseId === "continue" &&
      !["Next paragraph", "Paragraph suggestion"].includes(opt.patternName) &&
      range.before &&
      !/\s$/.test(range.before) &&
      !/^\s/.test(text)
    ) {
      text = " " + text;
    }

    parts = splitText(text, opt.kind);
    index = 0;
    didStall = false;
    didInterrupt = false;
    review =
      ["review", "diff", "addition", "worddiff"].includes(opt.effect) ||
      (opt.effect === "ghost" && ["replace", "rewrite"].includes(opt.caseId));

    set("Waiting");
    cue(
      opt.caseId === "replace" || opt.caseId === "rewrite"
        ? "Preparing revision…"
        : opt.caseId === "continue"
          ? "Preparing continuation…"
          : opt.caseId === "insert"
            ? "Preparing insertion…"
            : "Preparing response…",
    );

    if (opt.patternName === "Reserved gap" || opt.effect === "placeholder") {
      let marker = out.querySelector(".inlinewait") as HTMLElement | null;
      if (!marker) marker = out.querySelector(".selected") as HTMLElement | null;
      if (marker) {
        marker.className = "placeholder";
        marker.textContent =
          opt.patternName === "Reserved gap"
            ? "Preparing insertion…"
            : "Generating…";
      }
    }
    if (opt.effect === "skeleton") {
      for (const width of ["92%", "78%", "56%"]) {
        const marker = node("span", "blockwait");
        marker.style.width = width;
        marker.setAttribute("aria-hidden", "true");
        out.append(marker);
      }
    }

    announce("Preparing text.");
    const buffer =
      opt.kind === "all" ? Math.min(4500, (text.length / opt.speed) * 1000) : 0;
    schedule(() => {
      wait.replaceChildren();
      setup();
      set("Generating");
      tick();
    }, opt.latency + buffer);
  }

  function pause(): void {
    if (!next) return;
    left = Math.max(0, due - performance.now());
    clearTimeout(timer);
    previous = state;
    out.classList.add("paused");
    wait.classList.add("paused");
    for (const a of activeAnimations) a.pause();
    set("Paused");
  }

  function resume(): void {
    if (state === "Interrupted") {
      wait.replaceChildren();
      set("Generating");
      tick();
      return;
    }
    if (state !== "Paused" || !next) return;
    out.classList.remove("paused");
    wait.classList.remove("paused");
    for (const a of activeAnimations) a.play();
    set(previous);
    schedule(next, left);
  }

  function stop(): void {
    const wasWaiting =
      state === "Waiting" || (state === "Paused" && previous === "Waiting");
    clear();
    if (
      wasWaiting ||
      ["replace", "rewrite"].includes(opt.caseId) ||
      review ||
      opt.effect === "ghost"
    ) {
      base();
      cue("Stopped. Original text preserved.", false);
    } else {
      out.textContent = range.before + rendered + range.after;
      cue("Stopped. Partial text preserved.", false);
    }
    set("Stopped");
    announce("Generation stopped.");
  }

  function accept(): void {
    if (state !== "Review") return;
    clear();
    // Commit content without replaying generation; drop all review chrome
    out.textContent = range.before + rendered + range.after;
    set("Complete");
    announce("Suggestion accepted.");
  }

  function reject(): void {
    if (state !== "Review") return;
    reset(opt);
    cue("Original text restored.", false);
    announce("Suggestion discarded.");
  }

  /** Begin or continue a real (non-simulated) stream */
  function append(chunkText: string): void {
    if (!liveMode) {
      liveMode = true;
      if (state === "Ready" || state === "Complete" || state === "Stopped") {
        const cfg = { ...opt };
        reset(cfg);
        review =
          ["review", "diff", "addition", "worddiff"].includes(opt.effect) ||
          (opt.effect === "ghost" &&
            ["replace", "rewrite"].includes(opt.caseId));
        setup();
        set("Generating");
      }
    }
    if (!chunk) setup();
    const units = splitText(chunkText, opt.kind === "all" ? "word" : opt.kind);
    for (const u of units) add(u);
  }

  function finish(): void {
    if (!liveMode) return;
    finalize();
    liveMode = false;
  }

  function destroy(): void {
    clear();
    out.replaceChildren();
    wait.replaceChildren();
  }

  function updateAppearance(
    patch: Partial<
      Pick<
        ResolvedConfig,
        "colors" | "preset" | "palette" | "theme" | "appearance" | "persistGradient"
      >
    >,
  ): void {
    if (!opt) return;
    if ("colors" in patch) opt.colors = patch.colors ?? null;
    if ("preset" in patch) opt.preset = patch.preset ?? null;
    if ("palette" in patch) opt.palette = patch.palette ?? null;
    if ("theme" in patch && patch.theme) opt.theme = patch.theme;
    if ("appearance" in patch) opt.appearance = patch.appearance ?? null;
    if ("persistGradient" in patch) opt.persistGradient = !!patch.persistGradient;
    applyAppearanceVars();
    palette();
  }

  function applyAppearanceVars(): void {
    if (!opt?.appearance) return;
    const intensity = Math.max(0, Math.min(1, opt.appearance.intensity ?? 1));
    const direction = opt.appearance.gradientDirection ?? 110;
    for (const el of [out, wait]) {
      el.style.setProperty("--appear-intensity", String(intensity));
      el.style.setProperty("--appear-angle", `${direction}deg`);
    }
  }

  return {
    start,
    reset,
    pause,
    resume,
    stop,
    accept,
    reject,
    palette,
    updateAppearance,
    append,
    finish,
    destroy,
    get state() {
      return state;
    },
    get rendered() {
      return rendered;
    },
  };
}
