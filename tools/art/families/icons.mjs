// Icon family: resources (16px), scenarios & abilities (24px), UI glyphs (16px).
// Shapes are pixel-snapped primitives; `bevel` lights top/left edges and shades bottom/right so
// every icon shares one chunky, embossed treatment; everything gets the same plum outline.
import { PixelCanvas, RAMPS, INK } from '../lib/draw.mjs';

const W = RAMPS.cream[4];

/** Lighten top/left edge pixels and darken bottom/right edge pixels of one ramp's base tone. */
function bevel(c, ramp, base = 2) {
  const src = c.clone();
  const same = (x, y) => {
    const p = src.get(x, y);
    if (!p[3]) return false;
    const b = ramp[base];
    return p[0] === parseInt(b.slice(1, 3), 16) && p[1] === parseInt(b.slice(3, 5), 16) && p[2] === parseInt(b.slice(5, 7), 16);
  };
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!same(x, y)) continue;
    const up = !src.opaque(x, y - 1);
    const left = !src.opaque(x - 1, y);
    const down = !src.opaque(x, y + 1);
    const right = !src.opaque(x + 1, y);
    if (up || left) c.set(x, y, ramp[Math.min(4, base + 1)]);
    if ((up && left)) c.set(x, y, ramp[4]);
    if (down || right) c.set(x, y, ramp[Math.max(0, base - 1)]);
  }
  return c;
}

function icon(size, draw) {
  const c = new PixelCanvas(size, size);
  draw(c);
  c.outline(INK);
  return c;
}

const oval = (c, x, y, w, h, col) => c.fillOval(x, y, w, h, col);
const poly = (c, pts, col) => c.fillPoly(pts, col);

// ---------------------------------------------------------------- resources (16×16)
const RESOURCE_ICONS = {
  energy: (c) => { poly(c, [[10, 1], [3, 9], [7.5, 9], [5, 15], [13, 6.5], [8.5, 6.5], [11.5, 1]], RAMPS.yellow[2]); bevel(c, RAMPS.yellow); },
  water: (c) => { oval(c, 3, 6, 10, 9, RAMPS.water[2]); poly(c, [[8, 1], [12.5, 9], [3.5, 9]], RAMPS.water[2]); bevel(c, RAMPS.water); c.set(5, 9, W); c.set(5, 10, W); c.set(6, 8, W); },
  health: (c) => { oval(c, 1, 2, 8, 8, RAMPS.coral[2]); oval(c, 7, 2, 8, 8, RAMPS.coral[2]); poly(c, [[1.5, 7], [14.5, 7], [8, 14.5]], RAMPS.coral[2]); bevel(c, RAMPS.coral); c.fillRect(7, 4, 2, 7, W); c.fillRect(5, 6, 6, 2, W); },
  transport: (c) => {
    c.fillRect(2, 2, 12, 11, RAMPS.orange[2]); bevel(c, RAMPS.orange);
    c.fillRect(4, 4, 8, 4, RAMPS.glass[3]); c.set(4, 4, W); c.hline(4, 11, 7, RAMPS.glass[2]);
    c.set(4, 10, RAMPS.yellow[4]); c.set(11, 10, RAMPS.yellow[4]);
    c.fillRect(3, 13, 3, 2, RAMPS.plum[1]); c.fillRect(10, 13, 3, 2, RAMPS.plum[1]);
  },
  infrastructure: (c) => {
    c.fillRect(1, 5, 14, 3, RAMPS.brown[2]);
    for (const x of [2, 12]) c.fillRect(x, 8, 2, 7, RAMPS.brown[2]);
    bevel(c, RAMPS.brown);
    c.fillPoly([[4, 8], [12, 8], [11, 12], [5, 12]], RAMPS.stone[3]);
    c.fillPoly([[6, 8], [10, 8], [9, 10.5], [7, 10.5]], RAMPS.plum[1]);
    for (let x = 2; x < 14; x += 3) c.set(x, 6, RAMPS.yellow[3]);
    c.fillRect(6, 1, 4, 4, RAMPS.stone[3]); c.set(6, 1, W);
  },
  safety: (c) => { poly(c, [[2, 2], [14, 2], [14, 8], [8, 15], [2, 8]], RAMPS.violet[2]); bevel(c, RAMPS.violet); poly(c, [[8, 4], [9.2, 7], [12, 7], [9.8, 9], [10.6, 12], [8, 10.2], [5.4, 12], [6.2, 9], [4, 7], [6.8, 7]], W); },
  communication: (c) => {
    poly(c, [[8, 5], [11, 15], [5, 15]], RAMPS.cyan[2]); bevel(c, RAMPS.cyan);
    c.fillRect(7, 3, 2, 3, RAMPS.cyan[3]); c.set(7, 3, W);
    for (const [r, col] of [[4, RAMPS.cyan[3]], [7, RAMPS.cyan[4]]]) {
      for (let a = -0.9; a <= 0.9; a += 0.12) {
        c.set(Math.round(8 - Math.sin(a) * 0 - r * Math.cos(a) * 0.9 - 0), Math.round(4 - r * Math.sin(Math.abs(a)) * 0), col);
      }
    }
    // signal arcs left & right
    for (const r of [3, 6]) {
      for (let t = -0.8; t <= 0.8; t += 0.1) {
        c.set(Math.round(8 - r * Math.cos(t)), Math.round(4 + r * Math.sin(t) * 0.8), RAMPS.cyan[3]);
        c.set(Math.round(8 + r * Math.cos(t)), Math.round(4 + r * Math.sin(t) * 0.8), RAMPS.cyan[3]);
      }
    }
  },
  supplies: (c) => {
    c.fillRect(2, 4, 12, 10, RAMPS.green[2]); bevel(c, RAMPS.green);
    c.fillRect(7, 4, 2, 10, RAMPS.lime[3]); c.hline(2, 13, 8, RAMPS.green[1]);
    poly(c, [[2, 4], [5, 1], [11, 1], [14, 4]], RAMPS.green[3]); c.hline(5, 10, 1, RAMPS.lime[4]);
  },
  budget: (c) => {
    oval(c, 1, 1, 14, 14, RAMPS.yellow[2]); bevel(c, RAMPS.yellow);
    c.strokeOval(3, 3, 10, 10, RAMPS.yellow[1]);
    c.fillRect(7, 4, 2, 8, RAMPS.magenta[2]); c.hline(5, 10, 5, RAMPS.magenta[2]); c.hline(5, 10, 10, RAMPS.magenta[2]);
  }
};

