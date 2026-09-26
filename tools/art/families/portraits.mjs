// Command-role portraits (48×48 busts, transparent background, light from the upper left).
// A small rig composes clothing → neck → back hair → head → face → front hair/props → outline.
import { PixelCanvas, RAMPS, INK, hash2 } from '../lib/draw.mjs';

const S = 48;
const CX = 24;

function shadedOval(c, x, y, w, h, ramp, { base = 3, shadow = 2, hi = 4, lightBias = 0.35 } = {}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) {
    const nx = (xx + 0.5 - cx) / (w / 2);
    const ny = (yy + 0.5 - cy) / (h / 2);
    if (nx * nx + ny * ny > 1) continue;
    const l = nx * 0.75 + ny * 0.35;
    c.set(xx, yy, l > lightBias ? ramp[shadow] : l < -0.55 && ny < -0.1 ? ramp[hi] : ramp[base]);
  }
}

/** Head: slightly tapered oval with ears, shaded skin, and a jawline. */
function head(c, skin, { w = 20, h = 23, y = 9 } = {}) {
  const x = CX - w / 2;
  // ears
  shadedOval(c, x - 2, y + 9, 4, 6, skin, { base: 2, shadow: 1 });
  shadedOval(c, x + w - 2, y + 9, 4, 6, skin, { base: 2, shadow: 1 });
  shadedOval(c, x, y, w, h, skin);
  // taper the jaw: trim two pixels at the lower corners
  for (let k = 0; k < 3; k++) {
    c.clearPixel(Math.floor(x + k), y + h - 1 - k);
    c.clearPixel(Math.ceil(x + w - 1 - k), y + h - 1 - k);
  }
  // cheek highlight
  c.set(x + 4, y + 13, skin[4]);
  c.set(x + 5, y + 13, skin[4]);
}

function face(c, skin, { eyeY = 19, spread = 5, mouth = 'smile', brow = RAMPS.plum[1], blush = true, lashes = false } = {}) {
  const lx = CX - spread - 1;
  const rx = CX + spread - 1;
  for (const ex of [lx, rx]) {
    c.fillRect(ex, eyeY, 2, 3, RAMPS.plum[0]);
    c.set(ex, eyeY, RAMPS.cream[4]);
    c.hline(ex - 1, ex + 2, eyeY - 2, brow);
    if (lashes) c.set(ex + 2, eyeY, RAMPS.plum[0]);
  }
  // nose (shadow on the right, away from the light)
  c.set(CX, eyeY + 3, skin[2]);
  c.set(CX, eyeY + 4, skin[2]);
  c.set(CX - 1, eyeY + 5, skin[1]);
  // mouth
  const my = eyeY + 8;
  if (mouth === 'smile') {
    c.hline(CX - 2, CX + 1, my, skin[0]);
    c.set(CX - 3, my - 1, skin[0]);
    c.set(CX + 2, my - 1, skin[0]);
  } else if (mouth === 'grin') {
    c.hline(CX - 3, CX + 2, my - 1, skin[0]);
    c.hline(CX - 2, CX + 1, my, RAMPS.cream[4]);
    c.hline(CX - 2, CX + 1, my + 1, skin[0]);
  } else {
    c.hline(CX - 2, CX + 1, my, skin[0]);
  }
  if (blush) {
    c.set(lx - 1, eyeY + 5, RAMPS.coral[3]);
    c.set(rx + 2, eyeY + 5, RAMPS.coral[3]);
  }
}

/** Shoulders + neck. `collar` draws role-specific clothing details. */
function torso(c, skin, cloth, collar) {
  c.fillRect(CX - 4, 30, 8, 8, skin[2]);
  c.hline(CX - 4, CX + 3, 31, skin[1]);
  c.fillPoly([[3, S], [8, 38.5], [16, 35.5], [32, 35.5], [40, 38.5], [45, S]], cloth[2]);
  // light from the upper left: left shoulder lit, right in shade
  c.fillPoly([[3, S], [8, 38.5], [16, 35.5], [14, S]], cloth[3]);
  c.fillPoly([[34, S], [32, 35.5], [40, 38.5], [45, S]], cloth[1]);
  if (collar) collar(c);
}

function hairMass(c, ramp, pts, { seed = 1 } = {}) {
  c.fillPoly(pts, ramp[2]);
  // strands: lit on the left, darker toward the right
  const b = c.bounds();
  void b;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const p = c.get(x, y);
    const base = ramp[2];
    if (p[3] && p[0] === parseInt(base.slice(1, 3), 16) && p[1] === parseInt(base.slice(3, 5), 16) && p[2] === parseInt(base.slice(5, 7), 16)) {
      if (x < CX - 4 && hash2(x >> 1, y, seed) < 0.55) c.set(x, y, ramp[3]);
      else if (x > CX + 5) c.set(x, y, ramp[1]);
      if ((x + y * 2) % 7 === 0 && x < CX + 3) c.set(x, y, ramp[4]);
    }
  }
}

// ------------------------------------------------------------------ roles
const SILVER = [RAMPS.stone[0], RAMPS.stone[1], RAMPS.stone[3], RAMPS.stone[4], '#ffffff'];

