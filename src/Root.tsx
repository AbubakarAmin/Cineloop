import React from 'react';
import {Composition} from 'remotion';
import type {LoomData} from '../engine/schema';
import {LoomEdit} from '../components/LoomEdit';
import {loadLoomFonts} from '../engine/fonts';

loadLoomFonts();

/**
 * Data contract:
 *  - The composition's props ARE the LoomData object.
 *  - `remotion render Loom --props=build/data.json` (and studio likewise)
 *    injects the real timeline; the bundle never touches Node APIs.
 *  - defaultProps is the empty fallback so `npx tsc` and bare Studio boot.
 */
const FALLBACK: LoomData = {
  meta: {
    generator: 'cineloom', brand: 'Cineloom', version: '0', builtAt: '',
    fps: 30, width: 1080, height: 1920, durationF: 90, sourceConfig: 'none',
  },
  audio: {src: 'media/song.mp3', startSec: 0, fadeIn: 0.5, fadeOut: 1, bpm: null, cues: []},
  style: {vibe: 'romantic_nostalgia', grade: 'warm_film', typography: 'golden_retro', transitionPattern: ['film_dissolve'], accentEvery: 4},
  segments: [],
  lyrics: [],
  overlays: [],
  sfx: [],
  endCard: null,
};

const LoomRoot: React.FC<LoomData> = (data) => <LoomEdit data={data} />;

export const Root: React.FC = () => {
  return (
    <Composition
      id="Loom"
      component={LoomRoot}
      width={FALLBACK.meta.width}
      height={FALLBACK.meta.height}
      fps={FALLBACK.meta.fps}
      durationInFrames={FALLBACK.meta.durationF}
      defaultProps={FALLBACK}
      calculateMetadata={({props}) => ({
        width: props.meta.width,
        height: props.meta.height,
        fps: props.meta.fps,
        durationInFrames: props.meta.durationF,
      })}
    />
  );
};
