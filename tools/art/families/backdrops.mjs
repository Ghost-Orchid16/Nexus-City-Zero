// Menu backdrops (tileable parallax skyline at golden hour) and district vignettes used as
// event-card illustrations. Vignettes reuse the real building sprites so art stays coherent.
import { PixelCanvas, RAMPS, INK, hash2, ditherOn, prng } from '../lib/draw.mjs';
import { buildBuildings } from './buildings.mjs';
import { buildCityProps } from './props.mjs';

const W = 640;

function skyGradient(c, stops, y0, h) {
  const n = stops.length - 1;
  for (let y = 0; y < h; y++) {
    const t = (y / (h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < c.w; x++) c.set(x, y0 + y, ditherOn(x, y0 + y, f) ? stops[i + 1] : stops[i]);
  }
}

/** Draw into a tileable strip: anything crossing an edge is repeated on the other side. */
function wrapDraw(c, x, draw) {
  draw(x);
  if (x < 0) draw(x + c.w);
  if (x > c.w - 80) draw(x - c.w);
}

function sky() {
  const c = new PixelCanvas(W, 360);
  skyGradient(c, [RAMPS.blue[2], RAMPS.blue[3], RAMPS.blue[4], RAMPS.coral[4], RAMPS.yellow[4]], 0, 360);
  // sun with banded halo
  const sx = 470;
  const sy = 210;
  for (let r = 60; r > 0; r -= 1) {
    const col = r > 48 ? null : r > 40 ? RAMPS.yellow[4] : r > 30 ? RAMPS.glow[4] : '#ffffff';
    if (!col) continue;
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      const x = Math.round(sx + Math.cos(a) * r);
      const y = Math.round(sy + Math.sin(a) * r);
      if (r > 40 && !ditherOn(x, y, 0.55)) continue;
      c.set(x, y, col);
    }
  }
  return c;
}

function cloud(w, seed) {
  const h = Math.round(w * 0.42);
  const c = new PixelCanvas(w, h);
  const rnd = prng(seed);
  const lobes = [];
  for (let i = 0; i < 5; i++) lobes.push([w * (0.15 + rnd() * 0.7), h * (0.35 + rnd() * 0.35), w * (0.14 + rnd() * 0.12)]);
  lobes.push([w * 0.5, h * 0.62, w * 0.3]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = false;
    for (const [lx, ly, lr] of lobes) if ((x - lx) ** 2 + ((y - ly) * 1.3) ** 2 <= lr * lr) inside = true;
    if (!inside || y > h * 0.86) continue;
    const t = y / h;
    c.set(x, y, t < 0.45 ? '#ffffff' : t < 0.7 ? RAMPS.cream[4] : RAMPS.coral[4]);
  }
  return c;
}

function mountains() {
  const c = new PixelCanvas(W, 140);
  for (let x = 0; x < W; x++) {
    const u = (x / W) * Math.PI * 2;
    const hgt = 70 + Math.sin(u * 2) * 22 + Math.sin(u * 5 + 1) * 10 + Math.sin(u * 11) * 4;
    for (let y = Math.round(140 - hgt); y < 140; y++) {
      const depth = y - (140 - hgt);
      c.set(x, y, depth < 2 ? RAMPS.violet[3] : ditherOn(x, y, Math.min(1, depth / 40)) ? RAMPS.violet[1] : RAMPS.violet[2]);
    }
  }
  return c;
}

