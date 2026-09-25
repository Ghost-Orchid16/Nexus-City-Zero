// Building catalog for every district. Each entry yields `name` (+ `name-lights` when the
// building has night windows) and optional animation frames `name-0..n`.
import { PixelCanvas, RAMPS, INK, hash2, ditherOn } from '../lib/draw.mjs';
import { makeBuilding, drawSign } from './building-kit.mjs';

// ---------------------------------------------------------------- helpers
/** Vertical cylinder shading: lit left, shaded right (light from the upper left). */
function cylinderTone(ramp, t) {
  if (t < 0.12) return ramp[3];
  if (t < 0.3) return ramp[4];
  if (t < 0.55) return ramp[3];
  if (t < 0.82) return ramp[2];
  return ramp[1];
}

function fillCylinder(c, x, y, w, h, ramp) {
  for (let xx = 0; xx < w; xx++) {
    const col = cylinderTone(ramp, xx / Math.max(1, w - 1));
    c.vline(x + xx, y, y + h - 1, col);
  }
}

function addLights(out, name, b) {
  out.push({ name, canvas: b.canvas });
  if (b.lights && b.lights.bounds()) out.push({ name: `${name}-lights`, canvas: b.lights });
}

// ---------------------------------------------------------------- water facility
function waterTower() {
  const W = 26;
  const H = 46;
  const c = new PixelCanvas(W, H);
  const lights = new PixelCanvas(W, H);
  // legs + cross bracing
  for (const lx of [6, 18]) c.fillRect(lx, 18, 2, 27, RAMPS.stone[1]);
  c.fillRect(12, 18, 2, 27, RAMPS.stone[2]);
  for (let y = 22; y < 44; y += 7) { c.line(7, y, 13, y + 5, RAMPS.stone[2]); c.line(18, y, 13, y + 5, RAMPS.stone[1]); }
  // tank
  fillCylinder(c, 3, 8, 20, 11, RAMPS.blue);
  c.fillOval(3, 16, 20, 5, RAMPS.blue[1]);
  fillCylinder(c, 3, 8, 20, 10, RAMPS.blue);
  c.hline(4, 21, 12, RAMPS.cream[4]);
  c.hline(4, 21, 13, RAMPS.cream[3]);
  // drop emblem
  c.set(11, 9, RAMPS.cream[4]); c.fillRect(10, 10, 3, 2, RAMPS.cream[4]);
  // conical roof
  c.fillPoly([[3, 8.5], [13, 2], [23, 8.5]], RAMPS.teal[2]);
  c.fillPoly([[3, 8.5], [13, 2], [13, 8.5]], RAMPS.teal[3]);
  c.set(13, 1, RAMPS.red[3]);
  lights.set(13, 1, RAMPS.red[4]);
  c.outline(INK);
  return { canvas: c, lights };
}

function clarifierFrames() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const W = 34;
    const H = 20;
    const c = new PixelCanvas(W, H);
    c.fillOval(1, 1, 32, 18, RAMPS.stone[3]);
    c.fillOval(1, 3, 32, 16, RAMPS.stone[1]);
    c.fillOval(3, 3, 28, 14, RAMPS.water[2]);
    c.fillOval(7, 5, 20, 10, RAMPS.water[3]);
    c.strokeOval(1, 1, 32, 18, RAMPS.stone[4]);
    // rotating bridge arm (ellipse-projected)
    const ang = (f / 4) * Math.PI + 0.3;
    const cx = 17;
    const cy = 10;
    const ex = cx + Math.cos(ang) * 14;
    const ey = cy + Math.sin(ang) * 7;
    const bx = cx - Math.cos(ang) * 14;
    const by = cy - Math.sin(ang) * 7;
    c.line(Math.round(bx), Math.round(by), Math.round(ex), Math.round(ey), RAMPS.yellow[3]);
    c.line(Math.round(bx), Math.round(by) - 1, Math.round(ex), Math.round(ey) - 1, RAMPS.yellow[4]);
    c.fillRect(cx - 1, cy - 2, 3, 3, RAMPS.stone[4]);
    // ripples following the arm
    for (let k = 0; k < 6; k++) {
      const a = ang - 0.35 - k * 0.12;
      c.set(Math.round(cx + Math.cos(a) * (6 + k)), Math.round(cy + Math.sin(a) * (3 + k * 0.5)), RAMPS.water[4]);
    }
    c.outline(INK);
    frames.push(c);
  }
  return frames;
}

