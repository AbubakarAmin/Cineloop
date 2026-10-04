/** Font loading — OFL fonts bundled in assets/fonts, registered once in Root. */
import {staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';

export const FONT_STACKS: Record<string, string> = {
  manrope: "'Manrope', 'Carlito', sans-serif",
  playfair: "'Playfair Display', 'Tinos', serif",
  playfair_italic: "'Playfair Display Italic', 'Tinos', serif",
  caveat: "'Caveat', 'Comic Sans MS', cursive",
  bebas: "'Bebas Neue', 'Oswald', sans-serif",
  cormorant: "'Cormorant Garamond', 'Tinos', serif",
  space: "'Space Grotesk', 'Carlito', sans-serif",
};

const FACES: Array<{family: string; file: string; weight: number; style?: string}> = [
  {family: 'Manrope', file: 'Manrope.ttf', weight: 800},
  {family: 'Playfair Display', file: 'PlayfairDisplay.ttf', weight: 600},
  {family: 'Playfair Display Italic', file: 'PlayfairDisplay-Italic.ttf', weight: 600, style: 'italic'},
  {family: 'Caveat', file: 'Caveat.ttf', weight: 600},
  {family: 'Bebas Neue', file: 'BebasNeue.ttf', weight: 400},
  {family: 'Cormorant Garamond', file: 'CormorantGaramond.ttf', weight: 600},
  {family: 'Space Grotesk', file: 'SpaceGrotesk.ttf', weight: 700},
];

let loaded = false;

export const loadLoomFonts = (): void => {
  if (loaded) return;
  loaded = true;
  for (const f of FACES) {
    loadFont({
      family: f.family,
      url: staticFile(`assets/fonts/${f.file}`),
      weight: String(f.weight) as `${number}`,
      style: (f.style ?? 'normal') as 'normal' | 'italic',
    }).catch(() => {
      /* font missing — stack fallback takes over */
    });
  }
};
