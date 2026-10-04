/**
 * LyricTrack — renders lyric lines through one of 15 typography presets:
 * gradient/glow/solid/outline keywords, 13 entrance kinds, karaoke fill,
 * backdrops (letterbox / paper / chip).
 */
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import type {LoomData, LyricLine} from '../engine/schema';
import {getTypography} from '../engine/presets';
import {FONT_STACKS} from '../engine/fonts';
import {ease, rand} from '../engine/math';

const strip = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');

const KeywordSpan: React.FC<{word: string; typId: string; lit: number}> = ({word, typId, lit}) => {
  const t = getTypography(typId);
  const isKw = t.keywords && strip(word).length > 0;
  const base: React.CSSProperties = {};
  if (t.keywords.style === 'gradient') {
    base.backgroundImage = `linear-gradient(105deg, ${t.keywords.from}, ${t.keywords.to})`;
    base.WebkitBackgroundClip = 'text';
    base.backgroundClip = 'text';
    base.color = 'transparent';
    base.textShadow = 'none';
  } else if (t.keywords.style === 'glow') {
    base.color = t.keywords.color ?? '#fff';
    base.textShadow = `0 0 18px ${t.keywords.glowColor ?? 'rgba(255,255,255,0.8)'}, 0 0 42px ${t.keywords.glowColor ?? 'transparent'}`;
  } else if (t.keywords.style === 'outline') {
    base.color = 'transparent';
    base.WebkitTextStroke = `2px ${t.keywords.color ?? '#fff'}`;
  } else if (t.keywords.style === 'solid') {
    base.color = t.keywords.color ?? '#fff';
  }
  // dim future words for karaoke style
  const op = t.entrance.kind === 'karaoke' ? 0.25 + 0.75 * lit : 1;
  return <span style={{...base, opacity: op}}>{word}</span>;
};