// ---------------------------------------------------------------- scenarios (24×24)
const SCENARIO_ICONS = {
  power: (c) => {
    for (let y = 4; y < 23; y++) { const h = Math.round(2 + (y / 23) * 6); c.set(8 - h + 4, y, RAMPS.stone[1]); c.set(8 + h + 3, y, RAMPS.stone[1]); }
    c.hline(2, 21, 7, RAMPS.stone[2]); c.hline(4, 19, 12, RAMPS.stone[2]);
    poly(c, [[16, 1], [9, 12], [13, 12], [10, 22], [20, 9], [15, 9], [18, 1]], RAMPS.yellow[2]); bevel(c, RAMPS.yellow);
  },
  weather: (c) => {
    oval(c, 2, 5, 12, 10, RAMPS.stone[3]); oval(c, 8, 2, 13, 12, RAMPS.stone[3]); c.fillRect(4, 10, 16, 5, RAMPS.stone[3]);
    bevel(c, RAMPS.stone, 3);
    poly(c, [[13, 13], [9, 19], [12, 19], [10, 23], [16, 16], [13, 16], [15, 13]], RAMPS.yellow[3]);
    for (const x of [5, 18, 21]) { c.vline(x, 17, 19, RAMPS.water[3]); c.set(x - 1, 20, RAMPS.water[3]); }
  },
  water: (c) => {
    oval(c, 5, 9, 14, 13, RAMPS.water[2]); poly(c, [[12, 1], [18.5, 13], [5.5, 13]], RAMPS.water[2]); bevel(c, RAMPS.water);
    c.line(12, 8, 10, 12, RAMPS.plum[1]); c.line(10, 12, 13, 15, RAMPS.plum[1]); c.line(13, 15, 11, 20, RAMPS.plum[1]);
    c.set(8, 13, W); c.set(8, 14, W);
  },
  cyber: (c) => {
    c.fillRect(5, 10, 14, 12, RAMPS.cyan[2]); bevel(c, RAMPS.cyan);
    c.strokeOval(7, 2, 10, 13, RAMPS.stone[3]); c.strokeOval(8, 3, 8, 11, RAMPS.stone[2]);
    c.fillRect(5, 10, 14, 12, RAMPS.cyan[2]); bevel(c, RAMPS.cyan);
    c.fillRect(11, 14, 2, 4, RAMPS.plum[1]);
    for (const [x, y, col] of [[2, 6, RAMPS.magenta[3]], [20, 5, RAMPS.lime[3]], [19, 18, RAMPS.magenta[3]], [1, 16, RAMPS.lime[3]]]) c.fillRect(x, y, 3, 1, col);
  },
  transport: (c) => {
    c.fillRect(4, 2, 16, 16, RAMPS.orange[2]); bevel(c, RAMPS.orange);
    c.fillRect(6, 4, 12, 6, RAMPS.glass[3]); c.set(6, 4, W);
    c.set(7, 14, RAMPS.yellow[4]); c.set(16, 14, RAMPS.yellow[4]);
    c.fillRect(5, 18, 4, 3, RAMPS.plum[1]); c.fillRect(15, 18, 4, 3, RAMPS.plum[1]);
    c.line(1, 22, 11, 19, RAMPS.plum[1]); c.line(11, 19, 13, 23, RAMPS.plum[1]); c.line(13, 23, 23, 20, RAMPS.plum[1]);
  },
  hospital: (c) => {
    c.fillRect(3, 6, 18, 16, RAMPS.cream[3]); bevel(c, RAMPS.cream, 3);
    c.fillRect(10, 8, 4, 10, RAMPS.red[2]); c.fillRect(7, 11, 10, 4, RAMPS.red[2]);
    poly(c, [[12, 0], [18, 5], [6, 5]], RAMPS.red[3]);
    c.fillRect(11, 2, 2, 2, W);
  },
  industrial: (c) => {
    c.fillRect(2, 12, 20, 10, RAMPS.orange[2]); poly(c, [[2, 12], [8, 7], [8, 12], [14, 7], [14, 12]], RAMPS.orange[2]); bevel(c, RAMPS.orange);
    c.fillRect(17, 3, 4, 9, RAMPS.stone[3]);
    poly(c, [[12, 11], [19, 23], [5, 23]], RAMPS.yellow[3]); c.vline(12, 15, 19, RAMPS.plum[1]); c.set(12, 21, RAMPS.plum[1]);
  },
  infrastructure: (c) => {
    c.fillRect(4, 3, 16, 19, RAMPS.stone[2]); bevel(c, RAMPS.stone);
    for (let y = 6; y < 20; y += 4) for (let x = 7; x < 18; x += 4) c.fillRect(x, y, 2, 2, RAMPS.glass[3]);
    c.line(13, 3, 10, 9, RAMPS.plum[0]); c.line(10, 9, 14, 13, RAMPS.plum[0]); c.line(14, 13, 11, 21, RAMPS.plum[0]);
  },
  supply: (c) => {
    c.fillPoly([[3, 9], [21, 9], [18, 22], [6, 22]], RAMPS.brown[3]); bevel(c, RAMPS.brown, 3);
    for (let x = 7; x < 19; x += 3) c.vline(x, 11, 20, RAMPS.brown[1]);
    oval(c, 5, 3, 7, 7, RAMPS.red[3]); c.set(8, 2, RAMPS.green[3]);
    oval(c, 11, 2, 8, 8, RAMPS.lime[3]); c.set(13, 4, W);
  },
  chaos: (c) => {
    poly(c, [[3, 7], [13, 2], [22, 7], [22, 17], [12, 22], [3, 17]], RAMPS.magenta[2]); bevel(c, RAMPS.magenta);
    for (const [x, y] of [[7, 8], [12, 12], [17, 16], [17, 8], [7, 16]]) c.fillRect(x, y, 2, 2, W);
  }
};

