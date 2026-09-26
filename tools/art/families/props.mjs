// City props atlas: trees, vehicles, street furniture, utilities and animated fixtures.
import { PixelCanvas, RAMPS, INK, hash2 } from '../lib/draw.mjs';
import { makeTree, makePine, makeBush, makeFlowerBed, makeShadow } from './nature.mjs';
import { vehicleSide, vehicleEnd, CAR_COLORS, VEHICLE_TYPES } from './vehicles.mjs';
import { fillCylinder } from './buildings.mjs';

function fountainFrames(big) {
  const frames = [];
  const W = big ? 30 : 22;
  const H = big ? 26 : 20;
  for (let f = 0; f < 3; f++) {
    const c = new PixelCanvas(W, H);
    const bw = W - 2;
    const bh = big ? 10 : 8;
    const by = H - bh - 1;
    c.fillOval(1, by, bw, bh, RAMPS.stone[3]);
    c.fillOval(3, by + 1, bw - 4, bh - 3, RAMPS.water[2]);
    c.fillOval(5, by + 2, bw - 8, bh - 5, RAMPS.water[3]);
    c.strokeOval(1, by, bw, bh, RAMPS.stone[4]);
    // center column
    const cx = Math.floor(W / 2);
    c.fillRect(cx - 1, by - 5, 3, 7, RAMPS.stone[3]);
    c.set(cx - 1, by - 5, RAMPS.stone[4]);
    // water jets (animated arcs)
    const top = by - (big ? 14 : 11) + (f === 1 ? -1 : 0);
    for (let k = 0; k < 6; k++) {
      const t = k / 5;
      const spread = (big ? 9 : 6) * t;
      const y = Math.round(top + t * t * 12);
      c.set(cx - Math.round(spread) - (f === 2 ? 1 : 0), y, RAMPS.water[4]);
      c.set(cx + Math.round(spread) + (f === 2 ? 1 : 0), y, RAMPS.water[4]);
    }
    c.vline(cx, top - 1, by - 5, RAMPS.cyan[4]);
    c.set(cx, top - 2, RAMPS.water[4]);
    for (let k = 0; k < 4; k++) {
      c.set(4 + ((k * 7 + f * 3) % (bw - 6)), by + 2 + (k % 2), RAMPS.water[4]);
    }
    c.outline(INK);
    frames.push(c);
  }
  return frames;
}

function pond() {
  const c = new PixelCanvas(36, 16);
  c.fillOval(0, 0, 36, 16, RAMPS.sand[2]);
  c.fillOval(2, 1, 32, 13, RAMPS.water[2]);
  c.fillOval(6, 3, 22, 8, RAMPS.water[3]);
  for (const [x, y] of [[9, 6], [22, 9], [26, 4]]) {
    c.fillRect(x, y, 3, 2, RAMPS.green[3]);
    c.set(x + 1, y - 1, RAMPS.magenta[4]);
  }
  c.outline(INK);
  return c;
}

function radarFrames() {
  const frames = [];
  for (let f = 0; f < 8; f++) {
    const c = new PixelCanvas(22, 30);
    // lattice tower
    c.fillRect(8, 14, 6, 15, RAMPS.stone[2]);
    for (let y = 15; y < 29; y += 3) { c.line(8, y, 13, y + 2, RAMPS.stone[1]); }
    c.vline(8, 14, 28, RAMPS.stone[3]);
    // airport-style radar bar rotating about the mast: projected length follows cos(angle),
    // the lit face shows while it turns toward the viewer
    const a = (f / 8) * Math.PI * 2;
    const half = Math.max(1, Math.round(Math.abs(Math.cos(a)) * 10));
    const face = Math.sin(a) >= 0;
    const cx = 11;
    const cy = 9;
    c.fillRect(cx - half, cy - 3, half * 2 + 1, 6, face ? RAMPS.cream[4] : RAMPS.stone[2]);
    c.hline(cx - half, cx + half, cy - 3, face ? RAMPS.cream[4] : RAMPS.stone[3]);
    for (let x = cx - half + 1; x < cx + half; x += 2) c.vline(x, cy - 2, cy + 1, face ? RAMPS.stone[3] : RAMPS.stone[1]);
    c.hline(cx - half, cx + half, cy + 2, face ? RAMPS.cream[2] : RAMPS.stone[1]);
    c.fillRect(cx - 1, cy + 3, 3, 3, RAMPS.stone[1]);
    c.set(cx, cy - 4, RAMPS.red[3]);
    c.outline(INK);
    frames.push(c);
  }
  return frames;
}

