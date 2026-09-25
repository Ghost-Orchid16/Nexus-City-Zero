// Tiny citizens with walk cycles (side ×4, front ×2, back ×2) plus repair crews and medics.
// ~12 px tall, outlined so they read over any ground at 3× scale.
import { PixelCanvas, RAMPS, INK } from '../lib/draw.mjs';

const SKINS = [RAMPS.skin1, RAMPS.skin2, RAMPS.skin3, RAMPS.skin4];

export const CITIZENS = [
  { id: 'a', skin: 0, hair: RAMPS.brown[1], shirt: RAMPS.coral, pants: RAMPS.blue },
  { id: 'b', skin: 1, hair: RAMPS.plum[0], shirt: RAMPS.yellow, pants: RAMPS.plum },
  { id: 'c', skin: 2, hair: RAMPS.orange[2], shirt: RAMPS.teal, pants: RAMPS.brown },
  { id: 'd', skin: 3, hair: RAMPS.plum[0], shirt: RAMPS.violet, pants: RAMPS.stone },
  { id: 'e', skin: 2, hair: RAMPS.yellow[2], shirt: RAMPS.green, pants: RAMPS.blue },
  { id: 'f', skin: 1, hair: RAMPS.brown[0], shirt: RAMPS.magenta, pants: RAMPS.plum },
  { id: 'worker', skin: 0, hair: RAMPS.brown[1], shirt: RAMPS.orange, pants: RAMPS.blue, hat: RAMPS.yellow, vest: true },
  { id: 'medic', skin: 3, hair: RAMPS.plum[0], shirt: RAMPS.cream, pants: RAMPS.cream, cross: true }
];

function person(p, view, frame) {
  const skin = SKINS[p.skin];
  const c = new PixelCanvas(9, 15);
  const ox = 1;
  const oy = 1;
  // legs
  const legY = oy + 9;
  const stride = view === 'side' ? [[0, 0], [1, -1], [0, 0], [-1, 1]][frame] : [[0, 1], [1, 0]][frame % 2];
  if (view === 'side') {
    c.vline(ox + 2 + stride[0], legY, legY + 2, p.pants[1]);
    c.vline(ox + 4 + stride[1], legY, legY + 2, p.pants[2]);
    c.set(ox + 3 + stride[0], legY + 2, RAMPS.plum[1]);
    c.set(ox + 5 + stride[1], legY + 2, RAMPS.plum[1]);
  } else {
    c.vline(ox + 2, legY, legY + 1 + stride[0], p.pants[2]);
    c.vline(ox + 4, legY, legY + 1 + stride[1], p.pants[1]);
  }
  // torso
  c.fillRect(ox + 1, oy + 5, 5, 4, p.shirt[2]);
  c.hline(ox + 1, ox + 5, oy + 5, p.shirt[3]);
  c.vline(ox + 5, oy + 5, oy + 8, p.shirt[1]);
  if (p.vest) {
    c.vline(ox + 2, oy + 5, oy + 8, RAMPS.yellow[4]);
    c.vline(ox + 4, oy + 5, oy + 8, RAMPS.yellow[4]);
  }
  if (p.cross) {
    c.set(ox + 3, oy + 6, RAMPS.red[2]);
    c.hline(ox + 2, ox + 4, oy + 7, RAMPS.red[2]);
    c.set(ox + 3, oy + 8, RAMPS.red[2]);
  }
  // arms swing opposite to legs
  if (view === 'side') {
    const swing = [0, 1, 0, -1][frame];
    c.set(ox + 3 + swing, oy + 8, skin[3]);
  } else {
    c.set(ox, oy + 6 + (frame % 2), skin[3]);
    c.set(ox + 6, oy + 7 - (frame % 2), skin[3]);
  }
  // head
  c.fillRect(ox + 1, oy + 1, 5, 4, skin[3]);
  c.vline(ox + 5, oy + 1, oy + 4, skin[2]);
  // hair / hat
  if (p.hat) {
    c.fillRect(ox, oy, 7, 2, p.hat[3]);
    c.hline(ox + 1, ox + 5, oy - 0, p.hat[4]);
  } else {
    c.hline(ox + 1, ox + 5, oy, p.hair);
    if (view === 'back') c.fillRect(ox + 1, oy, 5, 4, p.hair);
    if (view === 'side') c.vline(ox + 1, oy, oy + 2, p.hair);
  }
  // face
  if (view === 'front') {
    c.set(ox + 2, oy + 2, RAMPS.plum[0]);
    c.set(ox + 4, oy + 2, RAMPS.plum[0]);
  } else if (view === 'side') {
    c.set(ox + 5, oy + 2, RAMPS.plum[0]);
  }
  c.outline(INK);
  return c;
}

export function buildPeople() {
  const out = [];
  for (const p of CITIZENS) {
    for (let f = 0; f < 4; f++) out.push({ name: `person-${p.id}-side-${f}`, canvas: person(p, 'side', f) });
    for (let f = 0; f < 2; f++) out.push({ name: `person-${p.id}-front-${f}`, canvas: person(p, 'front', f) });
    for (let f = 0; f < 2; f++) out.push({ name: `person-${p.id}-back-${f}`, canvas: person(p, 'back', f) });
  }
  return out;
}
