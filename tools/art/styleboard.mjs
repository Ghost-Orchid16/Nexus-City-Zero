// Style board: a small scene of hero assets on real ground at game scale (3×) for approval.
import { writeFileSync, mkdirSync } from 'node:fs';
import { PixelCanvas, RAMPS, hash2 } from './lib/draw.mjs';
import { makeBuilding } from './families/building-kit.mjs';
import { makeTree, makePine, makeBush, makeFlowerBed } from './families/nature.mjs';
import { vehicleSide, vehicleEnd, CAR_COLORS } from './families/vehicles.mjs';

mkdirSync('tools/art/out', { recursive: true });

const W = 320;
const H = 180;
const c = new PixelCanvas(W, H);

// grass: flat base, sparse 2-3px tufts and flower dots (clusters, not noise)
c.fillRect(0, 0, W, H, RAMPS.green[3]);
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  const r = hash2(x >> 1, y >> 1, 3);
  if (r < 0.035) { c.set(x, y, RAMPS.green[2]); c.set(x + 1, y, RAMPS.green[2]); }
  else if (r > 0.985) { c.set(x, y, RAMPS.lime[3]); }
}
for (let i = 0; i < 60; i++) {
  const x = Math.floor(hash2(i, 1, 9) * W);
  const y = Math.floor(hash2(i, 2, 9) * 100);
  c.set(x, y, [RAMPS.yellow[4], RAMPS.cream[4], RAMPS.coral[4]][i % 3]);
}
// road + sidewalk + curb
c.fillRect(0, 124, W, 26, RAMPS.asphalt[2]);
c.hline(0, W - 1, 124, RAMPS.asphalt[1]);
c.hline(0, W - 1, 149, RAMPS.asphalt[1]);
for (let x = 0; x < W; x += 12) c.hline(x, x + 6, 136, RAMPS.cream[4]);
c.fillRect(0, 114, W, 10, RAMPS.stone[3]);
for (let x = 0; x < W; x += 8) c.vline(x, 115, 122, RAMPS.stone[2]);
c.hline(0, W - 1, 114, RAMPS.stone[4]);
c.hline(0, W - 1, 123, RAMPS.stone[1]);

// palette swatches
const ramps = ['plum', 'cream', 'brown', 'orange', 'yellow', 'coral', 'red', 'magenta', 'violet', 'blue', 'cyan', 'teal', 'green', 'water', 'asphalt', 'glow'];
ramps.forEach((name, i) => RAMPS[name].forEach((col, k) => c.fillRect(4 + i * 19 + k * 3, 4, 3, 6, col)));

const shadow = (x, y, w, h) => c.blendRect(x, y, w, h, RAMPS.plum[0], 0.28);

function place(b, x, baseY) {
  // solid cast shadow falling to the lower right
  shadow(x - b.anchorX + 3, baseY - 3, b.canvas.w - 2, 4);
  c.blit(b.canvas, x - b.anchorX, baseY - b.anchorY);
}
function placeSprite(s, x, baseY, sh = true) {
  if (sh) c.blendRect(x - Math.floor(s.w / 2) + 2, baseY - 2, s.w - 3, 3, RAMPS.plum[0], 0.28);
  c.blit(s, x - Math.floor(s.w / 2), baseY - s.h + 1);
}