function reservoirBasin() {
  const W = 72;
  const H = 24;
  const c = new PixelCanvas(W, H);
  c.fillRect(1, 1, W - 2, H - 2, RAMPS.stone[3]);
  c.hline(1, W - 2, 1, RAMPS.stone[4]);
  // inner wet walls (visible when the level drops)
  c.fillRect(4, 4, W - 8, H - 7, RAMPS.stone[1]);
  for (let y = 5; y < H - 4; y += 3) c.hline(5, W - 6, y, RAMPS.stone[2]);
  c.fillRect(4, 4, W - 8, 2, RAMPS.stone[0]);
  // pump outlet
  c.fillRect(W - 10, 0, 6, 4, RAMPS.blue[2]);
  c.hline(W - 10, W - 5, 0, RAMPS.blue[3]);
  c.outline(INK);
  return c;
}

function reservoirWaterFrames() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = new PixelCanvas(64, 15);
    c.fillRect(0, 0, 64, 15, RAMPS.water[2]);
    c.hline(0, 63, 0, RAMPS.water[4]);
    c.hline(0, 63, 1, RAMPS.water[3]);
    for (let y = 3; y < 15; y += 3) {
      for (let x = 0; x < 64; x++) {
        if ((x + f * 3 + y * 5) % 17 < 3) c.set(x, y, RAMPS.water[3]);
      }
    }
    frames.push(c);
  }
  return frames;
}

// ---------------------------------------------------------------- energy
function reactor(active) {
  const W = 50;
  const H = 54;
  const c = new PixelCanvas(W, H);
  const lights = new PixelCanvas(W, H);
  // containment dome building (left)
  const dome = makeBuilding({
    w: 20, roofD: 3, wallH: 14, wall: RAMPS.stone, roof: RAMPS.stone,
    windows: { rows: 1, cols: 2, ww: 3, wh: 3, gx: 6, top: 3, glass: RAMPS.cyan },
    door: { w: 4, h: 6, color: RAMPS.yellow }, seed: 21
  });
  c.blit(dome.canvas, 1, H - dome.canvas.h);
  if (active) lights.blit(dome.lights, 1, H - dome.canvas.h);
  c.fillOval(4, H - dome.canvas.h - 9, 16, 16, RAMPS.cream[3]);
  c.fillOval(6, H - dome.canvas.h - 7, 12, 12, RAMPS.cream[4]);
  c.fillRect(4, H - dome.canvas.h - 1, 16, 3, RAMPS.cream[2]);
  // hyperboloid cooling tower (right)
  const tx = 22;
  const top = 6;
  const bottom = H - 2;
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / (bottom - top);
    const waist = 1 - 0.28 * Math.sin(Math.PI * Math.min(1, t * 1.25));
    const half = Math.round(13 * waist + t * 2);
    const cx = tx + 13;
    for (let x = cx - half; x <= cx + half; x++) {
      const u = (x - (cx - half)) / Math.max(1, 2 * half);
      c.set(x, y, cylinderTone(RAMPS.stone, u));
    }
    // accent bands
    if (y === top + 6 || y === top + 7) c.hline(cx - half + 1, cx + half - 1, y, active ? RAMPS.teal[3] : RAMPS.stone[1]);
    if (y === bottom - 8) c.hline(cx - half + 1, cx + half - 1, y, RAMPS.yellow[2]);
  }
  // top opening (dark, glowing when active)
  c.fillOval(tx + 1, top - 3, 24, 7, RAMPS.stone[4]);
  c.fillOval(tx + 3, top - 2, 20, 5, active ? RAMPS.teal[2] : RAMPS.plum[0]);
  if (active) {
    lights.fillOval(tx + 3, top - 2, 20, 5, RAMPS.teal[4]);
    lights.hline(tx + 5, tx + 21, top + 6, RAMPS.teal[4]);
    lights.hline(tx + 5, tx + 21, top + 7, RAMPS.cyan[4]);
  }
  c.outline(INK);
  return { canvas: c, lights };
}

