/**
 * LoomEdit — the main composition. Renders the full timeline from build/data.json
 * (passed via inputProps): segments + transition bridges + lyrics + overlays + grade
 * + SFX + end card, with the music track (fade in/out, offset cut-in).
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {LoomData} from '../engine/schema';
import {getGrade} from '../engine/presets';
import {GradeLayer} from '../components/GradeLayer';
import {MediaCard} from '../components/MediaCard';
import {TransitionBridge} from '../components/TransitionBridge';
import {LyricTrack} from '../components/LyricTrack';
import {OverlayLayer} from '../components/OverlayLayer';
import {SfxLayer} from '../components/SfxLayer';
import {EndCardView} from '../components/EndCard';

export const LoomEdit: React.FC<{data: LoomData}> = ({data}) => {
  const grade = getGrade(data.style.grade);
  const segs = data.segments;

  return (
    <AbsoluteFill style={{background: '#0a0708'}}>
      {/* GRADED MEDIA STACK */}
      <GradeLayer grade={grade}>
        {segs.map((seg, i) => {
          const prev = i > 0 ? segs[i - 1] : null;
          const bridgeDur = i > 0 ? Math.min(seg.transitionDurF, prev!.durF - 4, seg.durF - 4) : 0;
          const bridgeStart = seg.startF - Math.floor(bridgeDur / 2);
          return (
            <React.Fragment key={i}>
              {i > 0 && bridgeDur > 0 ? (
                <Sequence from={bridgeStart} durationInFrames={bridgeDur} name={`trans-${i}`}>
                  <TransitionBridge
                    data={data}
                    prev={prev!}
                    next={seg}
                    durF={bridgeDur}
                    transitionId={seg.transitionIn}
                  />
                </Sequence>
              ) : null}
              <Sequence from={seg.startF} durationInFrames={seg.durF} name={`seg-${i}`}>
                <MediaCard seg={seg} data={data} nextSeg={segs[i + 1]} />
              </Sequence>
            </React.Fragment>
          );
        })}
      </GradeLayer>

      {/* GRAPHICS OVERLAYS */}
      <OverlayLayer overlays={data.overlays} />

      {/* LYRICS */}
      <LyricTrack data={data} />

      {/* END CARD */}
      {data.endCard ? <EndCardView card={data.endCard} /> : null}

      {/* MUSIC with cut-in offset + fades */}
      <MusicTrack
        src={data.audio.src}
        startSec={data.audio.startSec}
        totalF={data.meta.durationF}
        fadeIn={data.audio.fadeIn}
        fadeOut={data.audio.fadeOut}
        fps={data.meta.fps}
      />

      <SfxLayer data={data} />
    </AbsoluteFill>
  );
};

const MusicTrack: React.FC<{
  src: string; startSec: number; totalF: number; fadeIn: number; fadeOut: number; fps: number;
}> = ({src, startSec, totalF, fadeIn, fadeOut, fps}) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const vol = interpolate(
    t,
    [0, fadeIn, Math.max(fadeIn + 0.01, totalF / fps - fadeOut), totalF / fps],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <Audio src={staticFile(src)} startFrom={Math.round(startSec * fps)} volume={vol * 0.88} />;
};