function mast() {
  const c = new PixelCanvas(12, 46);
  const lights = new PixelCanvas(12, 46);
  for (let y = 4; y < 44; y++) {
    const half = Math.round(1 + (y / 44) * 3);
    c.set(6 - half, y, RAMPS.red[2]);
    c.set(6 + half - 1, y, RAMPS.red[1]);
    if (y % 4 === 0) c.hline(6 - half, 6 + half - 1, y, RAMPS.cream[4]);
    if (y % 8 === 2) c.line(6 - half, y, 6 + half - 1, y + 3, RAMPS.stone[2]);
  }
  c.vline(6, 1, 4, RAMPS.stone[2]);
  c.fillRect(5, 0, 2, 2, RAMPS.red[3]);
  lights.fillRect(5, 0, 2, 2, RAMPS.red[4]);
  c.fillRect(4, 20, 4, 3, RAMPS.cream[4]);
  lights.set(5, 21, RAMPS.red[4]);
  c.fillRect(1, 43, 10, 3, RAMPS.stone[2]);
  c.outline(INK);
  return { c, lights };
}

function helipadPad() {
  const c = new PixelCanvas(28, 16);
  c.fillOval(0, 0, 28, 16, RAMPS.stone[1]);
  c.strokeOval(1, 1, 26, 14, RAMPS.yellow[3]);
  c.vline(10, 5, 10, RAMPS.cream[4]);
  c.vline(17, 5, 10, RAMPS.cream[4]);
  c.hline(10, 17, 7, RAMPS.cream[4]);
  c.hline(10, 17, 8, RAMPS.cream[4]);
  return c;
}

function solarArray() {
  const c = new PixelCanvas(46, 12);
  for (let k = 0; k < 5; k++) {
    const x = 1 + k * 9;
    c.fillPoly([[x, 9], [x + 2, 2], [x + 9, 2], [x + 7, 9]], RAMPS.blue[1]);
    c.fillPoly([[x + 1, 8], [x + 2.5, 3], [x + 8, 3], [x + 6.5, 8]], RAMPS.blue[2]);
    c.line(x + 2, 5, x + 7, 5, RAMPS.blue[3]);
    c.set(x + 3, 3, RAMPS.cyan[4]);
    c.vline(x + 5, 9, 11, RAMPS.stone[1]);
  }
  c.outline(INK);
  return c;
}

function pylon() {
  const c = new PixelCanvas(20, 40);
  for (let y = 6; y < 39; y++) {
    const half = Math.round(2 + (y / 39) * 5);
    c.set(10 - half, y, RAMPS.stone[1]);
    c.set(10 + half - 1, y, RAMPS.stone[1]);
    if (y % 6 === 0) c.line(10 - half, y, 10 + half - 1, y + 5, RAMPS.stone[2]);
  }
  c.hline(1, 18, 8, RAMPS.stone[2]);
  c.hline(3, 16, 15, RAMPS.stone[2]);
  for (const x of [1, 18, 3, 16]) c.set(x, x < 5 || x > 15 ? 9 : 16, RAMPS.cyan[3]);
  c.vline(10, 1, 6, RAMPS.stone[1]);
  c.outline(INK);
  return c;
}

function transformer() {
  const c = new PixelCanvas(20, 18);
  c.fillRect(2, 5, 16, 12, RAMPS.stone[2]);
  c.hline(2, 17, 5, RAMPS.stone[4]);
  for (let x = 4; x < 17; x += 3) c.vline(x, 7, 15, RAMPS.stone[1]);
  for (const x of [5, 10, 15]) { c.fillRect(x - 1, 1, 2, 4, RAMPS.cream[3]); c.set(x - 1, 1, RAMPS.cream[4]); }
  // hazard sign
  c.fillPoly([[9, 8], [13, 14], [5, 14]], RAMPS.yellow[3]);
  c.vline(9, 10, 12, RAMPS.plum[1]);
  c.outline(INK);
  return c;
}