function batteryBank() {
  const c = new PixelCanvas(40, 16);
  const lights = new PixelCanvas(40, 16);
  for (let k = 0; k < 3; k++) {
    const x = 1 + k * 13;
    c.fillRect(x, 3, 12, 11, RAMPS.teal[2]);
    c.fillRect(x, 1, 12, 3, RAMPS.teal[3]);
    c.hline(x, x + 11, 1, RAMPS.teal[4]);
    c.vline(x + 11, 3, 13, RAMPS.teal[1]);
    for (let y = 6; y < 13; y += 2) c.hline(x + 2, x + 8, y, RAMPS.teal[1]);
    c.set(x + 9, 5, RAMPS.lime[3]);
    lights.set(x + 9, 5, RAMPS.lime[4]);
    c.set(x + 9, 7, RAMPS.lime[3]);
    lights.set(x + 9, 7, RAMPS.lime[4]);
  }
  c.outline(INK);
  return { canvas: c, lights };
}

// ---------------------------------------------------------------- industrial
function smokestack() {
  const c = new PixelCanvas(14, 60);
  fillCylinder(c, 2, 4, 10, 55, RAMPS.cream);
  for (const y of [8, 16]) fillCylinder(c, 2, y, 10, 4, RAMPS.red);
  c.fillOval(1, 1, 12, 5, RAMPS.stone[1]);
  c.fillOval(3, 2, 8, 3, RAMPS.plum[0]);
  // ladder
  for (let y = 22; y < 57; y += 2) c.set(9, y, RAMPS.stone[1]);
  c.fillRect(0, 56, 14, 4, RAMPS.stone[2]);
  c.outline(INK);
  return c;
}

function containers() {
  const c = new PixelCanvas(34, 28);
  const box = (x, y, ramp) => {
    c.fillRect(x, y, 15, 9, ramp[2]);
    c.hline(x, x + 14, y, ramp[4]);
    c.hline(x, x + 14, y + 1, ramp[3]);
    c.vline(x + 14, y, y + 8, ramp[1]);
    for (let xx = x + 2; xx < x + 14; xx += 2) c.vline(xx, y + 3, y + 7, ramp[1]);
  };
  box(1, 18, RAMPS.teal);
  box(17, 18, RAMPS.coral);
  box(1, 9, RAMPS.yellow);
  box(17, 9, RAMPS.blue);
  box(9, 0, RAMPS.magenta);
  c.outline(INK);
  return c;
}

// ---------------------------------------------------------------- transport
function busTerminal() {
  const W = 58;
  const H = 30;
  const c = new PixelCanvas(W, H);
  // canopy posts
  for (let x = 6; x < W - 4; x += 12) c.fillRect(x, 12, 2, 16, RAMPS.stone[2]);
  // platform
  c.fillRect(1, 25, W - 2, 4, RAMPS.stone[3]);
  c.hline(1, W - 2, 25, RAMPS.stone[4]);
  // benches
  for (let x = 10; x < W - 8; x += 12) { c.hline(x, x + 5, 22, RAMPS.brown[3]); c.set(x, 23, RAMPS.brown[1]); c.set(x + 5, 23, RAMPS.brown[1]); }
  // wavy canopy roof
  for (let x = 1; x < W - 1; x++) {
    const wave = Math.round(Math.sin(x / 6) * 1.5);
    c.vline(x, 5 + wave, 11 + wave, RAMPS.orange[2]);
    c.set(x, 5 + wave, RAMPS.orange[4]);
    c.set(x, 6 + wave, RAMPS.orange[3]);
    c.set(x, 11 + wave, RAMPS.orange[1]);
  }
  // route display
  c.fillRect(W - 14, 13, 9, 6, RAMPS.plum[1]);
  c.hline(W - 13, W - 7, 15, RAMPS.lime[3]);
  c.hline(W - 13, W - 9, 17, RAMPS.yellow[3]);
  c.outline(INK);
  return c;
}