const house = makeBuilding({
  w: 26, roofD: 8, gableH: 8, wallH: 16, wall: RAMPS.cream, roof: RAMPS.coral, roofStyle: 'gableFront',
  windows: { rows: 1, cols: 2, ww: 4, wh: 4, gx: 10, top: 3, frame: RAMPS.brown[1], sill: RAMPS.cream[4] },
  door: { w: 4, h: 7, color: RAMPS.teal }, seed: 3
});
const house2 = makeBuilding({
  w: 34, roofD: 12, wallH: 16, wall: RAMPS.sand, roof: RAMPS.violet, roofStyle: 'gable',
  windows: { rows: 1, cols: 3, ww: 4, wh: 4, gx: 7, top: 3, frame: RAMPS.brown[1], sill: RAMPS.cream[4] },
  door: { w: 4, h: 7, color: RAMPS.coral, offset: 8 }, roofProps: [{ type: 'chimney', x: 6, y: 4 }], seed: 4
});
const hospital = makeBuilding({
  w: 56, roofD: 14, wallH: 40, wall: RAMPS.cream, roof: RAMPS.stone, floors: 9,
  windows: { rows: 4, cols: 8, ww: 4, wh: 4, gx: 2, gy: 5, top: 3, glass: RAMPS.cyan, skipDoorCols: 2 },
  door: { w: 10, h: 8, glassDoor: true, color: RAMPS.stone, awning: RAMPS.red },
  roofProps: [{ type: 'helipad', x: 18, y: 1, r: 16 }, { type: 'ac', x: 4, y: 4 }, { type: 'ac', x: 46, y: 6 }],
  decorate(cv, lights, { ox, fy, w }) {
    const sx = ox + w - 13;
    cv.fillRect(sx, fy + 2, 9, 9, RAMPS.cream[4]);
    cv.fillRect(sx + 3, fy + 3, 3, 7, RAMPS.red[2]);
    cv.fillRect(sx + 1, fy + 5, 7, 3, RAMPS.red[2]);
    lights.fillRect(sx + 3, fy + 3, 3, 7, RAMPS.red[4]);
    lights.fillRect(sx + 1, fy + 5, 7, 3, RAMPS.red[4]);
  },
  seed: 7
});
const tower = makeBuilding({
  w: 30, roofD: 10, wallH: 78, wall: RAMPS.teal, roof: RAMPS.plum,
  windows: { rows: 13, cols: 5, ww: 4, wh: 4, gx: 1, gy: 1, top: 3, style: 'curtain', glass: RAMPS.glass },
  door: { w: 8, h: 7, glassDoor: true, color: RAMPS.teal },
  roofProps: [{ type: 'antenna', x: 14, y: 4, h: 10 }, { type: 'ac', x: 3, y: 3 }], seed: 11
});
const factory = makeBuilding({
  w: 44, roofD: 12, wallH: 26, wall: RAMPS.orange, roof: RAMPS.brown, roofStyle: 'sawtooth',
  windows: { rows: 1, cols: 4, ww: 5, wh: 4, gx: 4, top: 6, frame: RAMPS.brown[0] },
  door: { w: 12, h: 10, color: RAMPS.stone }, seed: 5
});

place(house, 26, 114);
place(house2, 66, 114);
placeSprite(makeTree('oak', 1, 1), 96, 113);
place(hospital, 140, 114);
place(tower, 206, 114);
placeSprite(makeTree('blossom', 1, 2), 234, 113);
place(factory, 280, 114);
placeSprite(makePine(1, 1), 308, 113);
placeSprite(makeTree('autumn', 1.2, 3), 14, 176);
placeSprite(makeTree('lime', 0.8, 4), 300, 176);
placeSprite(makeBush('oak'), 110, 176);
placeSprite(makeFlowerBed(), 60, 176, false);

// traffic
let vx = 20;
for (const [type, color] of [['car', CAR_COLORS.sky], ['bus', null], ['ambulance', null], ['taxi', null], ['police', null], ['fire', null], ['truck', null], ['repair', null], ['car', CAR_COLORS.magenta]]) {
  const v = vehicleSide(type, color);
  placeSprite(v, vx + v.w / 2, 134, true);
  vx += v.w + 6;
}
placeSprite(vehicleEnd('car', 'front', CAR_COLORS.teal), 150, 160);
placeSprite(vehicleEnd('ambulance', 'back'), 170, 160);
placeSprite(vehicleEnd('bus', 'front'), 190, 162);

writeFileSync('tools/art/out/styleboard.png', c.scaled(3).toPNG());
console.log('styleboard written', c.colorCount(), 'colors');