function turbineFrames() {
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const c = new PixelCanvas(40, 58);
    fillCylinder(c, 18, 16, 4, 41, RAMPS.cream);
    c.fillRect(16, 12, 8, 5, RAMPS.cream[4]);
    c.hline(16, 23, 16, RAMPS.cream[2]);
    const hx = 20;
    const hy = 14;
    for (let b = 0; b < 3; b++) {
      const a = (f / 6) * (Math.PI * 2 / 3) + b * (Math.PI * 2 / 3);
      const ex = hx + Math.cos(a) * 17;
      const ey = hy + Math.sin(a) * 13;
      c.line(hx, hy, Math.round(ex), Math.round(ey), RAMPS.cream[4]);
      c.line(hx + 1, hy, Math.round(ex) + 1, Math.round(ey), RAMPS.stone[3]);
      c.set(Math.round(ex), Math.round(ey), RAMPS.coral[3]);
    }
    c.fillRect(hx - 1, hy - 1, 3, 3, RAMPS.stone[2]);
    c.outline(INK);
    frames.push(c);
  }
  return frames;
}

function crane() {
  const c = new PixelCanvas(44, 60);
  for (let y = 12; y < 58; y++) {
    c.set(8, y, RAMPS.yellow[2]);
    c.set(12, y, RAMPS.yellow[1]);
    if (y % 4 === 0) c.line(8, y, 12, y + 3, RAMPS.yellow[3]);
  }
  c.fillRect(2, 8, 41, 3, RAMPS.yellow[3]);
  c.hline(2, 42, 8, RAMPS.yellow[4]);
  for (let x = 4; x < 42; x += 4) c.line(x, 10, x + 3, 8, RAMPS.yellow[2]);
  c.fillRect(1, 10, 8, 5, RAMPS.stone[2]);
  c.fillRect(8, 5, 5, 4, RAMPS.yellow[2]);
  c.vline(36, 11, 30, RAMPS.plum[1]);
  c.fillRect(33, 30, 7, 4, RAMPS.coral[2]);
  c.fillRect(4, 56, 14, 3, RAMPS.stone[2]);
  c.outline(INK);
  return c;
}

function playground() {
  const c = new PixelCanvas(34, 22);
  // swing frame
  c.line(2, 20, 7, 5, RAMPS.coral[2]);
  c.line(12, 20, 7, 5, RAMPS.coral[2]);
  c.line(16, 20, 21, 5, RAMPS.coral[2]);
  c.hline(7, 21, 5, RAMPS.coral[3]);
  c.vline(10, 6, 14, RAMPS.stone[2]);
  c.vline(17, 6, 12, RAMPS.stone[2]);
  c.hline(9, 11, 15, RAMPS.yellow[3]);
  c.hline(16, 18, 13, RAMPS.yellow[3]);
  // slide
  c.fillRect(24, 8, 6, 3, RAMPS.teal[3]);
  c.vline(24, 11, 20, RAMPS.stone[2]);
  c.vline(29, 11, 20, RAMPS.stone[2]);
  c.line(30, 9, 33, 19, RAMPS.yellow[3]);
  c.line(31, 9, 33, 16, RAMPS.yellow[4]);
  c.outline(INK);
  return c;
}

function busStop() {
  const c = new PixelCanvas(20, 20);
  c.fillRect(2, 3, 16, 3, RAMPS.teal[3]);
  c.hline(2, 17, 3, RAMPS.teal[4]);
  c.vline(3, 6, 18, RAMPS.stone[2]);
  c.fillRect(4, 7, 12, 8, RAMPS.glass[3]);
  c.hline(5, 14, 15, RAMPS.brown[3]);
  c.vline(17, 1, 18, RAMPS.stone[2]);
  c.fillRect(15, 0, 5, 4, RAMPS.cream[4]);
  c.set(16, 1, RAMPS.teal[2]); c.set(18, 1, RAMPS.teal[2]);
  c.outline(INK);
  return c;
}

function boatFrames() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = new PixelCanvas(22, 20);
    const dy = f;
    c.fillPoly([[1, 13 + dy], [20, 13 + dy], [17, 17 + dy], [4, 17 + dy]], RAMPS.cream[4]);
    c.hline(2, 19, 15 + dy, RAMPS.coral[2]);
    c.vline(10, 1 + dy, 13 + dy, RAMPS.brown[2]);
    c.fillPoly([[11, 2 + dy], [19, 12 + dy], [11, 12 + dy]], RAMPS.cream[4]);
    c.fillPoly([[9, 4 + dy], [9, 12 + dy], [3, 12 + dy]], RAMPS.yellow[3]);
    c.set(11, 1 + dy, RAMPS.red[3]);
    c.outline(INK);
    frames.push(c);
  }
  return frames;
}

