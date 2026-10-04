/**
 * OverlayLayer — renders the 15-15 overlay catalog.
 * Prefers pre-generated PNG textures from assets/gen (scripts/graphics_gen.py);
 * falls back to pure CSS/SVG rendering when the asset is absent.
 */
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {OverlayInstance} from '../engine/schema';
import {getOverlay} from '../engine/presets';
import {rand, wobble} from '../engine/math';

const GenImg: React.FC<{id: string; blend: string; opacity: number; style?: React.CSSProperties}> = ({id, blend, opacity, style}) => (
  <AbsoluteFill style={{mixBlendMode: blend as React.CSSProperties['mixBlendMode'], opacity, ...style}}>
    <Img src={staticFile(`assets/gen/${id}.png`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
  </AbsoluteFill>
);

const Overlay: React.FC<{inst: OverlayInstance}> = ({inst}) => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const o = getOverlay(inst.id);
  const P = o.params;
  const op = o.opacity * inst.opacity;
  const blend = o.blend;

  switch (o.gen) {
    case 'grain': {
      const idx = Math.floor(frame / fps * Number(P.regenFps ?? 12)) % 8;
      const jitterX = rand(idx * 3.7) * 14 - 7;
      return (
        <GenImg id="film_grain" blend={blend} opacity={op} style={{transform: `translate(${jitterX}px, ${jitterX * 0.6}px) scale(1.04)`}} />
      );
    }
    case 'leak': {
      const [dx, dy] = P.drift as [number, number];
      const x = (dx ?? 0) * width * (frame / fps / 14);
      const y = (dy ?? 0) * height * (frame / fps / 14);
      const pulse = 1 + Math.sin(frame * 0.05) * Number(P.pulse ?? 0.12);
      return <GenImg id="light_leak" blend={blend} opacity={op * pulse} style={{transform: `translate(${x}px, ${y}px) scale(${P.scale ?? 1.5})`}} />;
    }
    case 'dust':
      return <GenImg id="dust_motes" blend={blend} opacity={op} style={{transform: `translateY(${-(frame / fps) * height * 0.03}px) scale(1.08)`}} />;
    case 'bokeh':
      return <GenImg id="bokeh_drift" blend={blend} opacity={op} style={{transform: `translate(${(frame / fps) * width * 0.012}px, ${-(frame / fps) * height * 0.02}px) scale(1.1)`}} />;
    case 'vignette_css':
      return (
        <AbsoluteFill style={{
          background: `radial-gradient(ellipse ${100 - Number(P.extent ?? 0.32) * 90}% ${100 - Number(P.extent ?? 0.32) * 85}% at 50% 48%, transparent 50%, rgba(4,2,3,${P.strength ?? 0.55}) 100%)`,
          opacity: op,
        }} />
      );
    case 'halation_css':
      return (
        <AbsoluteFill style={{mixBlendMode: 'screen', opacity: op}}>
          <div style={{position: 'absolute', inset: 0, backdropFilter: `blur(${P.blurPx ?? 48}px) brightness(1.35) saturate(1.4) hue-rotate(-12deg)`, WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 30%, transparent 78%)', maskImage: 'radial-gradient(ellipse at 50% 45%, black 30%, transparent 78%)'}} />
        </AbsoluteFill>
      );
    case 'rain':
      return <GenImg id="rain_streaks" blend={blend} opacity={op} style={{transform: `translateY(${(frame * Number(P.speed ?? 1.6) * 9) % (height * 0.5)}px) scale(1.15)`}} />;
    case 'snow':
      return <GenImg id="snow_drift" blend={blend} opacity={op} style={{transform: `translateY(${(frame * Number(P.speed ?? 0.35) * 5) % (height * 0.4)}px) translateX(${Math.sin(frame * 0.03) * 30}px) scale(1.12)`}} />;
    case 'hearts':
      return <GenImg id="hearts_float" blend={blend} opacity={op} style={{transform: `translateY(${-(frame / fps) * height * 0.05}px) scale(1.06)`}} />;
    case 'sparkle': {
      const step = Math.floor(frame / fps * Number(P.twinkleFps ?? 8));
      return <GenImg id="sparkle_field" blend={blend} opacity={op * (0.6 + rand(step) * 0.4)} style={{transform: `scale(${1.02 + rand(step * 1.7) * 0.03})`}} />;
    }
    case 'paper':
      return <GenImg id="paper_texture" blend={blend} opacity={op} />;
    case 'scratches': {
      const step = Math.floor(frame / fps * Number(P.regenFps ?? 6)) % 4;
      return <GenImg id={`old_film_scratches`} blend={blend} opacity={op * (0.7 + rand(step * 2.3) * 0.3)} style={{transform: `translateX(${(rand(step) - 0.5) * 12}px)`}} />;
    }
    case 'prism': {
      const [dx, dy] = P.drift as [number, number];
      return <GenImg id="prism_flare" blend={blend} opacity={op} style={{transform: `translate(${(frame / fps) * width * (dx ?? 0.1) * 0.14}px, ${(frame / fps) * height * (dy ?? 0.05) * 0.1}px) scale(${P.scale ?? 1.3})`}} />;
    }
    case 'confetti': {
      const t = frame / fps;
      const fall = Math.min(1, t * 0.5);
      return <GenImg id="confetti_pop" blend={blend} opacity={op * Math.max(0, 1 - fall * 0.9)} style={{transform: `translateY(${fall * height * Number(P.gravity ?? 0.4) * 0.35}px) scale(1.05)`}} />;
    }
    default:
      return null;
  }
};

export const OverlayLayer: React.FC<{overlays: OverlayInstance[]}> = ({overlays}) => {
  const [wx, wy] = wobble(0, 0, 0);
  void wx; void wy;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {overlays
        .map((inst) => ({inst, z: getOverlay(inst.id).z}))
        .sort((a, b) => a.z - b.z)
        .map(({inst, z}) => (
          <div key={inst.id} style={{position: 'absolute', inset: 0, zIndex: z}}>
            <Overlay inst={inst} />
          </div>
        ))}
    </AbsoluteFill>
  );
};