function skyline(layer) {
  const H = layer === 'far' ? 170 : 210;
  const c = new PixelCanvas(W, H);
  const rnd = prng(layer === 'far' ? 5 : 9);
  const body = layer === 'far' ? [RAMPS.blue[1], RAMPS.violet[1], RAMPS.blue[2]] : [RAMPS.teal[1], RAMPS.violet[2], RAMPS.blue[1], RAMPS.teal[2], RAMPS.magenta[1]];
  let x = -20;
  while (x < W) {
    const bw = layer === 'far' ? 18 + Math.floor(rnd() * 22) : 24 + Math.floor(rnd() * 30);
    const bh = layer === 'far' ? 50 + Math.floor(rnd() * 100) : 40 + Math.floor(rnd() * 120);
    const col = body[Math.floor(rnd() * body.length)];
    const lit = rnd();
    const spire = rnd() < 0.25;
    const bx = x;
    wrapDraw(c, bx, (dx) => {
      c.fillRect(dx, H - bh, bw, bh, col);
      c.vline(dx, H - bh, H - 1, layer === 'far' ? RAMPS.blue[3] : RAMPS.cyan[3]);
      if (spire) { c.vline(dx + Math.floor(bw / 2), H - bh - 14, H - bh, col); c.set(dx + Math.floor(bw / 2), H - bh - 15, RAMPS.red[3]); }
      for (let wy = H - bh + 5; wy < H - 6; wy += layer === 'far' ? 6 : 7) {
        for (let wx = dx + 3; wx < dx + bw - 3; wx += layer === 'far' ? 4 : 5) {
          if (hash2(wx, wy, 3) < 0.3 + lit * 0.3) c.fillRect(wx, wy, 2, layer === 'far' ? 2 : 3, hash2(wx, wy, 4) < 0.7 ? RAMPS.glow[3] : RAMPS.cyan[4]);
        }
      }
    });
    x += bw + (layer === 'far' ? 2 : 6) + Math.floor(rnd() * 8);
  }
  if (layer === 'mid') {
    // the NEXUS tower landmark with its magenta fins and beacon
    const tx = 250;
    c.fillRect(tx, H - 196, 30, 196, RAMPS.blue[1]);
    c.vline(tx, H - 196, H - 1, RAMPS.magenta[3]);
    c.vline(tx + 29, H - 196, H - 1, RAMPS.magenta[2]);
    for (let wy = H - 190; wy < H - 6; wy += 5) for (let wx = tx + 3; wx < tx + 27; wx += 4) {
      if (hash2(wx, wy, 8) < 0.55) c.fillRect(wx, wy, 2, 3, RAMPS.cyan[4]);
    }
    c.vline(tx + 15, H - 214, H - 196, RAMPS.stone[3]);
    c.fillRect(tx + 14, H - 216, 3, 3, RAMPS.red[3]);
  }
  c.outline(INK, { where: (px, py) => py < H - 1 });
  return c;
}

function nearLayer() {
  const H = 110;
  const c = new PixelCanvas(W, H);
  // street
  c.fillRect(0, H - 22, W, 22, RAMPS.asphalt[2]);
  c.hline(0, W - 1, H - 22, RAMPS.stone[3]);
  for (let x = 0; x < W; x += 16) c.hline(x, x + 8, H - 11, RAMPS.cream[4]);
  // low houses & shops
  const rnd = prng(21);
  let x = 0;
  const walls = [RAMPS.coral, RAMPS.yellow, RAMPS.cream, RAMPS.teal, RAMPS.orange, RAMPS.violet];
  while (x < W) {
    const bw = 30 + Math.floor(rnd() * 24);
    const bh = 26 + Math.floor(rnd() * 26);
    const wall = walls[Math.floor(rnd() * walls.length)];
    const bx = x;
    wrapDraw(c, bx, (dx) => {
      c.fillRect(dx, H - 22 - bh, bw, bh, wall[2]);
      c.vline(dx, H - 22 - bh, H - 23, wall[3]);
      c.vline(dx + bw - 1, H - 22 - bh, H - 23, wall[1]);
      c.fillRect(dx - 1, H - 25 - bh, bw + 2, 4, RAMPS.plum[2]);
      c.hline(dx - 1, dx + bw, H - 25 - bh, RAMPS.plum[3]);
      for (let wy = H - 16 - bh; wy < H - 30; wy += 9) for (let wx = dx + 4; wx < dx + bw - 6; wx += 8) {
        c.fillRect(wx, wy, 4, 5, RAMPS.glow[3]);
        c.hline(wx, wx + 3, wy + 5, wall[4]);
      }
    });
    x += bw + 18 + Math.floor(rnd() * 20);
  }
  // trees & lamps in front
  for (let tx = 10; tx < W; tx += 46) {
    c.fillOval(tx, H - 44, 16, 16, RAMPS.green[2]);
    c.fillOval(tx + 2, H - 44, 11, 10, RAMPS.green[3]);
    c.fillRect(tx + 7, H - 30, 2, 8, RAMPS.brown[1]);
    c.fillRect(tx + 30, H - 40, 2, 18, RAMPS.plum[1]);
    c.fillRect(tx + 28, H - 42, 5, 3, RAMPS.glow[3]);
  }
  c.outline(INK, { where: (px, py) => py < H - 1 });
  return c;
}

// ------------------------------------------------------------------ vignettes (event art)
const VW = 160;
const VH = 90;
const VIGNETTE_SKY = {
  water: [RAMPS.blue[3], RAMPS.blue[4], RAMPS.cyan[4]],
  residential: [RAMPS.blue[3], RAMPS.coral[4], RAMPS.yellow[4]],
  downtown: [RAMPS.violet[3], RAMPS.blue[4], RAMPS.coral[4]],
  medical: [RAMPS.blue[3], RAMPS.blue[4], RAMPS.cream[4]],
  energy: [RAMPS.orange[3], RAMPS.yellow[4], RAMPS.cream[4]],
  command: [RAMPS.teal[3], RAMPS.cyan[4], RAMPS.cream[4]],
  transport: [RAMPS.blue[3], RAMPS.orange[4], RAMPS.yellow[4]],
  industrial: [RAMPS.orange[2], RAMPS.coral[4], RAMPS.yellow[4]]
};

