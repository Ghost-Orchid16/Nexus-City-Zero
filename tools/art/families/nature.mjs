// Trees, bushes and flowers. Canopies are blobs shaded by a light vector from the upper left,
// broken into leaf clusters so large areas never read as smooth gradients or noise.
import { PixelCanvas, RAMPS, INK, hash2 } from '../lib/draw.mjs';

const SPECIES = {
  oak: { leaf: RAMPS.green, trunk: RAMPS.brown },
  lime: { leaf: RAMPS.lime, trunk: RAMPS.brown },
  blossom: { leaf: RAMPS.magenta, trunk: RAMPS.brown },
  autumn: { leaf: RAMPS.orange, trunk: RAMPS.brown },
  teal: { leaf: RAMPS.teal, trunk: RAMPS.brown }
};

/** Shade a canopy pixel from its normalized position inside the blob. */
function canopyTone(nx, ny, x, y, seed) {
  const light = -(nx * 0.55 + ny * 0.85) + (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.35;
  if (light > 0.55) return 4;
  if (light > 0.12) return 3;
  if (light > -0.4) return 2;
  return 1;
}

export function makeTree(kind = 'oak', size = 1, seed = 1) {
  const { leaf, trunk } = SPECIES[kind];
  const cw = Math.round(14 * size);
  const ch = Math.round(12 * size);
  const W = cw + 4;
  const H = ch + Math.round(6 * size) + 3;
  const c = new PixelCanvas(W, H);
  const cx = W / 2;
  const cy = 2 + ch / 2;
  // trunk
  const tx = Math.floor(cx) - 1;
  c.fillRect(tx, cy + ch * 0.25, 2, H - 2 - (cy + ch * 0.25), trunk[2]);
  c.vline(tx + 1, Math.ceil(cy + ch * 0.25), H - 3, trunk[1]);
  // canopy blob = union of ovals
  const lobes = [
    [cx - cw * 0.5, cy - ch * 0.25, cw * 0.62, ch * 0.62],
    [cx - cw * 0.12, cy - ch * 0.5, cw * 0.62, ch * 0.66],
    [cx - cw * 0.45, cy - ch * 0.05, cw * 0.95, ch * 0.55]
  ];
  const inside = (x, y) => lobes.some(([lx, ly, lw, lh]) => {
    const nx = (x + 0.5 - (lx + lw / 2)) / (lw / 2);
    const ny = (y + 0.5 - (ly + lh / 2)) / (lh / 2);
    return nx * nx + ny * ny <= 1;
  });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const nx = (x + 0.5 - cx) / (cw / 2);
      const ny = (y + 0.5 - cy) / (ch / 2);
      c.set(x, y, leaf[canopyTone(nx, ny, x, y, seed)]);
    }
  }
  // a few bright leaf sparkles on the lit side
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const col = c.get(x, y);
    if (col[3] && hash2(x, y, seed + 9) < 0.05 && x < cx && y < cy) c.set(x, y, leaf[4]);
  }
  c.outline(INK);
  return c;
}

export function makePine(size = 1, seed = 1) {
  const leaf = RAMPS.teal;
  const W = Math.round(12 * size) + 2;
  const H = Math.round(20 * size) + 2;
  const c = new PixelCanvas(W, H);
  const cx = W / 2;
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const top = 1 + t * Math.round(5 * size);
    const bottom = top + Math.round(8 * size);
    const halfW = (W / 2 - 1) * (0.55 + t * 0.2);
    c.fillPoly([[cx, top], [cx + halfW, bottom], [cx - halfW, bottom]], leaf[2]);
    // lit left flank
    c.fillPoly([[cx, top], [cx, bottom], [cx - halfW, bottom]], leaf[3]);
    c.hline(Math.round(cx - halfW), Math.round(cx + halfW) - 1, bottom - 1, leaf[1]);
  }
  c.fillRect(Math.floor(cx) - 1, H - 4, 2, 3, RAMPS.brown[1]);
  c.outline(INK);
  void seed;
  return c;
}

export function makeBush(kind = 'oak', seed = 2) {
  const { leaf } = SPECIES[kind];
  const c = new PixelCanvas(12, 8);
  const inside = (x, y) => {
    const a = ((x + 0.5 - 4) / 4) ** 2 + ((y + 0.5 - 4.5) / 3.5) ** 2 <= 1;
    const b = ((x + 0.5 - 7.5) / 4) ** 2 + ((y + 0.5 - 4) / 3.5) ** 2 <= 1;
    return a || b;
  };
  for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) {
    if (!inside(x, y)) continue;
    c.set(x, y, leaf[canopyTone((x - 6) / 6, (y - 4) / 4, x, y, seed)]);
  }
  c.outline(INK);
  return c;
}

/** Small flower bed patch for gardens and plazas. */
export function makeFlowerBed(seed = 3) {
  const c = new PixelCanvas(12, 6);
  c.fillRect(0, 1, 12, 5, RAMPS.brown[2]);
  c.hline(0, 11, 1, RAMPS.brown[3]);
  const colors = [RAMPS.coral[3], RAMPS.yellow[3], RAMPS.magenta[3], RAMPS.cream[4], RAMPS.violet[3]];
  for (let x = 1; x < 11; x += 2) {
    const col = colors[Math.floor(hash2(x, 0, seed) * colors.length)];
    c.set(x, 2, RAMPS.green[3]);
    c.set(x, 1, col);
    c.set(x + 1, 3, RAMPS.green[2]);
    c.set(x + 1, 2, colors[Math.floor(hash2(x, 1, seed) * colors.length)]);
  }
  c.outline(INK);
  return c;
}

/** Soft oval ground shadow sprite (drawn at low alpha in-game). */
export function makeShadow(w, h) {
  const c = new PixelCanvas(w, h);
  c.fillOval(0, 0, w, h, RAMPS.plum[0]);
  return c;
}
