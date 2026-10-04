/** Cover/contain fit math for a media box. */
export interface BoxFit {
  width: number;
  height: number;
  left: number;
  top: number;
}

export const fitBox = (
  mediaW: number,
  mediaH: number,
  boxW: number,
  boxH: number,
  mode: 'cover' | 'contain',
  focus: [number, number] = [0.5, 0.5],
  extraScale = 1,
): BoxFit => {
  const mr = mediaW / mediaH;
  const br = boxW / boxH;
  let w: number;
  let h: number;
  if (mode === 'cover' ? mr > br : mr < br) {
    // match height
    h = boxH * extraScale;
    w = h * mr;
  } else {
    w = boxW * extraScale;
    h = w / mr;
  }
  let left = (boxW - w) / 2;
  let top = (boxH - h) / 2;
  if (mode === 'cover') {
    // focus bias: focus 0..1 -> shift crop window
    const overX = w - boxW;
    const overY = h - boxH;
    left -= overX * (focus[0] - 0.5);
    top -= overY * (focus[1] - 0.5);
  }
  return {width: w, height: h, left, top};
};

/** parse "9:16" -> [9,16] */
export const parseAspect = (a: string): [number, number] => {
  const [x, y] = a.split(':').map(Number);
  return [x || 9, y || 16];
};
