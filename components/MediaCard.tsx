/**
 * MediaCard — renders one timeline segment (photo OR video clip) through a
 * layout preset + motion preset. Video support: trim, speed, mute.
 */
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {LoomData, Segment} from '../engine/schema';
import {getLayout, getMotion} from '../engine/presets';
import {ease, fr, rand, wobble} from '../engine/math';
import {fitBox} from './fit';

export const computeMotionT = (
  motionId: string,
  p: number,
  segDurF: number,
  beatBoost: number,
  seed: number,
): {scale: number; tx: number; ty: number; rot: number} => {
  const m = getMotion(motionId);
  const e = ease(m.ease, p);
  let scale = m.scale.from + (m.scale.to - m.scale.from) * e;
  let rot = m.rotate.from + (m.rotate.to - m.rotate.from) * e;
  const tx = (m.pan.x[0] + (m.pan.x[1] - m.pan.x[0]) * e);
  const ty = (m.pan.y[0] + (m.pan.y[1] - m.pan.y[0]) * e);
  if (m.breathAmp) scale += Math.sin((p * segDurF / 30) * (Math.PI * 2 / 6)) * m.breathAmp;
  if (m.beatPulse) scale += beatBoost;
  if (m.handheld) {
    const [wx, wy] = wobble(Math.floor(p * segDurF), seed, 9);
    return {scale, tx: tx + wx / 1080, ty: ty + wy / 1920, rot};
  }
  return {scale, tx, ty, rot};
};

interface Props {
  seg: Segment;
  data: LoomData;
  /** for grid layouts: the following segment's media */
  nextSeg?: Segment;
}