function trainStation() {
  const b = makeBuilding({
    w: 76, roofD: 4, wallH: 24, wall: RAMPS.cream, roof: RAMPS.brown, floors: 0,
    windows: { rows: 1, cols: 8, ww: 4, wh: 6, gx: 4, top: 8, frame: RAMPS.brown[1], skipDoorCols: 2 },
    door: { w: 12, h: 10, glassDoor: true, color: RAMPS.brown }, seed: 31
  });
  const W = b.canvas.w;
  const archH = 18;
  const c = new PixelCanvas(W, b.canvas.h + archH);
  const lights = new PixelCanvas(W, b.canvas.h + archH);
  c.blit(b.canvas, 0, archH);
  lights.blit(b.lights, 0, archH);
  // glass barrel-vault roof over the concourse
  const cx = W / 2;
  for (let x = 4; x < W - 4; x++) {
    const t = (x - cx) / (W / 2 - 4);
    const hgt = Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * archH);
    for (let y = archH + 2 - hgt; y <= archH + 2; y++) {
      const rib = (x % 8) === 0;
      c.set(x, y, rib ? RAMPS.brown[1] : (y - (archH + 2 - hgt)) < 2 ? RAMPS.glass[4] : x < cx ? RAMPS.glass[3] : RAMPS.glass[2]);
    }
  }
  // clock
  c.fillOval(cx - 4, archH + 5, 8, 8, RAMPS.cream[4]);
  c.strokeOval(cx - 4, archH + 5, 8, 8, RAMPS.brown[1]);
  c.vline(Math.floor(cx), archH + 6, archH + 9, RAMPS.plum[1]);
  c.hline(Math.floor(cx), Math.floor(cx) + 2, archH + 9, RAMPS.plum[1]);
  c.outline(INK);
  return { canvas: c, lights };
}

