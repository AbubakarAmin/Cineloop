/**
 * Preset registry. Presets live as JSON in /presets — the single source of truth
 * shared by the Python timeline builder AND the Remotion renderer.
 * Variant presets are pure data (agent-authorable). New *kinds* need a renderer case.
 */
import transitionsJson from '../presets/transitions.json';
import typographyJson from '../presets/typography.json';
import gradesJson from '../presets/grades.json';
import layoutsJson from '../presets/layouts.json';
import motionJson from '../presets/motion.json';
import overlaysJson from '../presets/overlays.json';
import vibesJson from '../presets/vibes.json';

export interface TransitionPreset {
  id: string; name: string; kind: string; durBeats: number; energy: number;
  params: Record<string, number | string>;
  bestFor?: string; notes?: string;
}
export interface TypographyPreset {
  id: string; name: string; font: string; weight: number; sizeFactor: number;
  tracking: number; transform: string; color: string;
  keywords: {style: string; color?: string; from?: string; to?: string; glowColor?: string; glow?: string};
  shadow: string; entrance: {kind: string; durF: number; risePx?: number; caret?: boolean};
  align: string; position: string; backdrop: string; notes?: string;
}
export interface GradePreset {
  id: string; name: string; energy: number;
  filters: Record<string, number>;
  tint: {color: string; opacity: number; blend: string};
  lift: {color: string; opacity: number};
  vignette: number; grain: number; notes?: string;
}
export interface LayoutPreset {
  id: string; name: string; fit: 'cover' | 'contain';
  fill: string; blurPx?: number; darkenFill?: number; fillZoom?: number;
  fillColor?: string; bar?: number; panel?: number;
  gradientFrom?: string; gradientTo?: string; tiltDeg?: number;
  grid?: {mode: string; gap?: number; main?: number};
  frame?: Record<string, unknown> | null;
  captionZone: string; notes?: string;
}
export interface MotionPreset {
  id: string; name: string; kind: string;
  scale: {from: number; to: number};
  pan: {x: [number, number]; y: [number, number]};
  rotate: {from: number; to: number};
  ease: string; breathAmp?: number; beatPulse?: number; handheld?: boolean; parallax?: boolean;
  notes?: string;
}
export interface OverlayPreset {
  id: string; name: string; gen: string; z: number; blend: string; opacity: number;
  params: Record<string, unknown>; notes?: string;
}
export interface VibePreset {
  id: string; name: string; description: string;
  defaults: Record<string, unknown>; bpmHint: [number, number]; notes?: string;
}

export const transitions = transitionsJson as unknown as TransitionPreset[];
export const typography = typographyJson as unknown as TypographyPreset[];
export const grades = gradesJson as unknown as GradePreset[];
export const layouts = layoutsJson as unknown as LayoutPreset[];
export const motions = motionJson as unknown as MotionPreset[];
export const overlays = overlaysJson as unknown as OverlayPreset[];
export const vibes = vibesJson as unknown as VibePreset[];

const byId = <T extends {id: string}>(list: T[], cat: string) => {
  const m = new Map<string, T>();
  for (const p of list) m.set(p.id, p);
  return (id: string): T => {
    const hit = m.get(id);
    if (!hit) throw new Error(`Unknown ${cat} preset: "${id}"`);
    return hit;
  };
};

export const getTransition = byId(transitions, 'transition');
export const getTypography = byId(typography, 'typography');
export const getGrade = byId(grades, 'grade');
export const getLayout = byId(layouts, 'layout');
export const getMotion = byId(motions, 'motion');
export const getOverlay = byId(overlays, 'overlay');
export const getVibe = byId(vibes, 'vibe');