// ---------------------------------------------------------------- abilities (24×24)
const ABILITY_ICONS = {
  reactor: (c) => {
    oval(c, 9, 9, 6, 6, RAMPS.yellow[3]);
    for (const [rx, ry] of [[10, 4], [4, 10], [7, 7]]) {
      for (let a = 0; a < Math.PI * 2; a += 0.04) {
        const t = rx === 7 ? 0.75 : 0;
        const x = 12 + Math.cos(a) * rx * (rx === 7 ? 1 : 1) * Math.cos(t) - Math.sin(a) * ry * Math.sin(t);
        const y = 12 + Math.cos(a) * rx * Math.sin(t) + Math.sin(a) * ry * Math.cos(t);
        c.set(Math.round(x), Math.round(y), RAMPS.violet[3]);
      }
    }
    c.set(11, 10, W);
  },
  analysis: (c) => { c.strokeOval(3, 3, 13, 13, RAMPS.cyan[2]); c.strokeOval(4, 4, 11, 11, RAMPS.cyan[3]); oval(c, 5, 5, 9, 9, RAMPS.glass[4]); c.line(14, 14, 20, 20, RAMPS.brown[2]); c.line(15, 14, 21, 20, RAMPS.brown[3]); c.line(14, 15, 20, 21, RAMPS.brown[1]); c.set(7, 7, W); },
  repair: (c) => {
    for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2; c.fillRect(Math.round(9 + Math.cos(ang) * 6), Math.round(9 + Math.sin(ang) * 6), 3, 3, RAMPS.stone[2]); }
    oval(c, 4, 4, 13, 13, RAMPS.stone[2]); bevel(c, RAMPS.stone); oval(c, 8, 8, 5, 5, RAMPS.plum[1]);
    c.line(13, 20, 21, 12, RAMPS.orange[3]); c.line(14, 21, 22, 13, RAMPS.orange[2]); c.fillRect(19, 9, 4, 4, RAMPS.orange[3]);
  },
  medical: (c) => { c.fillRect(3, 6, 18, 15, RAMPS.red[2]); bevel(c, RAMPS.red); c.fillRect(9, 2, 6, 4, RAMPS.red[1]); c.fillRect(10, 9, 4, 10, W); c.fillRect(7, 12, 10, 4, W); },
  grid: (c) => { oval(c, 2, 2, 20, 20, RAMPS.violet[2]); bevel(c, RAMPS.violet); poly(c, [[13, 4], [7, 13], [11, 13], [9, 20], [17, 10], [13, 10], [15, 4]], RAMPS.yellow[3]); },
  routing: (c) => {
    oval(c, 4, 2, 12, 12, RAMPS.green[2]); poly(c, [[5, 10], [15, 10], [10, 18]], RAMPS.green[2]); bevel(c, RAMPS.green);
    oval(c, 8, 6, 4, 4, W);
    for (let x = 12; x < 23; x += 3) c.fillRect(x, 20, 2, 1, RAMPS.orange[3]);
    poly(c, [[20, 17], [23, 20.5], [20, 24]], RAMPS.orange[3]);
  },
  predict: (c) => {
    c.fillRect(5, 5, 14, 14, RAMPS.magenta[2]); bevel(c, RAMPS.magenta);
    for (let k = 7; k < 18; k += 3) { c.hline(1, 4, k, RAMPS.stone[3]); c.hline(19, 22, k, RAMPS.stone[3]); c.vline(k, 1, 4, RAMPS.stone[3]); c.vline(k, 19, 22, RAMPS.stone[3]); }
    c.line(8, 15, 11, 11, RAMPS.cyan[4]); c.line(11, 11, 13, 13, RAMPS.cyan[4]); c.line(13, 13, 16, 8, RAMPS.cyan[4]);
  }
};