export const MediaCard: React.FC<Props> = ({seg, data, nextSeg}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const layout = getLayout(seg.layout);
  const m = seg.media;
  const seed = seg.index * 17.31;
  const local = frame;
  const p = seg.durF > 0 ? local / seg.durF : 0;

  // beat pulse contribution
  let beatBoost = 0;
  const mo = getMotion(seg.motion);
  if (mo.beatPulse) {
    const segStartT = seg.startF / fps;
    const nowT = (seg.startF + local) / fps;
    for (const c of data.audio.cues) {
      if (c.t >= segStartT && c.t <= nowT && c.intensity > 0.6) {
        const dt = nowT - c.t;
        beatBoost += mo.beatPulse * Math.exp(-dt * 9) * c.intensity;
      }
    }
  }

  const mt = computeMotionT(seg.motion, p, seg.durF, beatBoost, seed);
  const transform = `scale(${mt.scale}) translate(${mt.tx * 100}%, ${mt.ty * 100}%) rotate(${mt.rot}deg)`;

  const Media: React.FC<{box: ReturnType<typeof fitBox>; extra?: string}> = ({box, extra}) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
      transform,
      transformOrigin: 'center center',
      ...(extra ? {filter: extra} : {}),
    };
    if (m.type === 'video') {
      const rate = m.speed ?? 1;
      const trimIn = m.trimInSec ?? 0;
      return (
        <OffthreadVideo
          src={staticFile(m.src)}
          style={style}
          muted={m.muted ?? true}
          playbackRate={rate}
          startFrom={Math.round((trimIn + (local / fps) * rate) * (m.fps ?? 30))}
        />
      );
    }
    return <Img src={staticFile(m.src)} style={style} />;
  };

  const coverBox = fitBox(m.width, m.height, width, height, 'cover', [0.5, 0.5]);
  const containBox = fitBox(m.width, m.height, width, height, 'contain', [0.5, 0.45]);
  const tilt = layout.tiltDeg ?? 0;

  const gridMainW = layout.grid?.main ?? 0.7;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {/* FILL layer */}
      {layout.fill === 'blur' && (
        <>
          <Media box={{...coverBox, left: coverBox.left - width * (layout.fillZoom ?? 0) / 2, top: coverBox.top - height * (layout.fillZoom ?? 0) / 2, width: coverBox.width * (1 + (layout.fillZoom ?? 0)), height: coverBox.height * (1 + (layout.fillZoom ?? 0))}} extra={`blur(${layout.blurPx ?? 60}px) brightness(${1 - (layout.darkenFill ?? 0.45)})`} />
        </>
      )}
      {layout.fill === 'solid' && (
        <AbsoluteFill style={{background: layout.fillColor ?? '#0a0806'}} />
      )}
      {layout.fill === 'gradient' && (
        <AbsoluteFill style={{background: `linear-gradient(90deg, ${layout.gradientFrom ?? 'rgba(16,10,12,0.9)'}, ${layout.gradientTo ?? 'rgba(16,10,12,0.1)'})`}} />
      )}

      {/* GRID variants */}
      {layout.grid?.mode === 'h2' && nextSeg ? (
        <AbsoluteFill style={{transform: `rotate(${tilt}deg)`}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: width / 2 - (layout.grid.gap ?? 0) * width, height}}>
            <Media box={fitBox(m.width, m.height, width / 2, height, 'cover')} />
          </div>
          <div style={{position: 'absolute', left: width / 2 + (layout.grid.gap ?? 0) * width, top: 0, width: width / 2, height}}>
            <Media box={fitBox(nextSeg.media.width, nextSeg.media.height, width / 2, height, 'cover')} />
          </div>
        </AbsoluteFill>
      ) : layout.grid?.mode === 'v3' && nextSeg ? (
        <AbsoluteFill style={{transform: `rotate(${tilt}deg)`}}>
          <div style={{position: 'absolute', left: 0, top: 0, width, height: height / 3 - 4}}>
            <Media box={fitBox(m.width, m.height, width, height / 3, 'cover')} />
          </div>
          <div style={{position: 'absolute', left: 0, top: height / 3, width, height: height / 3 - 4}}>
            <Media box={fitBox(nextSeg.media.width, nextSeg.media.height, width, height / 3, 'cover')} />
          </div>
          <div style={{position: 'absolute', left: 0, top: (2 * height) / 3, width, height: height / 3}}>
            <Media box={fitBox(m.width, m.height, width, height / 3, 'cover')} />
          </div>
        </AbsoluteFill>
      ) : layout.grid?.mode === 'offset_pair' && nextSeg ? (
        <AbsoluteFill style={{transform: `rotate(${tilt}deg)`}}>
          <Media box={fitBox(m.width, m.height, width * gridMainW, height * gridMainW * (m.height / m.width) > height * 0.62 ? height * 0.62 : height * 0.62, 'cover')} />
          <div style={{
            position: 'absolute', right: width * 0.05, bottom: height * 0.16,
            width: width * (1 - gridMainW), height: height * 0.28, overflow: 'hidden',
            borderRadius: width * 0.02, boxShadow: '0 18px 60px rgba(0,0,0,0.5)', transform: 'rotate(3deg)',
          }}>
            <Media box={fitBox(nextSeg.media.width, nextSeg.media.height, width * (1 - gridMainW), height * 0.28, 'cover')} />
          </div>
        </AbsoluteFill>
      ) : (
        /* PRIMARY media */
        <div style={{position: 'absolute', inset: 0, transform: `rotate(${tilt}deg)`}}>
          <Media box={layout.fit === 'cover' ? coverBox : containBox} />
        </div>
      )}

      {/* FRAME variants */}
      {layout.frame?.sprockets ? <Sprockets width={width} height={height} /> : null}
      {layout.frame?.feather ? (
        <AbsoluteFill style={{
          background: 'radial-gradient(ellipse 78% 72% at 50% 50%, transparent 62%, rgba(8,6,8,0.9) 100%)',
        }} />
      ) : null}
      {layout.frame?.matte ? (
        <AbsoluteFill style={{border: `${height * 0.002}px solid ${layout.frame.line ?? 'transparent'}`, borderRadius: layout.frame.arch ? '50% 50% 0 0 / 34% 34% 0 0' : 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)', pointerEvents: 'none'}} />
      ) : null}
    </AbsoluteFill>
  );
};

const Sprockets: React.FC<{width: number; height: number}> = ({width, height}) => {
  const holeW = width * 0.035;
  const holeH = height * 0.018;
  const gap = width * 0.02;
  const holes = Math.floor(width / (holeW + gap));
  const bar = (top: boolean) => (
    <div key={String(top)} style={{position: 'absolute', left: 0, right: 0, [top ? 'top' : 'bottom']: 0, height: height * 0.06, background: 'rgba(4,3,3,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap}}>
      {Array.from({length: holes}).map((_, i) => (
        <div key={i} style={{width: holeW, height: holeH, borderRadius: 4, background: 'rgba(235,230,220,0.85)'}} />
      ))}
    </div>
  );
  return <>{bar(true)}{bar(false)}</>;
};