const ROLES = {
  governor(c) {
    const skin = RAMPS.skin4;
    // bun behind the head
    shadedOval(c, CX - 6, 2, 12, 9, SILVER, { base: 2, shadow: 1, hi: 3 });
    torso(c, skin, RAMPS.violet, (cv) => {
      cv.fillPoly([[16, 35.5], [24, 44], [32, 35.5], [28, 35.5], [24, 40], [20, 35.5]], RAMPS.cream[4]);
      cv.fillPoly([[13, 37], [21, 47.5], [16, 47.5]], RAMPS.violet[1]);
      cv.fillPoly([[35, 37], [27, 47.5], [32, 47.5]], RAMPS.violet[0]);
      cv.fillRect(34, 40, 3, 3, RAMPS.yellow[3]);
      cv.set(34, 40, RAMPS.yellow[4]);
    });
    head(c, skin);
    // swept silver hair
    hairMass(c, SILVER, [[13, 17], [14, 9], [19, 6], [29, 6], [34, 10], [35, 17], [32, 13], [26, 10], [18, 11]], { seed: 3 });
    face(c, skin, { mouth: 'smile', brow: SILVER[1], lashes: true });
    // gold earrings
    c.set(13, 25, RAMPS.yellow[4]);
    c.set(35, 25, RAMPS.yellow[3]);
  },

  scientist(c) {
    const skin = RAMPS.skin3;
    torso(c, skin, RAMPS.cream, (cv) => {
      cv.fillPoly([[18, 35.5], [24, 43], [30, 35.5]], RAMPS.teal[2]);
      cv.fillPoly([[16, 36], [22, 47.5], [18, 47.5]], RAMPS.cream[1]);
      cv.fillPoly([[32, 36], [26, 47.5], [30, 47.5]], RAMPS.cream[1]);
      cv.fillRect(33, 41, 3, 4, RAMPS.cream[2]);
      cv.vline(34, 39, 41, RAMPS.blue[3]);
    });
    head(c, skin);
    // messy hair with tufts
    hairMass(c, RAMPS.brown, [[13, 18], [12, 11], [15, 6], [20, 4], [23, 7], [26, 3], [31, 6], [35, 10], [36, 18], [33, 12], [28, 11], [22, 12], [16, 13]], { seed: 5 });
    face(c, skin, { mouth: 'grin', brow: RAMPS.brown[0] });
    // round glasses
    for (const gx of [CX - 8, CX + 2]) {
      c.strokeOval(gx, 17, 7, 7, RAMPS.plum[1]);
      c.set(gx + 1, 18, RAMPS.cyan[4]);
    }
    c.hline(CX - 1, CX, 20, RAMPS.plum[1]);
  },

  engineer(c) {
    const skin = RAMPS.skin2;
    // braid over the shoulder
    for (let y = 22; y < 42; y += 3) shadedOval(c, 33, y, 5, 4, RAMPS.plum, { base: 1, shadow: 0, hi: 2 });
    torso(c, skin, RAMPS.orange, (cv) => {
      cv.fillPoly([[18, 35.5], [24, 42], [30, 35.5]], RAMPS.blue[2]);
      for (const x of [13, 33]) { cv.vline(x, 38, 47, RAMPS.cream[4]); cv.vline(x + 1, 38, 47, RAMPS.yellow[4]); }
      cv.hline(5, 42, 44, RAMPS.cream[4]);
    });
    head(c, skin);
    // hard hat: dome + brim
    shadedOval(c, 11, 3, 26, 14, RAMPS.yellow, { base: 3, shadow: 2, hi: 4 });
    c.fillRect(9, 13, 30, 3, RAMPS.yellow[2]);
    c.hline(9, 38, 13, RAMPS.yellow[4]);
    c.hline(9, 38, 15, RAMPS.yellow[1]);
    c.vline(CX, 4, 12, RAMPS.yellow[4]);
    face(c, skin, { mouth: 'smile', brow: RAMPS.plum[0], lashes: true });
  },

  medical(c) {
    const skin = RAMPS.skin1;
    torso(c, skin, RAMPS.cream, (cv) => {
      cv.fillPoly([[17, 35.5], [24, 42], [31, 35.5]], RAMPS.coral[2]);
      cv.fillPoly([[15, 36], [21, 47.5], [17, 47.5]], RAMPS.cream[1]);
      cv.fillPoly([[33, 36], [27, 47.5], [31, 47.5]], RAMPS.cream[1]);
      // stethoscope
      cv.line(17, 35, 16, 42, RAMPS.plum[2]);
      cv.line(31, 35, 32, 42, RAMPS.plum[2]);
      cv.line(16, 42, 22, 45, RAMPS.plum[2]);
      cv.fillRect(22, 44, 3, 3, SILVER[3]);
      // badge with red cross
      cv.fillRect(33, 41, 5, 5, RAMPS.cream[4]);
      cv.vline(35, 42, 44, RAMPS.red[2]);
      cv.hline(34, 36, 43, RAMPS.red[2]);
    });
    head(c, skin);
    hairMass(c, RAMPS.plum, [[13, 16], [14, 9], [19, 6], [28, 6], [33, 9], [35, 16], [32, 12], [24, 10], [16, 12]], { seed: 7 });
    face(c, skin, { mouth: 'smile', brow: RAMPS.plum[0] });
    // stubble
    for (let x = CX - 5; x <= CX + 4; x++) if (hash2(x, 1, 9) < 0.6) c.set(x, 30, skin[1]);
  },

  energy(c) {
    const skin = RAMPS.skin3;
    torso(c, skin, RAMPS.blue, (cv) => {
      cv.fillPoly([[18, 35.5], [24, 41], [30, 35.5]], RAMPS.yellow[3]);
      cv.fillPoly([[33, 39], [30, 44], [32, 44], [30, 47.5], [35, 42], [33, 42], [35, 39]], RAMPS.yellow[4]);
    });
    head(c, skin);
    // voluminous curls
    for (const [x, y, s] of [[10, 12, 8], [12, 6, 9], [18, 3, 9], [25, 3, 9], [30, 6, 9], [33, 12, 8], [11, 18, 6], [34, 18, 6]]) {
      shadedOval(c, x, y, s, s, RAMPS.orange, { base: 2, shadow: 1, hi: 3 });
    }
    face(c, skin, { mouth: 'grin', brow: RAMPS.orange[1], lashes: true });
    // headset with boom mic
    c.fillRect(10, 17, 4, 6, RAMPS.plum[1]);
    c.set(10, 17, RAMPS.plum[2]);
    c.line(13, 23, 19, 28, RAMPS.plum[1]);
    c.fillRect(19, 27, 2, 2, RAMPS.plum[0]);
  },

  logistics(c) {
    const skin = RAMPS.skin4;
    torso(c, skin, RAMPS.green, (cv) => {
      cv.fillPoly([[17, 35.5], [24, 40], [31, 35.5]], RAMPS.lime[2]);
      cv.fillRect(12, 40, 6, 4, RAMPS.orange[3]);
      cv.fillPoly([[13, 42], [16, 40.5], [16, 43.5]], RAMPS.cream[4]);
      cv.hline(20, 28, 44, RAMPS.green[1]);
    });
    head(c, skin);
    face(c, skin, { mouth: 'smile', brow: RAMPS.plum[0], blush: false });
    // beard
    for (let y = 25; y < 32; y++) for (let x = CX - 8; x <= CX + 7; x++) {
      const nx = (x + 0.5 - CX) / 8.5;
      const ny = (y - 25) / 7;
      if (nx * nx + (1 - ny) * 0.1 < 1 && c.opaque(x, y) && !(y === 27 && Math.abs(x - CX) < 3)) {
        if (y > 26 || Math.abs(nx) > 0.6) c.set(x, y, hash2(x, y, 4) < 0.3 ? RAMPS.plum[1] : RAMPS.plum[0]);
      }
    }
    c.hline(CX - 2, CX + 1, 27, skin[0]);
    // cap with visor
    shadedOval(c, 12, 4, 24, 12, RAMPS.green, { base: 2, shadow: 1, hi: 3 });
    c.fillRect(12, 10, 24, 4, RAMPS.green[2]);
    c.fillPoly([[10, 13], [30, 13], [34, 16], [12, 16]], RAMPS.green[1]);
    c.hline(10, 30, 13, RAMPS.green[3]);
    c.fillRect(21, 6, 6, 4, RAMPS.orange[3]);
  },

  ai(c) {
    const skin = RAMPS.skin1;
    torso(c, skin, RAMPS.violet, (cv) => {
      // hoodie with drawstrings and a chip emblem
      cv.fillPoly([[14, 36], [24, 40], [34, 36], [34, 39], [24, 43], [14, 39]], RAMPS.violet[3]);
      cv.vline(21, 40, 45, RAMPS.cream[4]);
      cv.vline(27, 40, 45, RAMPS.cream[4]);
      cv.fillRect(31, 42, 5, 4, RAMPS.magenta[2]);
      cv.set(32, 43, RAMPS.cyan[4]);
    });
    head(c, skin);
    // asymmetric bright hair
    hairMass(c, RAMPS.magenta, [[12, 20], [12, 10], [17, 5], [25, 3], [32, 5], [36, 11], [36, 16], [30, 12], [22, 12], [16, 15], [15, 22]], { seed: 11 });
    face(c, skin, { mouth: 'smile', brow: RAMPS.magenta[1] });
    // glowing AR visor across the eyes
    c.fillRect(13, 17, 22, 5, RAMPS.cyan[2]);
    c.hline(13, 34, 17, RAMPS.cyan[4]);
    c.hline(13, 34, 21, RAMPS.cyan[1]);
    for (let x = 15; x < 33; x += 4) c.set(x, 19, RAMPS.cream[4]);
    c.set(16, 18, '#ffffff');
  }
};

export const PORTRAIT_KEYS = Object.keys(ROLES);

export function buildPortraits() {
  return Object.entries(ROLES).map(([key, draw]) => {
    const c = new PixelCanvas(S, S);
    draw(c);
    c.outline(INK);
    return { name: `portrait-${key}`, canvas: c };
  });
}
