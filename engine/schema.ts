/** Core type system for the Loom timeline model. Shared by engine + components. */

export type MediaItem = {
  /** relative path inside public/ served via staticFile */
  src: string;
  type: 'photo' | 'video';
  width: number;
  height: number;
  /** videos only */
  durationSec?: number;
  fps?: number;
  trimInSec?: number;
  trimOutSec?: number;
  speed?: number;
  muted?: boolean;
  rotation?: number;
}

export type Segment = {
  index: number;
  media: MediaItem;
  startF: number;
  durF: number;
  layout: string;
  layoutAccent: boolean;
  motion: string;
  transitionIn: string;
  transitionDurF: number;
  beatAnchored: boolean;
  /** sfx impact at the cut-in of this segment */
  sfx?: string;
}

export type LyricLine = {
  text: string;
  keywords: string[];
  startF: number;
  endF: number;
}

export type OverlayInstance = {
  id: string;
  opacity: number;
  params?: Record<string, unknown>;
}

export type SfxHit = {
  /** absolute frame */
  frame: number;
  file: string;
  gain: number;
}

export type EndCard = {
  title: string;
  subtitle?: string;
  date?: string;
  monogram?: string;
  startF: number;
  durF: number;
  bgSrc?: string;
}

export type Cue = {
  t: number;
  intensity: number;
}

export type LoomData = {
  meta: {
    generator: string;
    brand: string;
    version: string;
    builtAt: string;
    fps: number;
    width: number;
    height: number;
    durationF: number;
    sourceConfig: string;
  };
  audio: {
    src: string;
    startSec: number;
    fadeIn: number;
    fadeOut: number;
    bpm: number | null;
    cues: Cue[];
  };
  style: {
    vibe: string;
    grade: string;
    typography: string;
    transitionPattern: string[];
    accentEvery: number;
  };
  segments: Segment[];
  lyrics: LyricLine[];
  overlays: OverlayInstance[];
  sfx: SfxHit[];
  endCard: EndCard | null;
}
