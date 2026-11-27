import { ACTION_ICONS, ICONS, type ActionIcon, type IconName } from "./catalog";

const SVG_NS = "http://www.w3.org/2000/svg";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "feature";

export interface IconOptions {
  size?: IconSize | number;
  strokeWidth?: number;
  className?: string;
  /** Decorative by default — set false only for icon-only controls without a name elsewhere */
  decorative?: boolean;
  label?: string;
  /** Extra data-icon-anim value for CSS/WAAPI hooks */
  anim?: string;
}

const SIZE_PX: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  feature: 48,
};

function resolveSize(size: IconSize | number | undefined): number {
  if (typeof size === "number") return size;
  return SIZE_PX[size ?? "md"];
}

function defaultStroke(px: number): number {
  if (px >= 40) return 1.35;
  if (px <= 14) return 1.85;
  return 1.75;
}

/** Create an SVG element from the catalog. */
export function createIcon(
  name: IconName,
  options: IconOptions = {},
): SVGSVGElement {
  const node = ICONS[name];
  if (!node) throw new Error(`Unknown icon: ${name}`);

  const px = resolveSize(options.size);
  const stroke = options.strokeWidth ?? defaultStroke(px);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(px));
  svg.setAttribute("height", String(px));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", String(stroke));
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("data-icon", name);
  svg.classList.add("g-icon");
  if (options.className) {
    for (const c of options.className.split(/\s+/).filter(Boolean)) {
      svg.classList.add(c);
    }
  }
  if (options.anim) svg.dataset.iconAnim = options.anim;

  const decorative = options.decorative !== false && !options.label;
  if (decorative) {
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
  } else {
    svg.setAttribute("role", "img");
    if (options.label) {
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = options.label;
      svg.append(title);
      svg.setAttribute("aria-label", options.label);
    }
  }

  for (const [tag, attrs] of node) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null) el.setAttribute(k, String(v));
    }
    svg.append(el);
  }
  return svg;
}

export function createActionIcon(
  action: ActionIcon,
  options: IconOptions = {},
): SVGSVGElement {
  return createIcon(ACTION_ICONS[action], options);
}

/** Replace the contents of a host with a single icon. */
export function setIcon(
  host: Element,
  name: IconName,
  options: IconOptions = {},
): SVGSVGElement {
  const svg = createIcon(name, options);
  host.replaceChildren(svg);
  return svg;
}

/**
 * Ensure a labeled control starts with an icon (keeps trailing text nodes).
 * Idempotent — updates existing leading .g-icon if present.
 */
export function ensureLeadingIcon(
  button: HTMLElement,
  name: IconName,
  options: IconOptions = {},
): SVGSVGElement {
  const existing = button.querySelector<SVGSVGElement>(":scope > .g-icon");
  if (existing?.dataset.icon === name) {
    if (options.anim) existing.dataset.iconAnim = options.anim;
    return existing;
  }
  const svg = createIcon(name, { size: "sm", ...options });
  if (existing) existing.replaceWith(svg);
  else button.prepend(svg);
  button.classList.add("btn-with-icon");
  return svg;
}

/** Swap only the leading icon (e.g. copy → check) without clearing label text. */
export function swapLeadingIcon(
  button: HTMLElement,
  name: IconName,
  options: IconOptions = {},
): SVGSVGElement {
  const svg = createIcon(name, { size: "sm", ...options });
  const existing = button.querySelector<SVGSVGElement>(":scope > .g-icon");
  if (existing) existing.replaceWith(svg);
  else button.prepend(svg);
  button.classList.add("btn-with-icon");
  return svg;
}

/** Hydrate static `[data-icon]` placeholders in a root (once per mount). */
export function hydrateIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
    if (el.matches("svg.g-icon")) return;
    const name = el.dataset.icon as IconName | undefined;
    if (!name || !(name in ICONS)) return;
    const size = (el.dataset.iconSize as IconSize | undefined) || "md";
    const anim = el.dataset.iconAnim;
    const svg = createIcon(name, {
      size,
      anim,
      className: el.className || undefined,
      decorative: el.getAttribute("aria-hidden") !== "false",
      label: el.getAttribute("aria-label") || undefined,
    });
    el.replaceWith(svg);
  });
}
