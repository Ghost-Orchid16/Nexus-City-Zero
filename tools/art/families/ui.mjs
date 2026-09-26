// UI kit: 9-slice cards/buttons/bars/badges (displayed at 3×) and the NEXUS logo.
// Labels and numbers stay code-native; this is only frames, fills and ornament.
import { PixelCanvas, RAMPS, INK, ditherOn } from '../lib/draw.mjs';

export const BUTTON_COLORS = ['teal', 'orange', 'violet', 'coral', 'green', 'yellow', 'magenta', 'blue', 'stone', 'red'];
export const FILL_COLORS = {
  energy: RAMPS.yellow, water: RAMPS.blue, health: RAMPS.coral, transport: RAMPS.orange,
  infrastructure: RAMPS.brown, safety: RAMPS.violet, communication: RAMPS.cyan, supplies: RAMPS.green,
  budget: RAMPS.magenta, red: RAMPS.red, teal: RAMPS.teal, good: RAMPS.teal, stone: RAMPS.stone
};

/** Rounded rectangle mask test with a pixel-art corner radius. */
function inRounded(x, y, w, h, r) {
  const cx = x < r ? r : x >= w - r ? w - r - 1 : x;
  const cy = y < r ? r : y >= h - r ? h - r - 1 : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r + r * 0.8;
}

/** Card: cream face, white inner highlight, darker lip at the bottom, ink outline. */
function card(w, h, face, { r = 3, lip = 2, highlight = RAMPS.cream[4], lipColor = RAMPS.cream[1] } = {}) {
  const c = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inRounded(x, y, w, h, r)) continue;
    const bottom = y >= h - lip;
    c.set(x, y, bottom ? lipColor : face);
  }
  // inner highlight on the top edge
  for (let x = 0; x < w; x++) for (let y = 0; y < h - lip; y++) {
    if (!c.opaque(x, y)) continue;
    if (!c.opaque(x, y - 1)) { c.set(x, y + 1, highlight); break; }
  }
  c.outline(INK);
  return c;
}

function button(ramp, state) {
  const w = 18;
  const h = 18;
  const c = new PixelCanvas(w, h);
  const lip = state === 'down' ? 1 : 3;
  const top = state === 'down' ? 2 : 0;
  const faceTone = state === 'hover' ? 4 : 3;
  for (let y = top; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inRounded(x, y - top, w, h - top, 4)) continue;
    const inLip = y >= h - lip;
    c.set(x, y, inLip ? (y === h - 1 ? ramp[0] : ramp[1]) : ramp[faceTone]);
  }
  // top highlight + left rim
  for (let x = 3; x < w - 3; x++) c.set(x, top + 1, state === 'hover' ? '#ffffff' : ramp[4]);
  for (let y = top + 3; y < h - lip - 2; y++) c.set(1, y, ramp[4]);
  // subtle lower face shade
  for (let x = 2; x < w - 2; x++) if (c.opaque(x, h - lip - 1)) c.set(x, h - lip - 1, ramp[2]);
  c.outline(INK);
  return c;
}

function barTrack() {
  const c = new PixelCanvas(12, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 12; x++) {
    if (!inRounded(x, y, 12, 10, 2)) continue;
    c.set(x, y, y <= 1 ? RAMPS.plum[0] : RAMPS.plum[1]);
  }
  c.outline(INK);
  return c;
}

function barFill(ramp) {
  const c = new PixelCanvas(8, 6);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
    if (!inRounded(x, y, 8, 6, 1)) continue;
    c.set(x, y, y === 0 ? ramp[4] : y === 1 ? ramp[3] : y >= 5 ? ramp[1] : ramp[2]);
  }
  return c;
}

function badge(ramp) {
  const c = new PixelCanvas(16, 16);
  c.fillOval(0, 0, 16, 16, ramp[2]);
  c.fillOval(1, 1, 14, 13, ramp[3]);
  c.set(4, 3, ramp[4]);
  c.set(5, 2, ramp[4]);
  c.set(3, 4, ramp[4]);
  c.outline(INK);
  return c;
}

function chip(ramp) {
  const c = new PixelCanvas(10, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    if (!inRounded(x, y, 10, 10, 3)) continue;
    c.set(x, y, y >= 8 ? ramp[2] : ramp[4]);
  }
  c.outline(ramp[1]);
  return c;
}

