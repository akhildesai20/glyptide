/** Required element lookup (throws downstream if the page forgot it). */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

/** Optional element lookup — returns null when the page does not provide it. */
export const $maybe = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;