// ---------------------------------------------------------------- UI glyphs (16×16)
const UI_ICONS = {
  dice: (c) => { c.fillRect(2, 2, 12, 12, W); bevel(c, RAMPS.cream, 4); c.fillRect(2, 2, 12, 12, RAMPS.cream[4]); c.hline(2, 13, 13, RAMPS.cream[2]); c.vline(13, 2, 13, RAMPS.cream[2]); for (const [x, y] of [[4, 4], [7, 7], [10, 10], [10, 4], [4, 10]]) c.fillRect(x, y, 2, 2, RAMPS.magenta[2]); },
  clock: (c) => { oval(c, 1, 1, 14, 14, RAMPS.cream[4]); c.strokeOval(1, 1, 14, 14, RAMPS.orange[2]); c.vline(8, 4, 8, RAMPS.plum[1]); c.hline(8, 11, 8, RAMPS.plum[1]); },
  warning: (c) => { poly(c, [[8, 1], [15, 14], [1, 14]], RAMPS.yellow[2]); bevel(c, RAMPS.yellow); c.vline(8, 5, 9, RAMPS.plum[1]); c.set(8, 11, RAMPS.plum[1]); },
  trophy: (c) => { c.fillRect(4, 1, 8, 7, RAMPS.yellow[2]); oval(c, 4, 4, 8, 7, RAMPS.yellow[2]); bevel(c, RAMPS.yellow); c.fillRect(7, 10, 2, 3, RAMPS.yellow[1]); c.fillRect(4, 13, 8, 2, RAMPS.brown[2]); c.set(1, 3, RAMPS.yellow[2]); c.set(14, 3, RAMPS.yellow[2]); },
  star: (c) => { poly(c, [[8, 1], [10, 6], [15, 6], [11, 9.5], [12.5, 15], [8, 11.5], [3.5, 15], [5, 9.5], [1, 6], [6, 6]], RAMPS.yellow[2]); bevel(c, RAMPS.yellow); },
  lock: (c) => { c.strokeOval(4, 1, 8, 10, RAMPS.stone[3]); c.fillRect(3, 7, 10, 8, RAMPS.stone[2]); bevel(c, RAMPS.stone); c.fillRect(7, 10, 2, 3, RAMPS.plum[1]); },
  check: (c) => { poly(c, [[1, 8], [4, 5], [7, 8], [13, 2], [15, 5], [7, 13]], RAMPS.green[2]); bevel(c, RAMPS.green); },
  cross: (c) => { poly(c, [[2, 4], [4, 2], [8, 6], [12, 2], [14, 4], [10, 8], [14, 12], [12, 14], [8, 10], [4, 14], [2, 12], [6, 8]], RAMPS.red[2]); bevel(c, RAMPS.red); },
  up: (c) => { poly(c, [[8, 2], [14, 9], [10, 9], [10, 14], [6, 14], [6, 9], [2, 9]], RAMPS.green[3]); bevel(c, RAMPS.green, 3); },
  down: (c) => { poly(c, [[8, 14], [14, 7], [10, 7], [10, 2], [6, 2], [6, 7], [2, 7]], RAMPS.red[3]); bevel(c, RAMPS.red, 3); },
  play: (c) => { poly(c, [[4, 2], [14, 8], [4, 14]], RAMPS.teal[3]); bevel(c, RAMPS.teal, 3); },
  restart: (c) => { c.strokeOval(2, 2, 12, 12, RAMPS.teal[3]); c.strokeOval(3, 3, 10, 10, RAMPS.teal[3]); c.fillRect(9, 1, 5, 5, [0, 0, 0, 0]); for (let y = 1; y < 6; y++) for (let x = 9; x < 14; x++) c.clearPixel(x, y); poly(c, [[9, 1], [15, 3], [10, 7]], RAMPS.teal[3]); },
  'sound-on': (c) => { c.fillRect(2, 6, 3, 4, RAMPS.stone[3]); poly(c, [[4, 6], [9, 2], [9, 14], [4, 10]], RAMPS.stone[3]); for (let t = -0.8; t <= 0.8; t += 0.12) { c.set(Math.round(10 + 3 * Math.cos(t)), Math.round(8 + 3 * Math.sin(t)), RAMPS.teal[3]); c.set(Math.round(10 + 5 * Math.cos(t)), Math.round(8 + 5 * Math.sin(t)), RAMPS.teal[3]); } },
  'sound-off': (c) => { c.fillRect(2, 6, 3, 4, RAMPS.stone[3]); poly(c, [[4, 6], [9, 2], [9, 14], [4, 10]], RAMPS.stone[3]); c.line(11, 5, 15, 11, RAMPS.red[3]); c.line(15, 5, 11, 11, RAMPS.red[3]); },
  info: (c) => { oval(c, 1, 1, 14, 14, RAMPS.teal[2]); bevel(c, RAMPS.teal); c.fillRect(7, 7, 2, 5, W); c.fillRect(7, 4, 2, 2, W); },
  cascade: (c) => { c.strokeOval(1, 4, 8, 7, RAMPS.orange[3]); c.strokeOval(7, 4, 8, 7, RAMPS.red[3]); c.strokeOval(2, 5, 6, 5, RAMPS.orange[2]); c.strokeOval(8, 5, 6, 5, RAMPS.red[2]); },
  ai: (c) => { c.fillRect(3, 3, 10, 10, RAMPS.magenta[2]); bevel(c, RAMPS.magenta); for (let k = 4; k < 13; k += 3) { c.set(k, 1, RAMPS.stone[3]); c.set(k, 14, RAMPS.stone[3]); c.set(1, k, RAMPS.stone[3]); c.set(14, k, RAMPS.stone[3]); } c.fillRect(6, 6, 4, 4, RAMPS.cyan[4]); },
  people: (c) => { oval(c, 2, 2, 5, 5, RAMPS.coral[3]); oval(c, 9, 2, 5, 5, RAMPS.teal[3]); oval(c, 1, 8, 7, 7, RAMPS.coral[2]); oval(c, 8, 8, 7, 7, RAMPS.teal[2]); c.fillRect(1, 12, 14, 3, [0, 0, 0, 0]); for (let y = 12; y < 15; y++) for (let x = 1; x < 15; x++) c.clearPixel(x, y); },
  flag: (c) => { c.vline(3, 1, 15, RAMPS.stone[3]); poly(c, [[4, 2], [14, 4], [4, 9]], RAMPS.orange[3]); bevel(c, RAMPS.orange, 3); },
  branch: (c) => { c.vline(4, 2, 14, RAMPS.teal[3]); c.line(4, 9, 11, 3, RAMPS.violet[3]); oval(c, 2, 12, 5, 4, RAMPS.teal[3]); oval(c, 2, 0, 5, 4, RAMPS.teal[3]); oval(c, 10, 1, 5, 4, RAMPS.violet[3]); },
  gear: (c) => { for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2; c.fillRect(Math.round(7 + Math.cos(ang) * 5.5), Math.round(7 + Math.sin(ang) * 5.5), 2, 2, RAMPS.stone[2]); } oval(c, 3, 3, 10, 10, RAMPS.stone[2]); bevel(c, RAMPS.stone); oval(c, 6, 6, 4, 4, RAMPS.plum[1]); },
  home: (c) => { poly(c, [[8, 1], [15, 8], [1, 8]], RAMPS.coral[3]); c.fillRect(3, 8, 10, 7, RAMPS.cream[3]); c.fillRect(7, 10, 3, 5, RAMPS.teal[2]); },
  medal: (c) => { poly(c, [[4, 0], [7, 0], [9, 5], [6, 5]], RAMPS.blue[3]); poly(c, [[9, 0], [12, 0], [10, 5], [7, 5]], RAMPS.red[3]); oval(c, 3, 5, 10, 10, RAMPS.yellow[2]); bevel(c, RAMPS.yellow); c.set(8, 9, W); },
  crown: (c) => { poly(c, [[1, 13], [1, 4], [5, 8], [8, 2], [11, 8], [15, 4], [15, 13]], RAMPS.yellow[2]); bevel(c, RAMPS.yellow); c.set(8, 9, RAMPS.red[3]); c.set(4, 10, RAMPS.cyan[3]); c.set(12, 10, RAMPS.cyan[3]); },
  keyboard: (c) => { c.fillRect(1, 4, 14, 9, RAMPS.stone[3]); bevel(c, RAMPS.stone, 3); for (let y = 6; y < 11; y += 2) for (let x = 3; x < 13; x += 2) c.set(x, y, RAMPS.plum[1]); },
  pointer: (c) => { poly(c, [[3, 1], [12, 9], [8, 9], [10, 14], [8, 15], [6, 10], [3, 13]], RAMPS.cream[4]); }
};

export const ICON_KEYS = {
  resources: Object.keys(RESOURCE_ICONS),
  scenarios: Object.keys(SCENARIO_ICONS),
  abilities: Object.keys(ABILITY_ICONS),
  ui: Object.keys(UI_ICONS)
};

export function buildIcons() {
  const out = [];
  for (const [k, fn] of Object.entries(RESOURCE_ICONS)) out.push({ name: `res-${k}`, canvas: icon(16, fn) });
  for (const [k, fn] of Object.entries(SCENARIO_ICONS)) out.push({ name: `scn-${k}`, canvas: icon(24, fn) });
  for (const [k, fn] of Object.entries(ABILITY_ICONS)) out.push({ name: `abl-${k}`, canvas: icon(24, fn) });
  for (const [k, fn] of Object.entries(UI_ICONS)) out.push({ name: `ui-${k}`, canvas: icon(16, fn) });
  return out;
}