// ---------------------------------------------------------------- catalog
export function buildBuildings() {
  const out = [];

  // --- Water Facility
  addLights(out, 'water-tower', waterTower());
  addLights(out, 'pump-house', makeBuilding({
    w: 42, roofD: 9, wallH: 22, wall: RAMPS.cream, roof: RAMPS.blue, floors: 0,
    windows: { rows: 1, cols: 4, ww: 4, wh: 5, gx: 4, top: 5, glass: RAMPS.cyan, skipDoorCols: 1 },
    door: { w: 6, h: 8, color: RAMPS.blue, awning: RAMPS.blue },
    roofProps: [{ type: 'vent', x: 5, y: 3 }, { type: 'vent', x: 12, y: 3 }, { type: 'tank', x: 30, y: 1 }],
    decorate(c, l, { ox, fy, w, wallH }) {
      // blue pipes along the facade
      c.hline(ox + 1, ox + w - 2, fy + wallH - 5, RAMPS.blue[2]);
      c.hline(ox + 1, ox + w - 2, fy + wallH - 6, RAMPS.blue[3]);
      drawSign(c, ox + 3, fy + 3, 8, 5, RAMPS.blue, 'dots');
    },
    seed: 41
  }));
  clarifierFrames().forEach((f, i) => out.push({ name: `clarifier-${i}`, canvas: f }));
  out.push({ name: 'reservoir', canvas: reservoirBasin() });
  reservoirWaterFrames().forEach((f, i) => out.push({ name: `reservoir-water-${i}`, canvas: f }));

  // --- Residential
  const house = (name, spec) => addLights(out, name, makeBuilding({
    windows: { rows: 1, cols: 2, ww: 4, wh: 4, gx: 10, top: 3, frame: RAMPS.brown[1], sill: RAMPS.cream[4] },
    door: { w: 4, h: 7, color: RAMPS.teal }, ...spec
  }));
  house('house-a', { w: 26, roofD: 7, gableH: 8, wallH: 16, wall: RAMPS.cream, roof: RAMPS.coral, roofStyle: 'gableFront', seed: 51 });
  house('house-b', { w: 34, roofD: 12, wallH: 16, wall: RAMPS.sand, roof: RAMPS.violet, roofStyle: 'gable',
    windows: { rows: 1, cols: 3, ww: 4, wh: 4, gx: 6, top: 3, frame: RAMPS.brown[1], sill: RAMPS.cream[4] },
    door: { w: 4, h: 7, color: RAMPS.coral, offset: 9 }, roofProps: [{ type: 'chimney', x: 6, y: 4 }], seed: 52 });
  house('house-c', { w: 24, roofD: 7, gableH: 8, wallH: 15, wall: RAMPS.yellow, roof: RAMPS.teal, roofStyle: 'gableFront',
    door: { w: 4, h: 7, color: RAMPS.brown }, seed: 53 });
  house('house-d', { w: 28, roofD: 10, wallH: 16, wall: RAMPS.cream, roof: RAMPS.orange, roofStyle: 'hip',
    door: { w: 4, h: 7, color: RAMPS.violet }, seed: 54 });
  house('house-e', { w: 24, roofD: 7, gableH: 8, wallH: 15, wall: RAMPS.coral, roof: RAMPS.blue, roofStyle: 'gableFront',
    door: { w: 4, h: 7, color: RAMPS.cream }, seed: 55 });
  house('house-f', { w: 30, roofD: 11, wallH: 16, wall: RAMPS.cream, roof: RAMPS.green, roofStyle: 'gable',
    roofProps: [{ type: 'chimney', x: 21, y: 3 }], door: { w: 4, h: 7, color: RAMPS.orange, offset: -7 }, seed: 56 });
  const balconies = (ramp) => (c, l, { ox, fy, w, wallH }) => {
    for (let y = fy + 11; y < fy + wallH - 6; y += 9) {
      for (let x = ox + 3; x < ox + w - 6; x += 10) {
        c.hline(x, x + 6, y, ramp[4]);
        c.hline(x, x + 6, y + 1, ramp[2]);
        for (let k = x; k <= x + 6; k += 2) c.set(k, y - 1, ramp[4]);
      }
    }
  };
  addLights(out, 'apartments-a', makeBuilding({
    w: 46, roofD: 9, wallH: 44, wall: RAMPS.coral, roof: RAMPS.plum, floors: 9,
    windows: { rows: 4, cols: 5, ww: 4, wh: 5, gx: 4, gy: 4, top: 3, frame: RAMPS.coral[0], skipDoorCols: 1 },
    door: { w: 6, h: 7, glassDoor: true, color: RAMPS.coral },
    roofProps: [{ type: 'garden', x: 3, y: 2, w: 12, h: 4 }, { type: 'ac', x: 34, y: 3 }],
    decorate: balconies(RAMPS.cream), seed: 57
  }));
  addLights(out, 'apartments-b', makeBuilding({
    w: 40, roofD: 9, wallH: 32, wall: RAMPS.sand, roof: RAMPS.brown, floors: 8,
    windows: { rows: 3, cols: 5, ww: 4, wh: 4, gx: 3, gy: 4, top: 3, frame: RAMPS.brown[1], skipDoorCols: 1 },
    door: { w: 6, h: 7, color: RAMPS.teal, awning: RAMPS.teal },
    roofProps: [{ type: 'solar', x: 3, y: 2, n: 4 }, { type: 'vent', x: 32, y: 4 }], seed: 58
  }));

  // --- Downtown
  addLights(out, 'office-violet', makeBuilding({
    w: 38, roofD: 9, wallH: 58, wall: RAMPS.violet, roof: RAMPS.plum, floors: 7,
    windows: { rows: 7, cols: 5, ww: 4, wh: 4, gx: 3, gy: 3, top: 3, frame: RAMPS.violet[4], glass: RAMPS.glass, skipDoorCols: 1 },
    door: { w: 8, h: 7, glassDoor: true, color: RAMPS.violet },
    roofProps: [{ type: 'ac', x: 4, y: 3 }, { type: 'ac', x: 12, y: 3 }, { type: 'dish', x: 28, y: 2 }], seed: 61
  }));
  addLights(out, 'office-teal', makeBuilding({
    w: 30, roofD: 8, wallH: 70, wall: RAMPS.teal, roof: RAMPS.plum,
    windows: { rows: 13, cols: 5, ww: 4, wh: 4, gx: 1, gy: 1, top: 3, style: 'curtain', glass: RAMPS.glass },
    door: { w: 8, h: 7, glassDoor: true, color: RAMPS.teal },
    roofProps: [{ type: 'antenna', x: 8, y: 4, h: 8 }, { type: 'ac', x: 18, y: 2 }], seed: 62
  }));
  addLights(out, 'nexus-tower', makeBuilding({
    w: 34, roofD: 9, wallH: 104, wall: RAMPS.blue, roof: RAMPS.violet,
    windows: { rows: 20, cols: 6, ww: 4, wh: 4, gx: 1, gy: 1, top: 4, style: 'curtain', glass: RAMPS.glass, warmRatio: 0.5 },
    door: { w: 10, h: 8, glassDoor: true, color: RAMPS.violet },
    roofProps: [{ type: 'antenna', x: 17, y: 4, h: 18 }, { type: 'beacon', x: 5, y: 3 }, { type: 'beacon', x: 27, y: 3 }],
    decorate(c, l, { ox, fy, w }) {
      // magenta light fins framing the curtain wall + the NEXUS emblem
      c.vline(ox + 1, fy + 2, fy + 96, RAMPS.magenta[3]);
      c.vline(ox + w - 2, fy + 2, fy + 96, RAMPS.magenta[2]);
      l.vline(ox + 1, fy + 2, fy + 96, RAMPS.magenta[4]);
      l.vline(ox + w - 2, fy + 2, fy + 96, RAMPS.magenta[4]);
      const ex = ox + Math.floor(w / 2) - 4;
      const ey = fy + 3;
      c.fillRect(ex, ey, 9, 9, RAMPS.plum[1]);
      c.vline(ex + 2, ey + 2, ey + 6, RAMPS.cyan[4]);
      c.vline(ex + 6, ey + 2, ey + 6, RAMPS.cyan[4]);
      for (let k = 0; k < 5; k++) c.set(ex + 2 + k, ey + 2 + k, RAMPS.cyan[4]);
      l.vline(ex + 2, ey + 2, ey + 6, RAMPS.cyan[4]);
      l.vline(ex + 6, ey + 2, ey + 6, RAMPS.cyan[4]);
      for (let k = 0; k < 5; k++) l.set(ex + 2 + k, ey + 2 + k, RAMPS.cyan[4]);
    },
    seed: 63
  }));
  addLights(out, 'shops', makeBuilding({
    w: 42, roofD: 8, wallH: 22, wall: RAMPS.cream, roof: RAMPS.stone,
    roofProps: [{ type: 'ac', x: 6, y: 2 }, { type: 'ac', x: 30, y: 3 }],
    decorate(c, l, { ox, fy, w, wallH }) {
      const awnings = [RAMPS.coral, RAMPS.yellow, RAMPS.teal];
      const shopW = Math.floor((w - 4) / 3);
      awnings.forEach((ramp, i) => {
        const sx = ox + 2 + i * shopW;
        // display window
        c.fillRect(sx + 1, fy + wallH - 11, shopW - 3, 7, RAMPS.glass[2]);
        c.fillRect(sx + 1, fy + wallH - 11, shopW - 3, 3, RAMPS.glass[3]);
        l.fillRect(sx + 1, fy + wallH - 11, shopW - 3, 7, RAMPS.glow[3]);
        // awning stripes
        for (let x = sx; x < sx + shopW - 1; x++) {
          const band = Math.floor((x - sx) / 2) % 2 === 0;
          c.set(x, fy + wallH - 15, ramp[3]);
          c.set(x, fy + wallH - 14, band ? ramp[2] : RAMPS.cream[4]);
          c.set(x, fy + wallH - 13, band ? ramp[1] : RAMPS.cream[3]);
        }
        drawSign(c, sx + 2, fy + 3, shopW - 5, 4, ramp, 'dots');
      });
    },
    seed: 64
  }));

  // --- Medical District
  addLights(out, 'hospital', makeBuilding({
    w: 60, roofD: 14, wallH: 42, wall: RAMPS.cream, roof: RAMPS.stone, floors: 9,
    windows: { rows: 4, cols: 9, ww: 4, wh: 4, gx: 2, gy: 5, top: 3, glass: RAMPS.cyan, skipDoorCols: 2 },
    door: { w: 10, h: 8, glassDoor: true, color: RAMPS.stone, awning: RAMPS.red },
    roofProps: [{ type: 'helipad', x: 20, y: 1, r: 16 }, { type: 'ac', x: 4, y: 4 }, { type: 'ac', x: 48, y: 6 }, { type: 'beacon', x: 56, y: 2 }],
    decorate(c, l, { ox, fy, w }) {
      const sx = ox + w - 13;
      c.fillRect(sx, fy + 2, 9, 9, RAMPS.cream[4]);
      c.fillRect(sx + 3, fy + 3, 3, 7, RAMPS.red[2]);
      c.fillRect(sx + 1, fy + 5, 7, 3, RAMPS.red[2]);
      l.fillRect(sx + 3, fy + 3, 3, 7, RAMPS.red[4]);
      l.fillRect(sx + 1, fy + 5, 7, 3, RAMPS.red[4]);
      c.hline(ox + 2, ox + w - 3, fy + 12, RAMPS.red[2]);
    },
    seed: 71
  }));
  addLights(out, 'clinic', makeBuilding({
    w: 36, roofD: 8, wallH: 22, wall: RAMPS.cream, roof: RAMPS.teal,
    windows: { rows: 2, cols: 4, ww: 4, wh: 4, gx: 3, gy: 3, top: 3, glass: RAMPS.cyan, skipDoorCols: 1 },
    door: { w: 6, h: 7, glassDoor: true, color: RAMPS.teal, awning: RAMPS.teal },
    decorate(c, l, { ox, fy }) {
      c.fillRect(ox + 2, fy + 2, 7, 7, RAMPS.cream[4]);
      c.fillRect(ox + 4, fy + 3, 3, 5, RAMPS.green[3]);
      c.fillRect(ox + 3, fy + 4, 5, 3, RAMPS.green[3]);
      l.fillRect(ox + 4, fy + 3, 3, 5, RAMPS.lime[4]);
      l.fillRect(ox + 3, fy + 4, 5, 3, RAMPS.lime[4]);
    },
    seed: 72
  }));
  addLights(out, 'pharmacy', makeBuilding({
    w: 26, roofD: 7, wallH: 18, wall: RAMPS.green, roof: RAMPS.cream,
    windows: { rows: 1, cols: 2, ww: 4, wh: 4, gx: 10, top: 3, glass: RAMPS.glass },
    door: { w: 5, h: 7, glassDoor: true, color: RAMPS.green },
    decorate(c, l, { ox, fy, w }) {
      const sx = ox + Math.floor(w / 2) - 2;
      c.fillRect(sx - 1, fy - 1, 7, 6, RAMPS.cream[4]);
      c.vline(sx + 2, fy, fy + 3, RAMPS.green[2]);
      c.hline(sx, sx + 4, fy + 1, RAMPS.green[2]);
      l.vline(sx + 2, fy, fy + 3, RAMPS.lime[4]);
      l.hline(sx, sx + 4, fy + 1, RAMPS.lime[4]);
    },
    seed: 73
  }));

  // --- Energy Station
  addLights(out, 'power-plant', makeBuilding({
    w: 52, roofD: 10, wallH: 30, wall: RAMPS.orange, roof: RAMPS.stone, floors: 0,
    windows: { rows: 2, cols: 6, ww: 4, wh: 6, gx: 3, gy: 3, top: 4, frame: RAMPS.orange[0], skipDoorCols: 2 },
    door: { w: 10, h: 10, color: RAMPS.stone },
    roofProps: [{ type: 'vent', x: 4, y: 3 }, { type: 'ac', x: 38, y: 4 }],
    decorate(c, l, { ox, fy, w }) {
      // brick coursing
      for (let y = fy + 2; y < fy + 26; y += 3) for (let x = ox + 2; x < ox + w - 2; x++) {
        if ((x + (y % 2) * 3) % 6 === 0 && c.get(x, y)[0] === 232) c.set(x, y, RAMPS.orange[1]);
      }
      drawSign(c, ox + w - 12, fy + 2, 8, 6, RAMPS.yellow, 'bolt', RAMPS.plum[1]);
      l.fillRect(ox + w - 12, fy + 2, 8, 6, RAMPS.yellow[4]);
    },
    seed: 81
  }));
  addLights(out, 'reactor', reactor(false));
  const act = reactor(true);
  out.push({ name: 'reactor-active', canvas: act.canvas });
  out.push({ name: 'reactor-active-lights', canvas: act.lights });
  addLights(out, 'battery-bank', batteryBank());

  // --- Emergency Command Center
  addLights(out, 'command-center', makeBuilding({
    w: 62, roofD: 12, wallH: 34, wall: RAMPS.teal, roof: RAMPS.stone, floors: 0,
    windows: { rows: 1, cols: 1, ww: 50, wh: 8, top: 4, style: 'curtain', glass: RAMPS.glass, warmRatio: 0 },
    door: { w: 12, h: 9, glassDoor: true, color: RAMPS.teal, awning: RAMPS.orange },
    roofProps: [{ type: 'helipad', x: 36, y: 0, r: 16 }, { type: 'ac', x: 4, y: 3 }, { type: 'beacon', x: 58, y: 2 }],
    decorate(c, l, { ox, fy, w, wallH }) {
      // orange command band + emblem star + lower window row
      c.hline(ox + 1, ox + w - 2, fy + 14, RAMPS.orange[3]);
      c.hline(ox + 1, ox + w - 2, fy + 15, RAMPS.orange[2]);
      for (let x = ox + 4; x < ox + w - 4; x += 6) {
        if (Math.abs(x - (ox + w / 2)) < 9) continue;
        c.fillRect(x, fy + 19, 4, 5, RAMPS.glass[2]);
        c.set(x, fy + 19, RAMPS.glass[4]);
        l.fillRect(x, fy + 19, 4, 5, RAMPS.glow[3]);
      }
      const sx = ox + Math.floor(w / 2);
      const sy = fy + 18;
      c.fillRect(sx - 4, sy - 1, 9, 9, RAMPS.cream[4]);
      c.vline(sx, sy, sy + 6, RAMPS.orange[2]);
      c.hline(sx - 3, sx + 3, sy + 3, RAMPS.orange[2]);
      c.set(sx - 1, sy + 4, RAMPS.orange[2]); c.set(sx + 1, sy + 4, RAMPS.orange[2]);
      c.set(sx - 2, sy + 6, RAMPS.orange[2]); c.set(sx + 2, sy + 6, RAMPS.orange[2]);
      void wallH;
    },
    seed: 91
  }));

  // --- Transport Hub
  out.push({ name: 'bus-terminal', canvas: busTerminal() });
  addLights(out, 'train-station', trainStation());

  // --- Industrial
  addLights(out, 'factory', makeBuilding({
    w: 52, roofD: 12, wallH: 26, wall: RAMPS.orange, roof: RAMPS.brown, roofStyle: 'sawtooth',
    windows: { rows: 1, cols: 5, ww: 5, wh: 4, gx: 4, top: 6, frame: RAMPS.brown[0] },
    door: { w: 12, h: 10, color: RAMPS.stone },
    decorate(c, l, { ox, fy, w, wallH }) {
      // hazard stripe along the base + loading door slats
      for (let x = ox + 1; x < ox + w - 1; x++) c.set(x, fy + wallH - 3, ((x >> 1) % 2) ? RAMPS.yellow[3] : RAMPS.plum[1]);
      void l;
    },
    seed: 101
  }));
  out.push({ name: 'smokestack', canvas: smokestack() });
  addLights(out, 'warehouse', makeBuilding({
    w: 50, roofD: 12, wallH: 22, wall: RAMPS.sand, roof: RAMPS.coral, roofStyle: 'gable',
    windows: { rows: 1, cols: 4, ww: 4, wh: 3, gx: 8, top: 3, frame: RAMPS.brown[1] },
    decorate(c, l, { ox, fy, w, wallH }) {
      for (let x = ox + 3; x < ox + w - 3; x += 3) c.vline(x, fy + 9, fy + wallH - 3, RAMPS.sand[1]);
      for (const dx of [8, 30]) {
        c.fillRect(ox + dx, fy + wallH - 11, 12, 9, RAMPS.stone[2]);
        for (let y = fy + wallH - 10; y < fy + wallH - 2; y += 2) c.hline(ox + dx, ox + dx + 11, y, RAMPS.stone[1]);
      }
      void l;
    },
    seed: 102
  }));
  out.push({ name: 'containers', canvas: containers() });

  return out;
}

export { cylinderTone, fillCylinder, hash2, ditherOn };
