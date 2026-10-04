/** Easing + math helpers shared by all components. */
import {interpolate} from 'remotion';

export const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const ease = (name: string, t: number): number =>
  (EASINGS[name] ?? EASINGS.linear)(Math.min(1, Math.max(0, t)));

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** frame-level linear interpolate shorthand */
export const fr = (
  frame: number,
  inRange: [number, number],
  outRange: [number, number],
  easing: (t: number) => number = EASINGS.linear,
): number => interpolate(frame, inRange, outRange, {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** deterministic pseudo-random from an integer seed (0..1) */
export const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** multi-sine handheld wobble in px */
export const wobble = (frame: number, seed: number, ampPx: number): [number, number] => {
  const t = frame / 30;
  const x = Math.sin(t * 1.7 + seed) * 0.6 + Math.sin(t * 3.1 + seed * 2) * 0.3 + Math.sin(t * 5.3 + seed * 3) * 0.1;
  const y = Math.cos(t * 1.3 + seed) * 0.6 + Math.sin(t * 2.7 + seed * 1.5) * 0.4;
  return [x * ampPx, y * ampPx];
};