function selectFrame(ramp) {
  const c = new PixelCanvas(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!inRounded(x, y, 16, 16, 4)) continue;
    if (inRounded(x - 3, y - 3, 10, 10, 1) && x >= 3 && y >= 3 && x < 13 && y < 13) continue;
    c.set(x, y, (x + y) % 4 < 2 ? ramp[4] : ramp[3]);
  }
  c.outline(INK);
  return c;
}

function capsule() {
  const c = new PixelCanvas(20, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 20; x++) {
    if (!inRounded(x, y, 20, 16, 6)) continue;
    c.set(x, y, y >= 14 ? RAMPS.plum[0] : RAMPS.violet[0]);
  }
  for (let x = 5; x < 15; x++) c.set(x, 1, RAMPS.violet[2]);
  c.outline(INK);
  return c;
}

function dottedDivider() {
  const c = new PixelCanvas(8, 2);
  for (let x = 0; x < 8; x += 2) c.set(x, 0, RAMPS.cream[1]);
  return c;
}

function slash(ramp) {
  // diagonal hazard stripes, tileable (used on critical banners)
  const c = new PixelCanvas(8, 8);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) c.set(x, y, ((x + y) % 8) < 4 ? ramp[2] : RAMPS.plum[1]);
  return c;
}

// ------------------------------------------------------------------ logo
// Chunky 7×9 pixel glyphs for the wordmark.
const GLYPH = {
  N: ['##...##', '###..##', '####.##', '##.####', '##..###', '##...##', '##...##', '##...##', '##...##'],
  E: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '##.....', '##.....', '#######'],
  X: ['##...##', '##...##', '.##.##.', '..###..', '..###..', '.##.##.', '##...##', '##...##', '##...##'],
  U: ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '###.###', '.#####.'],
  S: ['.######', '##.....', '##.....', '.#####.', '.....##', '.....##', '.....##', '##...##', '######.'],
  C: ['.######', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '.######'],
  I: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '######'],
  T: ['#######', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..'],
  Y: ['##...##', '##...##', '.##.##.', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..'],
  Z: ['#######', '.....##', '....##.', '...##..', '..##...', '.##....', '##.....', '##.....', '#######'],
  R: ['######.', '##...##', '##...##', '######.', '##.##..', '##..##.', '##...##', '##...##', '##...##'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...', '...', '...']
};

function wordmark(text, { scale = 1, top, bottom, depth = 3, gap = 2 }) {
  const glyphs = [...text].map((ch) => GLYPH[ch]);
  const gw = glyphs.reduce((s, g) => s + g[0].length * scale + gap, -gap);
  const gh = 9 * scale;
  const W = gw + depth + 4;
  const H = gh + depth + 4;
  const face = new PixelCanvas(W, H);
  let x0 = 2;
  for (const g of glyphs) {
    g.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const y = 2 + gy * scale + sy;
          const t = (y - 2) / gh;
          // vertical gradient top → bottom with dithered band transition
          const col = t < 0.45 ? top[4] : t < 0.6 ? (ditherOn(x0 + gx * scale + sx, y, (t - 0.45) / 0.15) ? top[3] : top[4]) : ditherOn(x0 + gx * scale + sx, y, (t - 0.6) / 0.4) ? bottom[2] : top[3];
          face.set(x0 + gx * scale + sx, y, col);
        }
      }
    });
    x0 += g[0].length * scale + gap;
  }
  // extruded 3D depth toward the lower right
  const out = new PixelCanvas(W, H);
  for (let d = depth; d >= 1; d--) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (face.opaque(x, y)) out.set(x + d, y + d, d === depth ? RAMPS.plum[0] : bottom[0]);
    }
  }
  out.blit(face, 0, 0);
  // specular pixels on letter tops
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    if (face.opaque(x, y) && !face.opaque(x, y - 1) && (x % 3 === 0)) out.set(x, y, '#ffffff');
  }
  out.outline(INK);
  return out;
}