function streetlamp() {
  const c = new PixelCanvas(9, 24);
  const glow = new PixelCanvas(9, 24);
  c.vline(4, 5, 22, RAMPS.stone[3]);
  c.vline(5, 5, 22, RAMPS.stone[2]);
  c.hline(2, 6, 3, RAMPS.teal[2]);
  c.fillRect(1, 3, 4, 3, RAMPS.teal[2]);
  c.hline(1, 4, 3, RAMPS.teal[3]);
  c.fillRect(2, 5, 3, 1, RAMPS.yellow[4]);
  glow.fillRect(1, 5, 5, 2, RAMPS.glow[4]);
  c.fillRect(3, 22, 4, 2, RAMPS.stone[1]);
  c.outline(INK);
  return { c, glow };
}

function bench() {
  const c = new PixelCanvas(14, 8);
  c.hline(1, 12, 2, RAMPS.brown[3]);
  c.hline(1, 12, 4, RAMPS.brown[4]);
  c.hline(1, 12, 5, RAMPS.brown[2]);
  c.vline(2, 5, 7, RAMPS.plum[1]);
  c.vline(11, 5, 7, RAMPS.plum[1]);
  c.outline(INK);
  return c;
}

function cone() {
  const c = new PixelCanvas(7, 9);
  c.fillPoly([[3.5, 0], [6, 7], [1, 7]], RAMPS.orange[3]);
  c.hline(2, 4, 4, RAMPS.cream[4]);
  c.fillRect(0, 7, 7, 2, RAMPS.orange[1]);
  c.outline(INK);
  return c;
}

function barrier() {
  const c = new PixelCanvas(16, 9);
  for (let x = 1; x < 15; x++) c.vline(x, 1, 3, ((x >> 1) % 2) ? RAMPS.red[2] : RAMPS.cream[4]);
  c.vline(2, 4, 8, RAMPS.stone[2]);
  c.vline(13, 4, 8, RAMPS.stone[2]);
  c.outline(INK);
  return c;
}

function flagFrames() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = new PixelCanvas(14, 26);
    c.vline(2, 1, 25, RAMPS.stone[3]);
    for (let x = 3; x < 13; x++) {
      const wave = Math.round(Math.sin(x / 2 + f * Math.PI) * 0.8);
      c.vline(x, 2 + wave, 8 + wave, x < 8 ? RAMPS.orange[3] : RAMPS.teal[3]);
      c.set(x, 2 + wave, x < 8 ? RAMPS.orange[4] : RAMPS.teal[4]);
    }
    c.outline(INK);
    frames.push(c);
  }
  return frames;
}

/** NEXUS commuter train, side view facing east (flip for west). */
function trainUnit(kind) {
  const L = kind === 'loco' ? 34 : 30;
  const c = new PixelCanvas(L + 2, 17);
  const ox = 1;
  const top = 2;
  const body = kind === 'loco' ? RAMPS.teal : RAMPS.cream;
  // body with a rounded nose on the loco
  for (let x = 0; x < L; x++) {
    const nose = kind === 'loco' ? Math.max(0, x - (L - 7)) : 0;
    const t = top + Math.floor((nose * nose) / 6);
    c.vline(ox + x, t, 12, body[2]);
    c.set(ox + x, t, body[4]);
    c.set(ox + x, t + 1, body[3]);
    c.set(ox + x, 12, body[1]);
  }
  // livery stripe + windows
  c.hline(ox, ox + L - 3, 9, RAMPS.orange[3]);
  c.hline(ox, ox + L - 3, 10, RAMPS.orange[2]);
  const winEnd = kind === 'loco' ? L - 9 : L - 3;
  for (let x = ox + 3; x < ox + winEnd; x += 5) {
    c.fillRect(x, top + 3, 3, 4, RAMPS.glass[2]);
    c.set(x, top + 3, RAMPS.glass[4]);
  }
  if (kind === 'loco') {
    c.fillPoly([[ox + L - 8, top + 3], [ox + L - 3, top + 5], [ox + L - 3, top + 7], [ox + L - 8, top + 7]], RAMPS.glass[3]);
    c.set(ox + L - 2, 10, RAMPS.yellow[4]);
  }
  // bogies
  for (const bx of [ox + 3, ox + L - 10]) {
    c.fillRect(bx, 13, 7, 2, RAMPS.plum[1]);
    c.fillOval(bx, 13, 3, 3, RAMPS.plum[0]);
    c.fillOval(bx + 4, 13, 3, 3, RAMPS.plum[0]);
  }
  c.outline(INK);
  return c;
}

