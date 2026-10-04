/** SfxLayer — tasteful impact hits at hard cuts, from the bundled CC0 library. */
import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import type {LoomData} from '../engine/schema';

export const SfxLayer: React.FC<{data: LoomData}> = ({data}) => (
  <>
    {data.sfx.map((hit, i) => (
      <Sequence key={i} from={Math.max(0, hit.frame)} name={`sfx-${i}`}>
        <Audio src={staticFile(`assets/sfx/${hit.file}`)} volume={hit.gain} />
      </Sequence>
    ))}
  </>
);
