import { resolveVisualTreatment } from "./appearance";
import { createEventBus, eventForEngineState } from "./events";
import {
  appearanceLifecycleFor,
  clearTransientAppearance,
  settlePieceAppearance,
} from "./lifecycle";
import { resolveMotion } from "./motion";
import { applyPalette, resolveGenerationColors } from "./palette";
import {
  headingWeightMode,
  isBlockByBlock,
  isCodeSurfacePattern,
  isParagraphLeadIn,
  isReservedGap,
  showsCaret,
} from "./pattern-flags";
import { springFrames } from "./spring";
import { createIncrementalSplitter } from "./incremental-split";
import { createStreamIngress } from "./stream-ingress";
import { splitText } from "./split";
import { normalizeSnapshot } from "./text-ops";
import type {
  EngineCallbacks,
  EngineState,
  GlyptideEvent,
  GlyptideEventHandler,
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
  /** Update appearance / pacing fields without restarting generation */
  updateAppearance: (
    patch: Partial<
      Pick<
        ResolvedConfig,
        | "colors"
        | "preset"
        | "palette"
        | "theme"
        | "appearance"
        | "persistGradient"
        | "motion"
        | "speed"
        | "latency"
        | "reduce"
        | "stallMs"
        | "catchUp"
      >
    >,
  ) => void;
  /** Open a new live generation session; invalidates prior sessions */
  beginStream: () => number;
  /** Real-stream append (optional session rejects stale producers) */
  append: (chunk: string, session?: number) => void;
  applySnapshot: (fullText: string, session?: number) => void;
  finish: (session?: number) => void;
  on: (event: GlyptideEvent | "*", handler: GlyptideEventHandler) => () => void;
  destroy: () => void;
  readonly state: EngineState;
  readonly rendered: string;
  readonly session: number;
  readonly queueSize: number;
  readonly activeAnimationCount: number;
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
  let simulated = false;
  let firstContentEmitted = false;
  let waitingShown = false;
  let snapshotAccum = "";
  /** Monotonic generation id — stale async work from prior runs is ignored */
  let generation = 0;
  /** Active live session; 0 means no authorized live session */
  let activeSession = 0;
  let destroyed = false;
  let sourceComplete = false;
  /** True once finish() has been accepted for the active session (idempotent) */
  let sessionFinished = false;
  /**
   * Snapshot replacement received while paused. The DOM stays untouched until
   * resume(); append-style updates while this is set extend it.
   */
  let pausedSnapshot: string | null = null;
  let drainTimer = 0;
  let splitter = createIncrementalSplitter("word");
  const settleTimers = new Set<number>();
  const bus = createEventBus();
  const MAX_ACTIVE_ANIMATIONS = 48;
  /** Max time finalize waits for in-flight animations before settling (ms) */
  const SETTLE_MAX_MS = 1200;
  const ingress = createStreamIngress({
    maxQueue: 256,
    policy: "catchUp",
    stallMs: 2500,
    onStall: () => {
      if (destroyed) return;
      if (liveMode && (state === "Generating" || state === "Waiting for text")) {
        // Avoid holding a trailing word/grapheme indefinitely on slow streams
        if (splitter.pending && opt?.kind !== "all") {
          const held = splitter.flush();
          if (held.length) {
            ingress.push(held);
            scheduleDrain();
            return;
          }
        }
        set("Waiting for text");
        cue("Waiting for more text…");
        emit("stalled");
      }
    },
  });
  let stallWatch = 0;

  function sessionOk(session?: number): boolean {
    if (destroyed) return false;
    if (session == null) return true;
    return session === activeSession && activeSession !== 0;
  }

  function invalidateSession(): void {
    generation += 1;
    activeSession = 0;
    sourceComplete = false;
    sessionFinished = false;
    pausedSnapshot = null;
    stopDrain();
    splitter.clear();
  }

  function canAnimate(): boolean {
    return activeAnimations.size < MAX_ACTIVE_ANIMATIONS;
  }

  function stopDrain(): void {
    if (drainTimer) {
      clearTimeout(drainTimer);
      drainTimer = 0;
    }
  }

  function revealIntervalMs(): number {
    const motion = resolveMotion(opt?.motion);
    const policy = opt?.catchUp ?? "catchUp";
    if (policy === "flush" || opt?.reduce || motion.preset === "instant") return 0;
    const base =
      motion.deliveryIntervalMs > 0
        ? motion.deliveryIntervalMs
        : Math.max(8, Math.round(1000 / Math.max(12, opt?.speed ?? 54)));
    const age = ingress.backlogAgeMs();
    if (policy === "catchUp" && (ingress.size > 32 || age > 500)) {
      return Math.max(0, Math.floor(base / 4));
    }
    if (policy === "catchUp" && (ingress.size > 8 || age > 200)) {
      return Math.max(0, Math.floor(base / 2));
    }
    return base;
  }

  function scheduleDrain(): void {
    if (destroyed || !liveMode || state === "Paused") return;
    if (drainTimer) return;
    if (ingress.size === 0) {
      if (sourceComplete) {
        sourceComplete = false;
        finalize();
        liveMode = false;
        simulated = false;
      }
      return;
    }
    const delay = revealIntervalMs();
    drainTimer = window.setTimeout(() => {
      drainTimer = 0;
      if (destroyed || !liveMode || state === "Paused") return;
      // Bound concurrent decorative animations
      if (!canAnimate()) {
        const batch = ingress.take(Math.max(1, ingress.suggestedTake()));
        for (const u of batch) add(u, { skipAnim: true });
      } else {
        const n = ingress.suggestedTake();
        const batch = ingress.take(n);
        const policy = opt.catchUp ?? "catchUp";
        const skipAnim =
          policy === "flush" ||
          (policy === "catchUp" && ingress.size + batch.length > 64);
        for (const u of batch) add(u, { skipAnim });
      }
      scheduleDrain();
    }, delay);
  }

  const status = (s: EngineState) => cb.status?.(s);
  const announce = (m: string) => cb.announce?.(m);
  const change = (s: EngineState) => cb.change?.(s);
  const emit = (event: GlyptideEvent, detail?: unknown) => {
    bus.emit(event, detail);
    cb.event?.(event, detail);
  };

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
    const ev = eventForEngineState(s);
    if (ev) emit(ev);
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

  function cancelActiveAnimations(): void {
    for (const a of activeAnimations) {
      // Attach rejection handler before cancel — happy-dom rejects `finished`.
      void Promise.resolve(a.finished).catch(() => {});
      try {
        a.cancel();
      } catch {
        // Ignore sync cancel failures in non-browser DOM shims.
      }
    }
    activeAnimations.clear();
  }

  function clear(): void {
    guide?.remove();
    guide = null;
    clearTimeout(timer);
    next = null;
    cursor?.remove();
    cursor = null;
    cancelActiveAnimations();
    for (const id of settleTimers) clearTimeout(id);
    settleTimers.clear();
    out?.classList.remove("paused");
    wait?.classList.remove("paused");
    wait?.replaceChildren();
  }

  function animate(el: HTMLElement, effect: string): void {
    if (opt.reduce || effect === "none" || !el.animate || !canAnimate()) return;
    const motion = resolveMotion(opt.motion);
    const reveal = motion.revealMs;
    const blur = motion.blurPx;
    let frames: Keyframe[];
    let duration = reveal > 0 ? reveal : 1;
    if (effect === "ink") {
      // Settle to inherited host color — never hardcode black/white
      frames = [{ color: "var(--gen)" }, { color: "inherit" }];
      duration = Math.max(reveal, 850);
    } else if (effect === "spring") {
      if (el.classList.contains("motion-block")) {
        // Map preset spring feel → omega / distance (stiffer = snappier)
        const stiff = motion.spring.stiffness;
        const omega = Math.max(10, Math.min(32, stiff / 8));
        frames = springFrames({
          distance: Math.max(1, motion.displacementPx / 3),
          omega,
          duration: Math.max(0.2, (reveal || 400) / 1000),
        });
        duration = Math.max(reveal, 400);
      } else {
        frames = [
          {
            opacity: motion.initialOpacity,
            filter: blur ? `blur(${blur}px)` : "none",
            transform: motion.displacementPx
              ? `translateY(${Math.min(8, motion.displacementPx / 2)}px)`
              : "none",
          },
          { opacity: 1, filter: "none", transform: "none" },
        ];
        duration = reveal > 0 ? reveal : 1;
      }
    } else if (effect === "wipe") {
      frames = [
        {
          opacity: motion.initialOpacity,
          clipPath: "inset(0 100% 0 0)",
        },
        { opacity: 1, clipPath: "inset(0 0 0 0)" },
      ];
      duration = reveal > 0 ? Math.max(reveal, 180) : 1;
    } else if (effect === "mark") {
      frames = [
        { backgroundColor: "var(--hilite)" },
        { backgroundColor: "transparent" },
      ];
      duration = Math.max(reveal, 900);
    } else if (effect === "block") {
      frames = [
        {
          opacity: motion.initialOpacity,
          transform: `translateY(${Math.max(2, motion.displacementPx / 3)}px)`,
          filter: blur ? `blur(${blur}px)` : "none",
        },
        { opacity: 1, transform: "none", filter: "none" },
      ];
      duration = reveal > 0 ? Math.max(reveal, 200) : 1;
    } else {
      frames = [
        {
          opacity: motion.initialOpacity,
          filter: blur ? `blur(${blur}px)` : "none",
        },
        { opacity: 1, filter: "none" },
      ];
      duration = reveal > 0 ? reveal : 1;
    }
    // Instant preset: skip WAAPI — content appears settled
    if (reveal === 0 && motion.preset === "instant") {
      el.style.removeProperty("filter");
      return;
    }
    const a = el.animate(frames, {
      duration,
      easing:
        effect === "spring"
          ? "linear"
          : motion.preset === "expressive"
            ? "cubic-bezier(.18,.9,.22,1)"
            : "cubic-bezier(.22,.75,.25,1)",
      fill: "none",
    });
    activeAnimations.add(a);
    const settleAnim = () => {
      activeAnimations.delete(a);
      el.style.removeProperty("filter");
      if (effect === "ink" || effect === "mark") {
        el.style.removeProperty("color");
        el.style.removeProperty("background-color");
      }
    };
    a.onfinish = a.oncancel = settleAnim;
    // Prevent unhandled rejection when cancel() aborts the finished promise.
    void a.finished?.then(settleAnim, () => {
      activeAnimations.delete(a);
    });
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
    if (isReservedGap(opt.patternId, opt.patternName))
      chunk.classList.add("gapmark");
    out.append(chunk);
    if (opt.caseId === "rewrite" && isBlockByBlock(opt.patternId, opt.patternName)) {
      oldBlocks = splitText(range.old, "paragraph");
      blockTail = node("span", "stale", oldBlocks.join(""));
      out.append(blockTail);
    }
    put(out, range.after);
  }

  function add(t: string, opts?: { skipAnim?: boolean }): void {
    if (destroyed || !chunk) return;
    // Over the concurrent-animation budget → reveal without new animations
    const skipAnim = !!opts?.skipAnim || !canAnimate();

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

    if (opt.caseId === "rewrite" && isBlockByBlock(opt.patternId, opt.patternName)) {
      oldBlocks.shift();
      if (blockTail) blockTail.textContent = oldBlocks.join("");
    }

    if (!firstContentEmitted && t) {
      firstContentEmitted = true;
      emit("first-content");
      if (!waitingShown) wait.replaceChildren();
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
      const e = node("span", "glyptide-piece piece", t);
      chunk.append(e);
      if (effect === "heading") {
        const mode = headingWeightMode(opt.patternId, opt.patternName);
        const weight =
          mode === "data-header"
            ? index === 1
            : mode === "outline"
              ? /^\d+\.\s/.test(t)
              : t.trim() && !/[.!?]\s*$/.test(t) && t.trim().length < 50;
        if (weight) e.style.fontWeight = "650";
      }
      if (!opt.reduce && !skipAnim) {
        if (visual.className) {
          for (const cls of visual.className.split(/\s+/)) {
            if (cls) e.classList.add(cls);
          }
          e.style.setProperty("--appear-intensity", String(intensity));
          if (!visual.solidOnly) {
            e.style.setProperty("--appear-angle", `${direction}deg`);
          }
          if (visual.animateGradient && e.animate && canAnimate()) {
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
        } else if (effect === "emphasis" && (!e.animate || !canAnimate())) {
          settleTransientPiece(e);
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
      const e = node("span", "glyptide-piece piece", t);
      chunk.append(e);
      if (!skipAnim) animate(e, "fade");
    } else {
      for (const bit of t.match(/\S+|\s+/g) || []) {
        if (!bit.trim()) put(chunk, bit);
        else {
          const e = node("span", "glyptide-piece piece", bit);
          chunk.append(e);
          if (!skipAnim) animate(e, effect);
        }
      }
    }

    if (
      !opt.reduce &&
      showsCaret(opt.patternId, opt.patternName, effect)
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
    const policy = opt.catchUp ?? "catchUp";
    if (!opt.reduce && policy !== "flush" && activeAnimations.size > 0) {
      // Soft settle: let in-flight animations finish before appearance cleanup
      const gen = generation;
      let budget = SETTLE_MAX_MS;
      const poll = () => {
        if (destroyed || gen !== generation) return;
        if (state === "Paused") {
          // Paused time does not count against the settle budget
          later(poll, 50);
          return;
        }
        if (activeAnimations.size === 0 || budget <= 0) {
          settleComplete();
          return;
        }
        budget -= 50;
        later(poll, 50);
      };
      later(poll, 50);
      return;
    }
    settleComplete();
  }

  /** Hard clear + appearance cleanup + Complete (after any soft settle wait) */
  function settleComplete(): void {
    if (destroyed) return;
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
    emit("settled");
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
    const motion = resolveMotion(opt.motion);
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
    // Motion delivery interval adds perceptible pacing between units
    if (motion.deliveryIntervalMs > 0 && index < parts.length) {
      delay += motion.deliveryIntervalMs;
    }
    if (motion.preset === "instant") delay = Math.min(delay, 8);
    schedule(tick, delay);
  }

  function reset(config: ResolvedConfig): void {
    if (destroyed) return;
    clear();
    stopStallWatch();
    stopDrain();
    invalidateSession();
    liveMode = false;
    simulated = false;
    firstContentEmitted = false;
    waitingShown = false;
    snapshotAccum = "";
    ingress.clear();
    ingress.setPolicy(config.catchUp ?? "catchUp");
    ingress.setStallMs(config.stallMs ?? 0);
    splitter = createIncrementalSplitter(
      config.kind === "all" ? "all" : config.kind,
    );
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
        isCodeSurfacePattern(opt.patternId, opt.patternName),
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
    simulated = true;
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
    if (isParagraphLeadIn(opt.patternId, opt.patternName)) {
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
      !isParagraphLeadIn(opt.patternId, opt.patternName) &&
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
    // Ghost on continue/insert uses .ghost chrome (not reviewblock); finalize
    // still treats effect === "ghost" as review-bound.
    review =
      ["review", "diff", "addition", "worddiff"].includes(opt.effect) ||
      (opt.effect === "ghost" && ["replace", "rewrite"].includes(opt.caseId));

    const threshold = opt.waitingThresholdMs ?? 180;
    set("Waiting");

    const showWaitingUi = () => {
      if (firstContentEmitted || waitingShown) return;
      waitingShown = true;
      cue(
        opt.caseId === "replace" || opt.caseId === "rewrite"
          ? "Preparing revision…"
          : opt.caseId === "continue"
            ? "Preparing continuation…"
            : opt.caseId === "insert"
              ? "Preparing insertion…"
              : "Preparing response…",
      );
    };

    if (threshold <= 0 || opt.latency >= threshold) {
      showWaitingUi();
    } else {
      later(showWaitingUi, threshold);
    }

    if (isReservedGap(opt.patternId, opt.patternName) || opt.effect === "placeholder") {
      let marker = out.querySelector(".inlinewait") as HTMLElement | null;
      if (!marker) marker = out.querySelector(".selected") as HTMLElement | null;
      if (marker) {
        marker.className = "placeholder";
        marker.textContent = isReservedGap(opt.patternId, opt.patternName)
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
    const motion = resolveMotion(opt.motion);
    const buffer =
      opt.kind === "all" ? Math.min(4500, (text.length / opt.speed) * 1000) : 0;
    schedule(() => {
      if (!waitingShown) wait.replaceChildren();
      setup();
      set("Generating");
      tick();
    }, opt.latency + buffer + (motion.deliveryIntervalMs || 0));
  }

  function cancelSimulatorForLive(): void {
    if (!simulated && !next && state !== "Generating" && state !== "Waiting" && state !== "Paused") {
      return;
    }
    clearTimeout(timer);
    next = null;
    simulated = false;
  }

  function startStallWatch(): void {
    stopStallWatch();
    ingress.setStallMs(opt?.stallMs ?? 0);
    if (!opt?.stallMs) return;
    stallWatch = window.setInterval(() => {
      // Only stall when the source is idle AND visual queue is empty
      ingress.checkSourceStall(ingress.size > 0 || !!drainTimer);
    }, Math.min(500, Math.max(100, opt.stallMs / 5)));
  }

  function stopStallWatch(): void {
    if (stallWatch) {
      clearInterval(stallWatch);
      stallWatch = 0;
    }
  }

  function pause(): void {
    previous = state;
    stopDrain();
    if (next) {
      left = Math.max(0, due - performance.now());
      clearTimeout(timer);
    }
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
    if (state !== "Paused") return;
    out.classList.remove("paused");
    wait.classList.remove("paused");
    for (const a of activeAnimations) a.play();
    set(previous === "Paused" ? "Generating" : previous);
    if (next) schedule(next, left);
    if (liveMode) {
      // Snapshot replacement received while paused becomes visible only now
      if (pausedSnapshot != null) {
        const pending = pausedSnapshot;
        pausedSnapshot = null;
        replaceRenderedContent(pending);
      }
      scheduleDrain();
    }
  }

  function stop(): void {
    const wasWaiting =
      state === "Waiting" || (state === "Paused" && previous === "Waiting");
    stopDrain();
    sourceComplete = false;
    invalidateSession();
    clear();
    liveMode = false;
    simulated = false;
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

  /**
   * Open a new live generation session. Invalidates prior sessions so delayed
   * chunks from a stopped/replaced stream cannot restart generation.
   */
  function beginStream(): number {
    if (destroyed) return 0;
    stopDrain();
    cancelSimulatorForLive();
    clearTimeout(timer);
    next = null;
    generation += 1;
    activeSession = generation;
    sourceComplete = false;
    sessionFinished = false;
    pausedSnapshot = null;
    liveMode = false;
    simulated = false;
    splitter.clear();
    ingress.clear();
    // Always prepare a clean live surface for the new session
    clear();
    rendered = "";
    snapshotAccum = "";
    chunk = null;
    blockTail = null;
    oldBlocks = [];
    firstContentEmitted = false;
    waitingShown = false;
    if (state !== "Ready" && state !== "Waiting") {
      set("Ready");
    }
    return activeSession;
  }

  function ensureLiveSession(session?: number): boolean {
    if (destroyed) return false;
    if (session != null && !sessionOk(session)) return false;
    // A finished session never auto-restarts; callers must beginStream()
    if (sessionFinished) return false;

    if (!liveMode) {
      // Terminal states require beginStream() — refuse stale auto-restart
      if (
        state === "Stopped" ||
        state === "Complete" ||
        state === "Interrupted" ||
        state === "Review"
      ) {
        if (session == null || session !== activeSession || activeSession === 0) {
          return false;
        }
      }

      if (simulated || state === "Waiting" || state === "Generating") {
        cancelSimulatorForLive();
      }

      if (activeSession === 0) {
        generation += 1;
        activeSession = generation;
        sessionFinished = false;
      }

      if (!chunk) {
        if (state === "Ready") {
          review =
            ["review", "diff", "addition", "worddiff"].includes(opt.effect) ||
            (opt.effect === "ghost" &&
              ["replace", "rewrite"].includes(opt.caseId));
        }
        setup();
      }
      liveMode = true;
      simulated = false;
      sourceComplete = false;
      splitter = createIncrementalSplitter(
        opt.kind === "all" ? "all" : opt.kind,
      );
      ingress.setPolicy(opt.catchUp ?? "catchUp");
      ingress.setStallMs(opt.stallMs ?? 0);
      announce("Preparing text.");
      if (state === "Paused") {
        // Stay paused: resume() returns to Generating
        previous = "Generating";
      } else {
        set("Generating");
      }
      startStallWatch();
    }
    if (!chunk) setup();
    return true;
  }

  /** Begin or continue a real (non-simulated) stream */
  function append(chunkText: string, session?: number): void {
    if (destroyed || !chunkText) return;
    if (sessionFinished && sessionOk(session)) return;
    if (!ensureLiveSession(session)) return;

    if (pausedSnapshot != null) {
      // Pending paused snapshot replacement: extend it (applied on resume)
      pausedSnapshot += chunkText;
      snapshotAccum = pausedSnapshot;
      return;
    }

    ingress.setPolicy(opt.catchUp ?? "catchUp");
    // kind "all" retains until finish; others emit complete units
    const units = splitter.push(chunkText);
    // Enqueue only — the scheduler owns reveal (and is a no-op while paused)
    if (units.length) ingress.push(units);
    scheduleDrain();
  }

  /**
   * Replace live rendered content without leaving live mode.
   * Never implements replacement via append of the full snapshot.
   * Preserves unchanged common prefix text in `rendered` accounting only —
   * DOM rebuild is used for correctness across patterns (documented limit).
   */
  function replaceRenderedContent(fullText: string): void {
    clearTimeout(timer);
    next = null;
    stopDrain();
    cursor?.remove();
    cursor = null;
    cancelActiveAnimations();
    for (const id of settleTimers) clearTimeout(id);
    settleTimers.clear();
    ingress.clear();
    splitter.clear();

    if (!liveMode && !ensureLiveSession(activeSession || undefined)) {
      // Force live bootstrap for in-session replace
      liveMode = true;
      simulated = false;
      set("Generating");
    }

    rendered = "";
    snapshotAccum = "";
    chunk = null;
    blockTail = null;
    oldBlocks = [];
    setup();

    if (fullText) {
      const units = splitText(fullText, opt.kind === "all" ? "all" : opt.kind);
      const policy = opt.catchUp ?? "catchUp";
      for (const u of units) add(u, { skipAnim: policy === "flush" });
    }
    snapshotAccum = fullText;
  }

  function applySnapshot(fullText: string, session?: number): void {
    if (destroyed) return;
    if (session != null && !sessionOk(session)) return;
    if (sessionFinished && sessionOk(session)) return;
    if (!liveMode && !ensureLiveSession(session)) return;

    const previousText = snapshotAccum || rendered;
    const op = normalizeSnapshot(previousText, fullText);
    if (op.type === "noop") {
      snapshotAccum = fullText;
      return;
    }
    if (state === "Paused") {
      // Documented pause semantics: nothing becomes visible while paused.
      // Replacements are held and applied on resume(); appends are buffered.
      if (pausedSnapshot != null || op.type === "replace") {
        pausedSnapshot = fullText;
        snapshotAccum = fullText;
        ingress.clear();
        splitter.clear();
        return;
      }
    }
    if (op.type === "append") {
      if (op.text) append(op.text, session ?? activeSession);
      snapshotAccum = fullText;
      return;
    }
    replaceRenderedContent(fullText);
  }

  function finish(session?: number): void {
    if (destroyed) return;
    if (session != null && !sessionOk(session)) return;
    // Idempotent: exactly one stream-end per session
    if (sessionFinished) return;
    if (!liveMode) {
      // Empty stream (beginStream → finish) still completes
      if (activeSession === 0) return;
      if (!ensureLiveSession(session ?? activeSession)) return;
    }
    sessionFinished = true;
    emit("stream-end");
    stopStallWatch();
    const rem = splitter.flush();
    if (rem.length) ingress.push(rem);
    sourceComplete = true;
    // Paused: keep buffered text hidden; resume() drains then completes
    if (state === "Paused") return;
    const policy = opt.catchUp ?? "catchUp";
    if (policy === "flush" || opt.reduce) {
      for (const u of ingress.flush()) add(u, { skipAnim: true });
      sourceComplete = false;
      finalize();
      liveMode = false;
      simulated = false;
      return;
    }
    // Pace / catchUp: drain remaining units then settle
    scheduleDrain();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    invalidateSession();
    stopStallWatch();
    stopDrain();
    clear();
    bus.clear();
    ingress.clear();
    liveMode = false;
    simulated = false;
    // Clear Glyptide-generated content only; class removal is owned by createGlyptide
    out.replaceChildren();
    wait.replaceChildren();
  }

  function on(
    event: GlyptideEvent | "*",
    handler: GlyptideEventHandler,
  ): () => void {
    return bus.on(event, handler);
  }

  function updateAppearance(
    patch: Partial<
      Pick<
        ResolvedConfig,
        | "colors"
        | "preset"
        | "palette"
        | "theme"
        | "appearance"
        | "persistGradient"
        | "motion"
        | "speed"
        | "latency"
        | "reduce"
        | "stallMs"
        | "catchUp"
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
    if ("motion" in patch) opt.motion = patch.motion ?? null;
    if ("speed" in patch && typeof patch.speed === "number") opt.speed = patch.speed;
    if ("latency" in patch && typeof patch.latency === "number") {
      opt.latency = patch.latency;
    }
    if ("reduce" in patch && typeof patch.reduce === "boolean") {
      opt.reduce = patch.reduce;
      out.classList.toggle("reduced", patch.reduce);
    }
    if ("stallMs" in patch && typeof patch.stallMs === "number") {
      opt.stallMs = patch.stallMs;
      ingress.setStallMs(patch.stallMs);
    }
    if ("catchUp" in patch && patch.catchUp) {
      opt.catchUp = patch.catchUp;
      ingress.setPolicy(patch.catchUp);
    }
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
    beginStream,
    append,
    applySnapshot,
    finish,
    on,
    destroy,
    get state() {
      return state;
    },
    get rendered() {
      return rendered;
    },
    get session() {
      return activeSession;
    },
    get queueSize() {
      return ingress.size;
    },
    get activeAnimationCount() {
      return activeAnimations.size;
    },
  };
}
