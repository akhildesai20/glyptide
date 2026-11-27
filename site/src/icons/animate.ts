/** Restrained icon microinteractions — CSS + Web Animations API. */

function prefersReduced(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function iconOf(target: Element): SVGSVGElement | null {
  return target instanceof SVGSVGElement
    ? target
    : target.querySelector<SVGSVGElement>(".g-icon, svg[data-icon]");
}

function run(
  el: Element,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  if (prefersReduced()) return null;
  const prev = el.getAnimations?.() ?? [];
  for (const a of prev) {
    if ((a as Animation & { id?: string }).id?.startsWith("g-icon-")) a.cancel();
  }
  const anim = el.animate(keyframes, {
    duration: 280,
    easing: "cubic-bezier(0.22, 0.75, 0.25, 1)",
    fill: "none",
    ...options,
  });
  return anim;
}

export function spinOnce(target: Element, degrees = -360): void {
  const icon = iconOf(target);
  if (!icon) return;
  const anim = run(
    icon,
    [{ transform: "rotate(0deg)" }, { transform: `rotate(${degrees}deg)` }],
    { duration: 420, id: "g-icon-spin" },
  );
  anim?.finished.catch(() => undefined);
}

export function nudge(target: Element, dx = 2, dy = -2): void {
  const icon = iconOf(target);
  if (!icon) return;
  run(
    icon,
    [
      { transform: "translate(0, 0)" },
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: "translate(0, 0)" },
    ],
    { duration: 320, id: "g-icon-nudge" },
  );
}

export function pulseScale(target: Element, to = 1.08): void {
  const icon = iconOf(target);
  if (!icon) return;
  run(
    icon,
    [
      { transform: "scale(1)" },
      { transform: `scale(${to})` },
      { transform: "scale(1)" },
    ],
    { duration: 240, id: "g-icon-pulse" },
  );
}

export function compress(target: Element): void {
  const icon = iconOf(target);
  if (!icon) return;
  run(
    icon,
    [
      { transform: "scale(1)" },
      { transform: "scale(0.86)" },
      { transform: "scale(1)" },
    ],
    { duration: 220, id: "g-icon-compress" },
  );
}

/** Animate recipe feature icons by name — path-aware where geometry allows. */
export function playRecipeIconAnim(
  svg: SVGSVGElement,
  kind: "chat" | "editor" | "research" | "coding" | "composer",
): void {
  if (prefersReduced()) return;
  const paths = [...svg.querySelectorAll("path, line, polyline, rect, circle")];
  if (!paths.length) {
    pulseScale(svg, 1.06);
    return;
  }

  const clear = () => {
    for (const p of paths) {
      for (const a of p.getAnimations?.() ?? []) a.cancel();
    }
  };
  clear();

  const ease = "cubic-bezier(0.22, 0.75, 0.25, 1)";

  switch (kind) {
    case "chat": {
      // MessagesSquare: nudge secondary bubble, then primary
      const [a, b] = paths;
      if (b) {
        b.animate(
          [
            { transform: "translate(0, 0)" },
            { transform: "translate(0, -1.5px)" },
            { transform: "translate(0, 0)" },
          ],
          { duration: 420, easing: ease, id: "g-icon-chat-b" },
        );
      }
      if (a) {
        a.animate(
          [
            { transform: "translate(0, 0)" },
            { transform: "translate(0, -1px)", offset: 0.35 },
            { transform: "translate(0, 0)" },
          ],
          { duration: 480, delay: 60, easing: ease, id: "g-icon-chat-a" },
        );
      }
      break;
    }
    case "editor":
    case "composer": {
      // Pen tip: small writing stroke
      const pen = paths[paths.length - 1] ?? paths[0];
      pen.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: "translate(1.5px, 1px)" },
          { transform: "translate(0, 0.5px)" },
          { transform: "translate(0, 0)" },
        ],
        { duration: 520, easing: ease, id: "g-icon-pen" },
      );
      break;
    }
    case "research": {
      const glass = paths[paths.length - 1] ?? paths[0];
      glass.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: "translate(1.5px, 1px)" },
          { transform: "translate(-1px, 0.5px)" },
          { transform: "translate(0, 0)" },
        ],
        { duration: 560, easing: ease, id: "g-icon-scan" },
      );
      break;
    }
    case "coding": {
      // Bracket-like paths: ease apart then return
      const left = paths[0];
      const right = paths[1] ?? paths[paths.length - 1];
      left?.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: "translate(-1.25px, 0)" },
          { transform: "translate(0, 0)" },
        ],
        { duration: 400, easing: ease, id: "g-icon-code-l" },
      );
      right?.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: "translate(1.25px, 0)" },
          { transform: "translate(0, 0)" },
        ],
        { duration: 400, easing: ease, id: "g-icon-code-r" },
      );
      break;
    }
    default:
      pulseScale(svg, 1.05);
  }
}

/** Bind one-shot hover/focus animation; ignores rapid re-entry while running. */
export function bindHoverAnim(
  host: HTMLElement,
  play: () => void,
): () => void {
  let busy = false;
  const trigger = () => {
    if (busy || prefersReduced()) return;
    busy = true;
    play();
    window.setTimeout(() => {
      busy = false;
    }, 500);
  };
  const onEnter = () => trigger();
  const onFocus = () => trigger();
  host.addEventListener("pointerenter", onEnter);
  host.addEventListener("focus", onFocus);
  return () => {
    host.removeEventListener("pointerenter", onEnter);
    host.removeEventListener("focus", onFocus);
  };
}
