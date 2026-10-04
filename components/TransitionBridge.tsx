/**
 * TransitionBridge — renders the 15-15 catalog transition between two segments.
 * Window: centered on the boundary frame; prev card fades/moves out, next card in.
 */
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {LoomData, Segment} from '../engine/schema';
import {getTransition} from '../engine/presets';
import {rand} from '../engine/math';
import {fitBox} from './fit';
import {computeMotionT} from './MediaCard';

interface BridgeProps {
  data: LoomData;
  prev: Segment;
  next: Segment;
  durF: number;
  transitionId: string;
}

export const TransitionBridge: React.FC<BridgeProps> = ({data, prev, next, durF, transitionId}) => {
  const {width, height, fps} = useVideoConfig();
  const t = getTransition(transitionId);
  const P = t.params as Record<string, number | string>;
  const kind = t.kind;

  const BridgeMedia: React.FC<{seg: Segment; localF: number; style: React.CSSProperties}> = ({seg, localF, style}) => {
    const m = seg.media;
    const mt = computeMotionT(seg.motion, Math.min(1, Math.max(0, localF / Math.max(1, seg.durF))), seg.durF, 0, seg.index * 17.31);
    const inner: React.CSSProperties = {
      position: 'absolute',
      transform: `scale(${mt.scale}) translate(${mt.tx * 100}%, ${mt.ty * 100}%) rotate(${mt.rot}deg)`,
      transformOrigin: 'center center',
    };
    const box = fitBox(m.width, m.height, width, height, 'cover', [0.5, 0.45]);
    const common: React.CSSProperties = {
      ...style,
      position: 'absolute',
      overflow: 'hidden',
    };
    const mediaEl = m.type === 'video' ? (
      <OffthreadVideo
        src={staticFile(m.src)}
        style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, ...inner}}
        muted
        playbackRate={m.speed ?? 1}
        startFrom={Math.round(((m.trimInSec ?? 0) + Math.max(0, localF) / fps) * (m.fps ?? 30))}
      />
    ) : (
      <Img src={staticFile(m.src)} style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, ...inner}} />
    );
    return <div style={common}>{mediaEl}</div>;
  };

  const f = useCurrentFrame();
  const p = Math.min(1, Math.max(0, f / Math.max(1, durF)));
  const prevLocal = prev.durF - durF / 2 + f;
  const nextLocal = f - durF / 2;

  const dirSign = ((P.dir as string) === 'left' ? -1 : 1);
  const W = width;
  const H = height;

  // defaults: prev fully visible below, next on top fading in
  let prevStyle: React.CSSProperties = {opacity: 1};
  let nextStyle: React.CSSProperties = {opacity: p};
  let veil: React.CSSProperties | null = null;
  let nextClip: string | undefined;

  switch (kind) {
    case 'dissolve':
      veil = {background: '#fff', opacity: Math.sin(p * Math.PI) * Number(P.bloom ?? 0.35) * 0.25};
      break;
    case 'whip': {
      const dx = dirSign * W * 1.1;
      prevStyle = {transform: `translateX(${-p * dx}px)`, filter: `blur(${Number(P.blurPx ?? 22) * Math.sin(p * Math.PI)}px)`, opacity: 1 - p * 0.9};
      nextStyle = {transform: `translateX(${(1 - p) * dx}px)`, filter: `blur(${Number(P.blurPx ?? 22) * Math.sin(p * Math.PI)}px)`, opacity: 0.2 + 0.8 * p};
      break;
    }
    case 'leak_wipe': {
      const x = -W * 0.35 + p * W * 1.7;
      nextClip = 'inset(0 0 0 0)';
      nextStyle = {opacity: 1, WebkitMaskImage: `linear-gradient(100deg, black ${((x / W) * 100).toFixed(1)}%, transparent ${(((x + W * 0.35) / W) * 100).toFixed(1)}%)`, maskImage: `linear-gradient(100deg, black ${((x / W) * 100).toFixed(1)}%, transparent ${(((x + W * 0.35) / W) * 100).toFixed(1)}%)`};
      veil = {background: `radial-gradient(ellipse 45% 120% at ${((x / W) * 100).toFixed(1)}% 50%, rgba(255,164,88,0.75), rgba(255,120,60,0.28) 55%, transparent 75%)`, opacity: Math.sin(p * Math.PI)};
      break;
    }
    case 'zoom_punch':
      prevStyle = {transform: `scale(${1 + Number(P.scaleTo ?? 1.22) * p})`, filter: `blur(${Number(P.blurPx ?? 10) * p}px)`, opacity: 1 - p};
      nextStyle = {transform: `scale(${Number(P.scaleTo ?? 1.22) * (1 - p) + p})`, opacity: p};
      break;
    case 'glitch': {
      const jump = Math.floor(rand(Math.floor(f * 2.7)) * 3);
      const slice = (n: number) => `inset(${n * 33.4}% 0 ${66.6 - n * 33.4}% 0)`;
      const off = Number(P.rgbSplit ?? 14) * (1 - p);
      nextStyle = {opacity: p > 0.45 ? 1 : 0, clipPath: slice(jump), transform: `translateX(${(jump - 1) * off * 0.4}px)`};
      prevStyle = {opacity: 1, filter: `hue-rotate(${jump * 40}deg) contrast(1.2)`};
      veil = {background: 'rgba(255,255,255,0.06)', opacity: Math.sin(p * Math.PI)};
      break;
    }
    case 'luma_fade':
      veil = {background: '#fdf7ec', opacity: Math.sin(p * Math.PI) * Number(P.peak ?? 0.85)};
      break;
    case 'burn':
      veil = {background: 'radial-gradient(circle at 50% 55%, #fff8e0 0%, #ffb347 38%, #b33c00 72%, #1a0600 100%)', opacity: Math.sin(p * Math.PI) * Number(P.hot ?? 0.9) * (0.75 + rand(f) * Number(P.flicker ?? 0.4) * 0.5)};
      break;
    case 'push': {
      const over = 1 + Number(P.overshoot ?? 0.08) * Math.sin(p * Math.PI);
      prevStyle = {transform: `translateX(${-p * W * over}px)`, opacity: 1};
      nextStyle = {transform: `translateX(${(1 - p) * W}px)`, opacity: 1};
      break;
    }
    case 'blur_dissolve':
      prevStyle = {filter: `blur(${Number(P.blurMax ?? 24) * p}px)`, opacity: 1 - p * 0.4};
      nextStyle = {filter: `blur(${Number(P.blurMax ?? 24) * (1 - p)}px)`, opacity: p};
      break;
    case 'spin':
      prevStyle = {transform: `rotate(${Number(P.deg ?? 90) * p}deg) scale(${1 + 0.25 * p})`, filter: `blur(${Number(P.blurPx ?? 16) * p}px)`, opacity: 1 - p};
      nextStyle = {transform: `rotate(${-Number(P.deg ?? 90) * (1 - p) * 0.3}deg)`, opacity: p};
      break;
    case 'mask_wipe': {
      const edge = (p * (1 + Number(P.softness ?? 0.18) * 2) - Number(P.softness ?? 0.18)) * 100;
      const ang = Number(P.angle ?? 25);
      nextStyle = {opacity: 1, WebkitMaskImage: `linear-gradient(${ang}deg, black ${edge - 14}%, transparent ${edge + 14}%)`, maskImage: `linear-gradient(${ang}deg, black ${edge - 14}%, transparent ${edge + 14}%)`};
      break;
    }
    case 'prismatic': {
      const prOffset = Number(P.offset ?? 18);
      nextStyle = {opacity: p};
      prevStyle = {opacity: 1 - p};
      break;
    }
    case 'heartbeat': {
      const thump = Math.sin(p * Math.PI * 4) * Number(P.pulse ?? 0.045) * Math.exp(-p * 2.2);
      prevStyle = {filter: `brightness(${1 + thump * 4})`, transform: `scale(${1 + thump})`, opacity: 1};
      const q = Math.max(0, (p - 0.72) / 0.28);
      nextStyle = {opacity: q * q * (3 - 2 * q)};
      veil = {background: 'rgba(255,235,225,0.5)', opacity: Math.abs(Math.sin(p * Math.PI * 2)) * Math.exp(-p * 3) * 0.8};
      break;
    }
    case 'gate': {
      const fl = 1 + (rand(f * 3.7) - 0.5) * Number(P.flicker ?? 0.5) * 0.9;
      const wv = Number(P.weave ?? 2.5);
      prevStyle = {filter: `brightness(${fl})`, transform: `translate(${(rand(f) - 0.5) * wv}px, ${(rand(f + 9) - 0.5) * wv}px)`, opacity: 1 - p};
      nextStyle = {opacity: p > 0.6 ? 1 : 0};
      veil = {background: '#000', opacity: rand(f * 1.9) * 0.25 * Math.sin(p * Math.PI)};
      break;
    }
    case 'ink': {
      const r = Math.max(W, H) * 0.75 * p * 1.8;
      const inkOp = p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
      const inkColor = (P.color as string) ?? '#120b10';
      nextStyle = {opacity: p > 0.5 ? 1 : 0};
      veil = {background: `radial-gradient(circle at 50% 50%, ${inkColor} 0%, ${inkColor} ${Math.min(100, (r / W) * 100)}%, transparent ${(Math.min(100, (r / W) * 100) + 18).toFixed(1)}%)`, opacity: Math.max(0, inkOp)};
      break;
    }
    default:
      break;
  }

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <BridgeMedia seg={prev} localF={prevLocal} style={prevStyle} />
      <div style={{position: 'absolute', inset: 0, ...nextStyle, clipPath: nextClip}}>
        <BridgeMedia seg={next} localF={nextLocal} style={{opacity: 1}} />
      </div>
      {kind === 'prismatic' ? (
        <>
          <BridgeMedia seg={next} localF={nextLocal} style={{opacity: p * 0.5, transform: `translateX(${-Number(P.offset ?? 18) * (1 - p)}px)`, filter: 'hue-rotate(-40deg) saturate(2)', mixBlendMode: 'screen'}} />
          <BridgeMedia seg={next} localF={nextLocal} style={{opacity: p * 0.5, transform: `translateX(${Number(P.offset ?? 18) * (1 - p)}px)`, filter: 'hue-rotate(40deg) saturate(2)', mixBlendMode: 'screen'}} />
        </>
      ) : null}
      {veil ? <AbsoluteFill style={veil} /> : null}
    </AbsoluteFill>
  );
};

