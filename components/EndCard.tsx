/** EndCard — closing card over a blurred still of the last photo. */
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {EndCard as EndCardT} from '../engine/schema';
import {ease} from '../engine/math';

export const EndCardView: React.FC<{card: EndCardT}> = ({card}) => {
  const frame = useCurrentFrame();
  const {height, width} = useVideoConfig();
  const local = frame - card.startF;
  if (local < 0) return null;
  const e = ease('easeOutCubic', local / 24);
  const eTitle = ease('easeOutCubic', (local - 10) / 24);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: Math.min(1, e)}}>
      {card.bgSrc ? (
        <>
          <Img src={staticFile(card.bgSrc)} style={{position: 'absolute', width: '120%', height: '120%', left: '-10%', top: '-10%', objectFit: 'cover', filter: 'blur(46px) brightness(0.42)'}} />
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, rgba(12,8,9,0.25), rgba(8,5,6,0.8))'}} />
        </>
      ) : (
        <AbsoluteFill style={{background: '#0c0809'}} />
      )}
      <div style={{position: 'relative', textAlign: 'center', opacity: Math.min(1, eTitle)}}>
        {card.monogram ? (
          <div style={{
            width: width * 0.12, height: width * 0.12, margin: '0 auto', marginBottom: height * 0.03,
            borderRadius: '50%', border: '1px solid rgba(212,175,122,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#d4af7a', fontFamily: "'Cormorant Garamond', serif", fontSize: width * 0.045, letterSpacing: '0.08em',
          }}>{card.monogram}</div>
        ) : null}
        <div style={{color: '#f5efe6', fontFamily: "'Playfair Display', 'Tinos', serif", fontWeight: 600, fontSize: height * 0.048, letterSpacing: '0.02em', textShadow: '0 2px 26px rgba(0,0,0,0.5)'}}>
          {card.title}
        </div>
        {card.subtitle ? (
          <div style={{color: 'rgba(245,239,230,0.75)', fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: height * 0.02, marginTop: height * 0.016, letterSpacing: '0.06em', textTransform: 'uppercase'}}>
            {card.subtitle}
          </div>
        ) : null}
        {card.date ? (
          <div style={{color: '#d4af7a', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: height * 0.016, marginTop: height * 0.02, letterSpacing: '0.22em', textTransform: 'uppercase'}}>
            {card.date}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
