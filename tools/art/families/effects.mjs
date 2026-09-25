// Effects atlas: hazards, alerts, decals, glows and feedback particles.
import { PixelCanvas, RAMPS, INK, hash2 } from '../lib/draw.mjs';

/** Chunky pixel puff (smoke/steam/toxic) built from overlapping circles, lit top-left. */
function puff(size, ramp, seed) {
  const c = new PixelCanvas(size + 2, size + 2);
  const r = size / 2;
  const lobes = [[r * 0.9, r * 1.05, r * 0.72], [r * 1.25, r * 0.85, r * 0.62], [r * 0.75, r * 0.7, r * 0.55]];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    let inside = false;
    for (const [lx, ly, lr] of lobes) if ((x + 0.5 - lx - 1) ** 2 + (y + 0.5 - ly - 1) ** 2 <= lr * lr) inside = true;
    if (!inside) continue;
    const light = -((x - r) + (y - r)) / size + (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.3;
    c.set(x, y, light > 0.25 ? ramp[4] : light > -0.1 ? ramp[3] : ramp[2]);
  }
  return c;
}

function fireFrames() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = new PixelCanvas(14, 18);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 14; x++) {
      const nx = (x - 6.5) / 6.5;
      const t = y / 17;
      const flick = Math.sin(y * 0.9 + f * 1.7) * 0.18 + (hash2(x, y + f * 7, 3) - 0.5) * 0.25;
      const width = (0.25 + t * 0.75) * (1 - Math.max(0, t - 0.85) * 3);
      if (Math.abs(nx + flick * (1 - t)) > width) continue;
      const core = Math.abs(nx) < width * 0.45 && t > 0.35;
      c.set(x, y, t < 0.3 ? RAMPS.red[3] : core ? RAMPS.yellow[4] : t < 0.6 ? RAMPS.orange[3] : RAMPS.orange[2]);
    }
    c.outline(RAMPS.red[1]);
    frames.push(c);
  }
  return frames;
}

function sparkFrames() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = new PixelCanvas(13, 13);
    const len = [3, 5, 4][f];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + f * 0.4;
      for (let s = 1; s <= len; s++) {
        if (k % 2 && s > len - 2) continue;
        c.set(Math.round(6 + Math.cos(a) * s), Math.round(6 + Math.sin(a) * s), s < 2 ? RAMPS.cream[4] : RAMPS.yellow[4]);
      }
    }
    c.fillRect(5, 5, 3, 3, RAMPS.cream[4]);
    frames.push(c);
  }
  return frames;
}

function splashFrames() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = new PixelCanvas(14, 12);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 6) * Math.PI;
      const rr = 3 + f * 1.5;
      c.set(Math.round(7 + Math.cos(a) * rr), Math.round(9 + Math.sin(a) * rr * 0.9), RAMPS.water[4]);
      c.set(Math.round(7 + Math.cos(a) * (rr - 1)), Math.round(9 + Math.sin(a) * (rr - 1) * 0.9), RAMPS.water[3]);
    }
    c.fillOval(3, 9, 8, 3, RAMPS.water[3]);
    frames.push(c);
  }
  return frames;
}

function beaconFrames(ramp) {
  return [0, 1].map((f) => {
    const c = new PixelCanvas(10, 10);
    c.fillRect(2, 6, 6, 3, RAMPS.plum[1]);
    c.fillOval(2, 1, 6, 6, f ? ramp[4] : ramp[2]);
    c.set(3, 2, RAMPS.cream[4]);
    if (f) { c.set(0, 3, ramp[4]); c.set(9, 3, ramp[4]); c.set(4, 0, ramp[4]); }
    c.outline(INK);
    return c;
  });
}

/** Map pin with a symbol, used above districts in trouble. */
function pin(ramp, symbol) {
  const c = new PixelCanvas(16, 20);
  c.fillOval(1, 1, 14, 14, ramp[2]);
  c.fillOval(2, 2, 11, 10, ramp[3]);
  c.fillPoly([[4, 11], [12, 11], [8, 18]], ramp[2]);
  c.set(4, 4, ramp[4]); c.set(5, 3, ramp[4]);
  const W = RAMPS.cream[4];
  if (symbol === '!') { c.vline(8, 4, 9, W); c.vline(7, 4, 9, W); c.fillRect(7, 11, 2, 2, W); }
  if (symbol === '+') { c.fillRect(7, 4, 2, 8, W); c.fillRect(4, 7, 8, 2, W); }
  if (symbol === '?') { c.hline(6, 9, 4, W); c.vline(10, 5, 6, W); c.hline(8, 9, 7, W); c.vline(8, 8, 9, W); c.fillRect(8, 11, 1, 2, W); }
  if (symbol === 'bolt') { c.fillPoly([[9, 3], [5, 9], [8, 9], [6, 14], [11, 7], [8, 7]], RAMPS.yellow[4]); }
  c.outline(INK);
  return c;
}