function logo() {
  const nexus = wordmark('NEXUS', { scale: 2, top: RAMPS.yellow, bottom: RAMPS.orange, depth: 4, gap: 3 });
  const city = wordmark('CITY ZERO', { scale: 1, top: RAMPS.cyan, bottom: RAMPS.teal, depth: 2, gap: 2 });
  const W = Math.max(nexus.w, city.w) + 4;
  const H = nexus.h + city.h + 4;
  const c = new PixelCanvas(W, H);
  c.blit(nexus, Math.floor((W - nexus.w) / 2), 0);
  c.blit(city, Math.floor((W - city.w) / 2), nexus.h + 2);
  return c;
}

export function buildUI() {
  const out = [];
  out.push({ name: 'card', canvas: card(16, 16, RAMPS.cream[3]) });
  out.push({ name: 'card-white', canvas: card(16, 16, RAMPS.cream[4], { highlight: '#ffffff', lipColor: RAMPS.cream[2] }) });
  out.push({ name: 'card-inset', canvas: card(12, 12, RAMPS.cream[2], { r: 2, lip: 0, highlight: RAMPS.cream[1], lipColor: RAMPS.cream[2] }) });
  out.push({ name: 'card-dark', canvas: card(16, 16, RAMPS.violet[0], { highlight: RAMPS.violet[1], lipColor: RAMPS.plum[0] }) });
  for (const color of ['teal', 'orange', 'violet', 'coral', 'green', 'yellow', 'magenta', 'blue', 'red', 'cyan']) {
    const ramp = RAMPS[color];
    out.push({ name: `band-${color}`, canvas: card(16, 12, ramp[3], { r: 3, lip: 2, highlight: ramp[4], lipColor: ramp[1] }) });
  }
  for (const color of BUTTON_COLORS) {
    const ramp = RAMPS[color];
    out.push({ name: `btn-${color}`, canvas: button(ramp, 'normal') });
    out.push({ name: `btn-${color}-hover`, canvas: button(ramp, 'hover') });
    out.push({ name: `btn-${color}-down`, canvas: button(ramp, 'down') });
  }
  out.push({ name: 'bar-track', canvas: barTrack() });
  for (const [k, ramp] of Object.entries(FILL_COLORS)) out.push({ name: `bar-${k}`, canvas: barFill(ramp) });
  for (const color of ['teal', 'orange', 'violet', 'coral', 'green', 'yellow', 'magenta', 'blue', 'cyan', 'red', 'brown', 'stone', 'cream']) {
    out.push({ name: `badge-${color}`, canvas: badge(RAMPS[color]) });
  }
  out.push({ name: 'chip-good', canvas: chip(RAMPS.green) });
  out.push({ name: 'chip-bad', canvas: chip(RAMPS.coral) });
  out.push({ name: 'chip-neutral', canvas: chip(RAMPS.stone) });
  out.push({ name: 'chip-cost', canvas: chip(RAMPS.magenta) });
  out.push({ name: 'select-gold', canvas: selectFrame(RAMPS.yellow) });
  out.push({ name: 'select-cyan', canvas: selectFrame(RAMPS.cyan) });
  out.push({ name: 'capsule', canvas: capsule() });
  out.push({ name: 'divider', canvas: dottedDivider() });
  out.push({ name: 'hazard', canvas: slash(RAMPS.yellow) });
  out.push({ name: 'hazard-red', canvas: slash(RAMPS.red) });
  out.push({ name: 'logo', canvas: logo() });
  out.push({ name: 'logo-small', canvas: wordmark('NEXUS', { scale: 1, top: RAMPS.yellow, bottom: RAMPS.orange, depth: 2, gap: 2 }) });
  return out;
}

/** 32×32 favicon: the NEXUS tower emblem on a violet tile. */
export function buildFavicon() {
  const c = new PixelCanvas(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (!inRounded(x, y, 32, 32, 6)) continue;
    c.set(x, y, y < 4 ? RAMPS.violet[3] : RAMPS.violet[2]);
  }
  const Y = RAMPS.yellow[4];
  for (let y = 8; y < 25; y++) { c.fillRect(8, y, 3, 1, Y); c.fillRect(21, y, 3, 1, Y); }
  for (let k = 0; k < 14; k++) c.fillRect(9 + k, 8 + Math.round(k * 16 / 13), 3, 2, Y);
  c.outline(INK);
  return c;
}