export function buildCityProps() {
  const out = [];
  out.push({ name: 'train-loco', canvas: trainUnit('loco') });
  out.push({ name: 'train-car', canvas: trainUnit('car') });
  // trees & greenery
  out.push({ name: 'tree-oak', canvas: makeTree('oak', 1, 1) });
  out.push({ name: 'tree-lime', canvas: makeTree('lime', 0.9, 2) });
  out.push({ name: 'tree-blossom', canvas: makeTree('blossom', 1, 3) });
  out.push({ name: 'tree-autumn', canvas: makeTree('autumn', 1, 4) });
  out.push({ name: 'tree-teal', canvas: makeTree('teal', 1.1, 5) });
  out.push({ name: 'tree-pine', canvas: makePine(1, 1) });
  out.push({ name: 'tree-bush', canvas: makeBush('oak', 2) });
  out.push({ name: 'flowerbed', canvas: makeFlowerBed(3) });
  out.push({ name: 'shadow-s', canvas: makeShadow(12, 5) });
  out.push({ name: 'shadow-m', canvas: makeShadow(24, 8) });
  out.push({ name: 'shadow-l', canvas: makeShadow(48, 12) });
  // vehicles: side view east (flip for west), front (south), back (north); emergency 2 frames
  for (const type of Object.keys(VEHICLE_TYPES)) {
    if (type === 'car') continue;
    const frames = VEHICLE_TYPES[type].lights ? [0, 1] : [0];
    for (const f of frames) {
      const sfx = frames.length > 1 ? `-${f}` : '';
      out.push({ name: `${type}-side${sfx}`, canvas: vehicleSide(type, null, f) });
      out.push({ name: `${type}-front${sfx}`, canvas: vehicleEnd(type, 'front', null, f) });
      out.push({ name: `${type}-back${sfx}`, canvas: vehicleEnd(type, 'back', null, f) });
    }
  }
  for (const [color, ramp] of Object.entries(CAR_COLORS)) {
    out.push({ name: `car-${color}-side`, canvas: vehicleSide('car', ramp) });
    out.push({ name: `car-${color}-front`, canvas: vehicleEnd('car', 'front', ramp) });
    out.push({ name: `car-${color}-back`, canvas: vehicleEnd('car', 'back', ramp) });
  }
  // fixtures
  fountainFrames(true).forEach((f, i) => out.push({ name: `fountain-${i}`, canvas: f }));
  fountainFrames(false).forEach((f, i) => out.push({ name: `plaza-fountain-${i}`, canvas: f }));
  out.push({ name: 'pond', canvas: pond() });
  radarFrames().forEach((f, i) => out.push({ name: `radar-${i}`, canvas: f }));
  const m = mast();
  out.push({ name: 'mast', canvas: m.c });
  out.push({ name: 'mast-lights', canvas: m.lights });
  out.push({ name: 'helipad-pad', canvas: helipadPad() });
  out.push({ name: 'solar-array', canvas: solarArray() });
  out.push({ name: 'pylon', canvas: pylon() });
  out.push({ name: 'transformer', canvas: transformer() });
  turbineFrames().forEach((f, i) => out.push({ name: `wind-turbine-${i}`, canvas: f }));
  out.push({ name: 'crane', canvas: crane() });
  out.push({ name: 'playground', canvas: playground() });
  out.push({ name: 'bus-stop', canvas: busStop() });
  boatFrames().forEach((f, i) => out.push({ name: `boat-${i}`, canvas: f }));
  const lamp = streetlamp();
  out.push({ name: 'streetlamp', canvas: lamp.c });
  out.push({ name: 'streetlamp-glow', canvas: lamp.glow });
  out.push({ name: 'bench', canvas: bench() });
  out.push({ name: 'cone', canvas: cone() });
  out.push({ name: 'barrier', canvas: barrier() });
  flagFrames().forEach((f, i) => out.push({ name: `flag-${i}`, canvas: f }));
  void hash2;
  return out;
}
