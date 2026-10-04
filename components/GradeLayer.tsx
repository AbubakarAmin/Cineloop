/** GradeLayer — applies a grade preset (filters, tint, shadow-lift, vignette). */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {GradePreset} from '../engine/presets';

export const gradeFilterString = (g: GradePreset): string => {
  const f = g.filters;
  const parts: string[] = [];
  if (f.brightness) parts.push(`brightness(${f.brightness})`);
  if (f.contrast) parts.push(`contrast(${f.contrast})`);
  if (f.saturate) parts.push(`saturate(${f.saturate})`);
  if (f['hue-rotate']) parts.push(`hue-rotate(${f['hue-rotate']}deg)`);
  if (f.sepia) parts.push(`sepia(${f.sepia})`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale})`);
  return parts.join(' ');
};

export const GradeLayer: React.FC<{grade: GradePreset; children: React.ReactNode}> = ({grade, children}) => (
  <AbsoluteFill style={{filter: gradeFilterString(grade)}}>
    <AbsoluteFill>{children}</AbsoluteFill>
    {grade.lift.opacity > 0 ? (
      <AbsoluteFill style={{background: grade.lift.color, opacity: grade.lift.opacity, mixBlendMode: 'lighten', pointerEvents: 'none'}} />
    ) : null}
    {grade.tint.opacity > 0 ? (
      <AbsoluteFill style={{background: grade.tint.color, opacity: grade.tint.opacity, mixBlendMode: grade.tint.blend as React.CSSProperties['mixBlendMode'], pointerEvents: 'none'}} />
    ) : null}
    {grade.vignette > 0 ? (
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse ${100 - grade.vignette * 55}% ${100 - grade.vignette * 50}% at 50% 48%, transparent 55%, rgba(5,3,4,${(grade.vignette * 0.75).toFixed(2)}) 100%)`,
        pointerEvents: 'none',
      }} />
    ) : null}
  </AbsoluteFill>
);
