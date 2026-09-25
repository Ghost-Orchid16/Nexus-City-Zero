// Shared pixel-art drawing helpers. Light always comes from the upper left.
import { PixelCanvas, ditherOn, mix } from './canvas.mjs';
import { RAMPS, INK } from '../../../src/config/palette.js';

export { RAMPS, INK, PixelCanvas, ditherOn, mix };

/** Deterministic hash → [0,1) for per-pixel/per-tile variation without an RNG object. */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}

/** Seeded PRNG for forge-time scattering (mulberry32). */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rectangle with a pixel bevel: lit top/left edges, shaded bottom/right edges. */
export function bevelRect(c, x, y, w, h, ramp, { base = 2, hi = 3, lo = 1, top = true } = {}) {
  c.fillRect(x, y, w, h, ramp[base]);
  if (top) c.hline(x, x + w - 1, y, ramp[hi]);
  c.vline(x, y, y + h - 1, ramp[hi]);
  c.vline(x + w - 1, y, y + h - 1, ramp[lo]);
  c.hline(x, x + w - 1, y + h - 1, ramp[lo]);
}

/** A glazed window: frame, glass with a reflection glint, and an optional light mask. */
export function drawWindow(c, lights, x, y, w, h, { frame, glass = RAMPS.glass, sill = null, lit = true, warm = true, blinds = false } = {}) {
  if (frame) c.strokeRect(x - 1, y - 1, w + 2, h + 2, frame);
  c.fillRect(x, y, w, h, glass[1]);
  // upper half catches the sky
  c.fillRect(x, y, w, Math.ceil(h / 2), glass[2]);
  c.set(x, y, glass[3]);
  if (w > 2 && h > 2) c.set(x + 1, y, glass[4]);
  if (blinds) for (let yy = y + 1; yy < y + h; yy += 2) c.hline(x, x + w - 1, yy, glass[0]);
  if (sill) c.hline(x - 1, x + w, y + h, sill);
  if (lights && lit) {
    const warmRamp = warm ? RAMPS.glow : RAMPS.cyan;
    lights.fillRect(x, y, w, h, warmRamp[3]);
    lights.fillRect(x, y + h - 1, w, 1, warmRamp[2]);
    lights.set(x, y, warmRamp[4]);
  }
}

/** Soft cast shadow: a dithered plum parallelogram offset down-right from a footprint. */
export function castShadow(c, x, y, w, h, alpha = 0.35) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (ditherOn(x + xx, y + yy, 0.75)) c.blend(x + xx + Math.floor(yy / 2), y + yy, RAMPS.plum[0], alpha);
    }
  }
}

/** Stamp a dark outline around the canvas silhouette and return it. */
export function inked(c, color = INK) {
  return c.outline(color);
}

/** New canvas with a 1px margin for the outline. */
export function canvasFor(w, h, pad = 1) {
  return new PixelCanvas(w + pad * 2, h + pad * 2);
}

/** Horizontal dithered band between two colors (for sky/ground gradients). */
export function ditherBand(c, x, y, w, h, a, b, t) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) c.set(xx, yy, ditherOn(xx, yy, t) ? b : a);
}

/** Sprinkle pixels from a palette inside a rect with a deterministic density. */
export function speckle(c, x, y, w, h, colors, density, seed = 1) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const r = hash2(xx, yy, seed);
      if (r < density) c.set(xx, yy, colors[Math.floor(hash2(xx, yy, seed + 7) * colors.length)]);
    }
  }
}