const VIGNETTE_PLAN = {
  water: [['water-tower', 36, 74], ['pump-house', 104, 74], ['tree-oak', 142, 76], ['tree-pine', 14, 76]],
  residential: [['house-a', 30, 74], ['house-b', 76, 74], ['house-e', 124, 74], ['tree-blossom', 150, 76], ['tree-oak', 8, 76]],
  downtown: [['office-violet', 36, 80], ['nexus-tower', 86, 84], ['office-teal', 128, 80]],
  medical: [['hospital', 70, 78], ['pharmacy', 134, 78], ['ambulance-side-0', 132, 86]],
  energy: [['power-plant', 44, 76], ['reactor', 112, 78], ['pylon', 150, 78]],
  command: [['command-center', 76, 78], ['radar-0', 18, 76], ['mast', 142, 80]],
  transport: [['train-station', 80, 80], ['bus-side', 30, 86]],
  industrial: [['factory', 58, 76], ['smokestack', 112, 76], ['containers', 138, 80]]
};

function vignette(district, sprites) {
  const c = new PixelCanvas(VW, VH);
  skyGradient(c, VIGNETTE_SKY[district], 0, 62);
  // distant skyline band
  for (let x = 0; x < VW; x += 9) {
    const h = 10 + Math.floor(hash2(x, 1, 7) * 18);
    c.fillRect(x, 62 - h, 8, h, RAMPS.violet[2]);
    if (hash2(x, 2, 7) < 0.6) c.set(x + 3, 62 - h + 4, RAMPS.glow[3]);
  }
  // ground
  const groundRamp = district === 'industrial' || district === 'energy' ? RAMPS.brown : district === 'downtown' || district === 'transport' || district === 'medical' ? RAMPS.stone : RAMPS.green;
  c.fillRect(0, 62, VW, VH - 62, groundRamp[3]);
  c.hline(0, VW - 1, 62, groundRamp[4]);
  c.fillRect(0, VH - 8, VW, 8, RAMPS.asphalt[2]);
  for (let x = 0; x < VW; x += 12) c.hline(x, x + 6, VH - 4, RAMPS.cream[4]);
  if (district === 'water') { c.fillRect(0, VH - 8, VW, 8, RAMPS.water[2]); for (let x = 0; x < VW; x += 9) c.hline(x, x + 3, VH - 5, RAMPS.water[4]); }
  if (district === 'transport') { c.fillRect(0, VH - 14, VW, 5, RAMPS.stone[1]); c.hline(0, VW - 1, VH - 13, RAMPS.stone[4]); c.hline(0, VW - 1, VH - 11, RAMPS.stone[4]); }
  for (const [key, x, baseY] of VIGNETTE_PLAN[district]) {
    const s = sprites[key];
    if (!s) throw new Error(`vignette ${district} needs sprite ${key}`);
    c.blendRect(x - Math.floor(s.w / 2) + 3, baseY - 2, s.w - 2, 3, RAMPS.plum[0], 0.3);
    c.blit(s, x - Math.floor(s.w / 2), baseY - s.h + 1);
  }
  return c;
}

export const VIGNETTE_DISTRICTS = Object.keys(VIGNETTE_PLAN);

export function buildClouds() {
  return [cloud(60, 1), cloud(44, 2), cloud(80, 3), cloud(36, 4)].map((canvas, i) => ({ name: `cloud-${i}`, canvas }));
}

export function buildBackdrops() {
  const sprites = Object.fromEntries([...buildBuildings(), ...buildCityProps()].map((i) => [i.name, i.canvas]));
  const out = [
    { name: 'sky', canvas: sky() },
    { name: 'mountains', canvas: mountains() },
    { name: 'skyline-far', canvas: skyline('far') },
    { name: 'skyline-mid', canvas: skyline('mid') },
    { name: 'skyline-near', canvas: nearLayer() }
  ];
  const vig = new PixelCanvas(VW, VH * VIGNETTE_DISTRICTS.length);
  VIGNETTE_DISTRICTS.forEach((d, i) => vig.blit(vignette(d, sprites), 0, i * VH));
  out.push({ name: 'vignettes', canvas: vig });
  return out;
}
