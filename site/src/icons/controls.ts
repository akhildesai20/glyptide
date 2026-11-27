import { createIcon, swapLeadingIcon, type IconName } from "./index";
import { compress, nudge, pulseScale, spinOnce } from "./animate";

/** Set a control's leading icon + label without wiping a11y attributes. */
export function setIconLabel(
  el: HTMLElement,
  icon: IconName,
  label: string,
  options: { anim?: string } = {},
): void {
  const svg = createIcon(icon, { size: "sm", anim: options.anim });
  el.replaceChildren(svg, document.createTextNode(`\u00a0${label}`));
  el.classList.add("btn-with-icon");
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through to execCommand */
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  document.body.append(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw new Error("copy failed");
}

export async function copyWithIconFeedback(
  button: HTMLElement,
  text: string,
  opts: {
    idleIcon?: IconName;
    idleLabel: string;
    successLabel?: string;
    failLabel?: string;
    holdMs?: number;
  },
): Promise<boolean> {
  const idle = opts.idleIcon ?? "copy";
  try {
    await writeClipboard(text);
    swapLeadingIcon(button, "copied", { anim: "success" });
    const label = opts.successLabel ?? "Copied";
    const nodes = [...button.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE);
    for (const n of nodes) n.textContent = `\u00a0${label}`;
    if (!nodes.length) button.append(document.createTextNode(`\u00a0${label}`));
    pulseScale(button, 1.1);
    window.setTimeout(() => {
      setIconLabel(button, idle, opts.idleLabel);
    }, opts.holdMs ?? 1600);
    return true;
  } catch {
    setIconLabel(button, idle, opts.failLabel ?? "Copy failed");
    window.setTimeout(() => {
      setIconLabel(button, idle, opts.idleLabel);
    }, opts.holdMs ?? 1600);
    return false;
  }
}

export function wireControlAnim(
  el: HTMLElement,
  kind: "replay" | "reset" | "play" | "stop" | "external" | "share",
): void {
  el.addEventListener("click", () => {
    if (kind === "replay" || kind === "reset") spinOnce(el, kind === "reset" ? 360 : -360);
    else if (kind === "stop") compress(el);
    else if (kind === "play") pulseScale(el, 1.08);
    else if (kind === "external" || kind === "share") nudge(el, 2, -2);
  });
}