function crackDecal(seed) {
  const c = new PixelCanvas(20, 12);
  let x = 1;
  let y = 6;
  for (let i = 0; i < 18; i++) {
    c.set(x, y, RAMPS.plum[0]);
    if (hash2(i, 1, seed) < 0.3) c.set(x, y + 1, RAMPS.plum[1]);
    x += 1;
    y += Math.round((hash2(i, 2, seed) - 0.5) * 2.2);
    y = Math.max(1, Math.min(10, y));
    if (hash2(i, 3, seed) < 0.18) {
      let bx = x;
      let by = y;
      for (let k = 0; k < 4; k++) { by += hash2(i, k, seed) < 0.5 ? -1 : 1; bx += 1; c.set(bx, by, RAMPS.plum[1]); }
    }
  }
  return c;
}

function scorch() {
  const c = new PixelCanvas(22, 10);
  c.fillOval(0, 0, 22, 10, RAMPS.plum[1]);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 22; x++) {
    if (c.opaque(x, y) && hash2(x, y, 5) < 0.3) c.set(x, y, RAMPS.plum[0]);
  }
  c.fillOval(5, 2, 12, 6, RAMPS.plum[0]);
  return c;
}

function puddleFrames() {
  return [0, 1].map((f) => {
    const c = new PixelCanvas(30, 12);
    c.fillOval(0, 1, 30, 10, RAMPS.water[2]);
    c.fillOval(3, 2, 22, 6, RAMPS.water[3]);
    for (let k = 0; k < 4; k++) c.hline(5 + k * 5 + f * 2, 7 + k * 5 + f * 2, 4 + (k % 2) * 2, RAMPS.water[4]);
    return c;
  });
}

/** Soft additive glow with smooth alpha falloff (light, not pixel art). */
function glow(size, color) {
  const c = new PixelCanvas(size, size);
  const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  const R = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - R, y + 0.5 - R) / R;
    if (d >= 1) continue;
    const a = Math.pow(1 - d, 1.8);
    c.data.set([r, g, b, Math.round(a * 255)], (y * size + x) * 4);
  }
  return c;
}

function lightningFrames() {
  return [0, 1].map((f) => {
    const c = new PixelCanvas(18, 44);
    let x = 10;
    for (let y = 0; y < 44; y++) {
      if (y % 6 === 0) x += (hash2(y, f, 17) < 0.5 ? -2 : 2);
      x = Math.max(3, Math.min(14, x));
      c.hline(x - 1, x + 1, y, RAMPS.cream[4]);
      c.set(x - 2, y, RAMPS.yellow[4]);
      c.set(x + 2, y, RAMPS.yellow[4]);
      if (f && y === 20) for (let k = 1; k < 6; k++) c.set(x + k, y + k, RAMPS.yellow[4]);
    }
    return c;
  });
}

function glitchFrames() {
  const colors = [RAMPS.cyan[3], RAMPS.magenta[3], RAMPS.lime[3], RAMPS.cream[4]];
  return [0, 1, 2].map((f) => {
    const c = new PixelCanvas(22, 16);
    for (let k = 0; k < 9; k++) {
      const x = Math.floor(hash2(k, f, 23) * 18);
      const y = Math.floor(hash2(k, f + 5, 23) * 14);
      c.fillRect(x, y, 2 + Math.floor(hash2(k, f, 29) * 4), 1 + Math.floor(hash2(k, f, 31) * 2), colors[k % colors.length]);
    }
    return c;
  });
}

function shield() {
  const c = new PixelCanvas(40, 26);
  c.strokeOval(0, 0, 40, 26, RAMPS.cyan[4]);
  c.strokeOval(2, 2, 36, 22, RAMPS.cyan[3]);
  for (let x = 6; x < 34; x += 5) c.set(x, 3, RAMPS.cream[4]);
  return c;
}

function sparkle(f) {
  const c = new PixelCanvas(9, 9);
  const L = [2, 4, 3][f];
  c.vline(4, 4 - L, 4 + L, RAMPS.yellow[4]);
  c.hline(4 - L, 4 + L, 4, RAMPS.yellow[4]);
  c.set(4, 4, RAMPS.cream[4]);
  return c;
}

function miniIcon(kind) {
  const c = new PixelCanvas(9, 9);
  if (kind === 'plus') { c.fillRect(3, 1, 3, 7, RAMPS.coral[3]); c.fillRect(1, 3, 7, 3, RAMPS.coral[3]); c.set(3, 1, RAMPS.cream[4]); }
  if (kind === 'bolt') c.fillPoly([[6, 0], [1, 5], [4, 5], [2, 9], [8, 3], [5, 3]], RAMPS.yellow[4]);
  if (kind === 'drop') { c.fillOval(1, 3, 7, 6, RAMPS.water[3]); c.fillPoly([[4.5, 0], [7.5, 5], [1.5, 5]], RAMPS.water[3]); c.set(3, 5, RAMPS.cream[4]); }
  if (kind === 'wrench') { c.line(1, 7, 6, 2, RAMPS.stone[4]); c.line(2, 7, 7, 2, RAMPS.stone[3]); c.fillRect(6, 0, 3, 3, RAMPS.stone[4]); c.set(7, 1, RAMPS.plum[1]); }
  if (kind === 'box') { c.fillRect(1, 2, 7, 6, RAMPS.brown[3]); c.hline(1, 7, 2, RAMPS.brown[4]); c.vline(4, 2, 7, RAMPS.brown[1]); }
  c.outline(INK);
  return c;
}