const Line: React.FC<{line: LyricLine; typId: string; data: LoomData}> = ({line, typId, data}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = getTypography(typId);
  const ent = t.entrance;
  const dF = Math.max(1, ent.durF);
  const eIn = ease('easeOutCubic', frame / dF);

  let style: React.CSSProperties = {
    fontFamily: FONT_STACKS[t.font] ?? FONT_STACKS.manrope,
    fontWeight: t.weight,
    fontSize: height * 0.052 * t.sizeFactor,
    letterSpacing: `${t.tracking}em`,
    textTransform: t.transform as React.CSSProperties['textTransform'],
    color: t.color,
    textShadow: t.shadow === 'none' ? undefined : t.shadow,
    textAlign: 'center' as const,
    lineHeight: 1.28,
    padding: `0 ${width * 0.08}px`,
    opacity: 1,
  };

  switch (ent.kind) {
    case 'fade': style.opacity = eIn; break;
    case 'fade_up':
    case 'slide_up':
      style.opacity = eIn;
      style.transform = `translateY(${(1 - eIn) * (ent.risePx ?? 24)}px)`;
      break;
    case 'blur_in':
      style.opacity = eIn;
      style.filter = `blur(${(1 - eIn) * 14}px)`;
      break;
    case 'wobble_in':
      style.opacity = eIn;
      style.transform = `rotate(${Math.sin(frame * 0.7) * 2.4 * (1 - eIn)}deg) scale(${0.92 + 0.08 * eIn})`;
      break;
    case 'letter_cascade':
      style.letterSpacing = `${t.tracking + (1 - eIn) * 0.12}em`;
      style.opacity = eIn;
      break;
    case 'flicker_in':
      style.opacity = eIn * (0.55 + rand(frame * 3.1) * 0.45);
      break;
    case 'typewriter': {
      const chars = Math.floor((frame / Math.max(1, ent.durF)) * line.text.length);
      style.opacity = 1;
      return (
        <div style={style}>
          {line.text.slice(0, chars)}
          {ent.caret && frame % 16 < 8 ? <span style={{opacity: 0.8}}>|</span> : null}
        </div>
      );
    }
    case 'karaoke':
      style.opacity = 1;
      break;
    case 'stamp_in':
      style.opacity = eIn;
      style.transform = `scale(${1.25 - 0.25 * eIn}) rotate(-2deg)`;
      break;
    case 'slide_side':
      style.opacity = eIn;
      style.transform = `translateX(${(1 - eIn) * width * 0.08}px)`;
      break;
    case 'scale_in':
      style.opacity = eIn;
      style.transform = `scale(${0.8 + 0.2 * ease('easeOutBack', frame / dF)})`;
      break;
    case 'drift_in':
      style.opacity = eIn;
      style.transform = `translateY(${(1 - eIn) * 12}px) rotate(${(1 - eIn) * -1.2}deg)`;
      break;
    default:
      style.opacity = eIn;
  }

  // fade-out in last 8 frames of the line
  const remain = line.endF - line.startF - frame;
  if (remain < 8) style.opacity = Math.max(0, remain / 8) * (style.opacity as number);

  // karaoke per-word progress
  const words = line.text.split(/\s+/);
  const lineDurT = (line.endF - line.startF) / fps;

  const positionStyle: Record<string, React.CSSProperties> = {
    center: {justifyContent: 'center', alignItems: 'center'},
    lower_third: {justifyContent: 'center', alignItems: 'flex-end', paddingBottom: height * 0.16},
    bottom: {justifyContent: 'center', alignItems: 'flex-end', paddingBottom: height * 0.055},
    top_left: {justifyContent: 'flex-start', alignItems: 'flex-start', padding: `${height * 0.06}px ${width * 0.06}px`},
    right_edge: {justifyContent: 'flex-end', alignItems: 'center', paddingRight: width * 0.03},
  };
  const pos = positionStyle[t.position] ?? positionStyle.center;

  const backdrop = (() => {
    if (t.backdrop === 'paper') {
      return {background: 'linear-gradient(180deg, rgba(246,241,231,0.94), rgba(238,230,216,0.9))', padding: `${height * 0.014}px ${width * 0.035}px`, borderRadius: 6, boxShadow: '0 6px 24px rgba(0,0,0,0.25)'};
    }
    if (t.backdrop === 'chip') {
      return {background: 'rgba(12,9,10,0.55)', padding: `${height * 0.008}px ${width * 0.02}px`, borderRadius: 999, backdropFilter: 'blur(6px)'};
    }
    return {};
  })();

  const inner = (
    <div style={{...style, ...backdrop, maxWidth: width * 0.9}}>
      {words.map((w, i) => {
        const wordStartT = (i / words.length) * lineDurT;
        const lit = ent.kind === 'karaoke'
          ? Math.min(1, Math.max(0, (frame / fps - wordStartT) / Math.max(0.12, lineDurT / words.length)))
          : line.keywords.map(strip).includes(strip(w)) ? 1 : 0;
        const isVertical = t.position === 'right_edge';
        return (
          <span key={i} style={isVertical ? {writingMode: 'vertical-rl', margin: '0 2px'} : {display: 'inline-block', margin: '0 0.09em', whiteSpace: 'pre'}}>
            <KeywordSpan word={w} typId={typId} lit={lit} />
          </span>
        );
      })}
    </div>
  );

  return (
    <AbsoluteFill style={{display: 'flex', flexDirection: 'column', ...pos, pointerEvents: 'none'}}>
      {t.backdrop === 'letterbox' ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: height * 0.09, background: '#000'}} />
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.09, background: '#000'}} />
        </>
      ) : null}
      {inner}
    </AbsoluteFill>
  );
};

export const LyricTrack: React.FC<{data: LoomData}> = ({data}) => {
  const typId = data.style.typography;
  return (
    <AbsoluteFill style={{zIndex: 55, pointerEvents: 'none'}}>
      {data.lyrics.map((l, i) => (
        <Sequence key={i} from={l.startF} durationInFrames={Math.max(1, l.endF - l.startF)} name={`lyric-${i}`}>
          <Line line={l} typId={typId} data={data} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
