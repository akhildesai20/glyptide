/**
 * Critically-damped / near-critically-damped spring step response.
 * ζ ≈ 0.95, ω = 17 rad/s — tiny overshoot, no bounce.
 * Used for block arrival and restrained spatial motion only.
 */
export function springFrames(
  options: { zeta?: number; omega?: number; distance?: number; duration?: number; steps?: number } = {},
): Keyframe[] {
  const z = options.zeta ?? 0.95;
  const w = options.omega ?? 17;
  const distance = options.distance ?? 3;
  const duration = options.duration ?? 0.4;
  const steps = options.steps ?? 24;
  const wd = w * Math.sqrt(Math.max(0, 1 - z * z));
  const frames: Keyframe[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration;
    const y =
      1 -
      Math.exp(-z * w * t) *
        (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
    frames.push({
      transform: `translateY(${(1 - y) * distance}px)`,
      opacity: Math.max(0, Math.min(1, y * 1.4)),
      offset: i / steps,
    });
  }

  frames[frames.length - 1] = { transform: "none", opacity: 1, offset: 1 };
  return frames;
}