function confetti() {
  const colors = [RAMPS.coral[3], RAMPS.yellow[4], RAMPS.teal[3], RAMPS.violet[3], RAMPS.magenta[3], RAMPS.cyan[3]];
  return colors.map((col) => {
    const c = new PixelCanvas(3, 2);
    c.fillRect(0, 0, 3, 2, col);
    return c;
  });
}

export function buildEffects() {
  const out = [];
  const smoke = [RAMPS.plum[2], RAMPS.plum[2], RAMPS.stone[1], RAMPS.stone[2], RAMPS.stone[3]];
  const steam = [RAMPS.stone[3], RAMPS.stone[3], RAMPS.stone[4], RAMPS.cream[4], '#ffffff'];
  const toxic = [RAMPS.lime[0], RAMPS.lime[1], RAMPS.lime[2], RAMPS.lime[3], RAMPS.lime[4]];
  [6, 10, 14].forEach((s, i) => {
    out.push({ name: `smoke-${i}`, canvas: puff(s, smoke, i + 1) });
    out.push({ name: `steam-${i}`, canvas: puff(s, steam, i + 11) });
    out.push({ name: `toxic-${i}`, canvas: puff(s, toxic, i + 21) });
  });
  fireFrames().forEach((f, i) => out.push({ name: `fire-${i}`, canvas: f }));
  sparkFrames().forEach((f, i) => out.push({ name: `spark-${i}`, canvas: f }));
  splashFrames().forEach((f, i) => out.push({ name: `splash-${i}`, canvas: f }));
  beaconFrames(RAMPS.orange).forEach((f, i) => out.push({ name: `beacon-amber-${i}`, canvas: f }));
  beaconFrames(RAMPS.red).forEach((f, i) => out.push({ name: `beacon-red-${i}`, canvas: f }));
  out.push({ name: 'pin-critical', canvas: pin(RAMPS.red, '!') });
  out.push({ name: 'pin-warning', canvas: pin(RAMPS.orange, '!') });
  out.push({ name: 'pin-info', canvas: pin(RAMPS.teal, '?') });
  out.push({ name: 'pin-health', canvas: pin(RAMPS.coral, '+') });
  out.push({ name: 'pin-power', canvas: pin(RAMPS.violet, 'bolt') });
  [1, 2, 3].forEach((s) => out.push({ name: `crack-${s}`, canvas: crackDecal(s) }));
  out.push({ name: 'scorch', canvas: scorch() });
  puddleFrames().forEach((f, i) => out.push({ name: `puddle-${i}`, canvas: f }));
  out.push({ name: 'glow-warm-16', canvas: glow(16, RAMPS.glow[3]) });
  out.push({ name: 'glow-warm-32', canvas: glow(32, RAMPS.glow[3]) });
  out.push({ name: 'glow-warm-64', canvas: glow(64, RAMPS.glow[2]) });
  out.push({ name: 'glow-teal-64', canvas: glow(64, RAMPS.teal[4]) });
  out.push({ name: 'glow-red-32', canvas: glow(32, RAMPS.red[3]) });
  out.push({ name: 'glow-white-16', canvas: glow(16, '#ffffff') });
  lightningFrames().forEach((f, i) => out.push({ name: `lightning-${i}`, canvas: f }));
  glitchFrames().forEach((f, i) => out.push({ name: `glitch-${i}`, canvas: f }));
  out.push({ name: 'shield', canvas: shield() });
  [0, 1, 2].forEach((f) => out.push({ name: `sparkle-${f}`, canvas: sparkle(f) }));
  for (const k of ['plus', 'bolt', 'drop', 'wrench', 'box']) out.push({ name: `mini-${k}`, canvas: miniIcon(k) });
  confetti().forEach((f, i) => out.push({ name: `confetti-${i}`, canvas: f }));
  const rain = new PixelCanvas(2, 6);
  rain.vline(1, 0, 4, RAMPS.water[4]);
  rain.set(0, 5, RAMPS.water[3]);
  out.push({ name: 'rain', canvas: rain });
  const pixel = new PixelCanvas(2, 2);
  pixel.fillRect(0, 0, 2, 2, '#ffffff');
  out.push({ name: 'pixel', canvas: pixel });
  return out;
}
