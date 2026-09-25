// Shelf-packs named canvases into one texture and emits a Phaser JSON-hash atlas.
import { PixelCanvas } from './canvas.mjs';
import { drawLabel } from './grid.mjs';

/**
 * @param {Array<{name: string, canvas: PixelCanvas}>} items
 * @param {{maxWidth?: number, padding?: number, image: string}} opts
 */
export function packAtlas(items, { maxWidth = 1024, padding = 2, image }) {
  const names = new Set();
  for (const it of items) {
    if (names.has(it.name)) throw new Error(`Duplicate atlas frame name: ${it.name}`);
    names.add(it.name);
  }
  const sorted = [...items].sort((a, b) => b.canvas.h - a.canvas.h || b.canvas.w - a.canvas.w);
  let x = padding;
  let y = padding;
  let shelfH = 0;
  let usedW = 0;
  const placed = [];
  for (const it of sorted) {
    const { w, h } = it.canvas;
    if (w + padding * 2 > maxWidth) throw new Error(`Frame ${it.name} (${w}px) wider than atlas`);
    if (x + w + padding > maxWidth) {
      x = padding;
      y += shelfH + padding;
      shelfH = 0;
    }
    placed.push({ ...it, x, y });
    x += w + padding;
    usedW = Math.max(usedW, x);
    shelfH = Math.max(shelfH, h);
  }
  const width = pow2(usedW);
  const height = pow2(y + shelfH + padding);
  const tex = new PixelCanvas(width, height);
  const frames = {};
  for (const p of placed) {
    tex.blit(p.canvas, p.x, p.y);
    frames[p.name] = {
      frame: { x: p.x, y: p.y, w: p.canvas.w, h: p.canvas.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: p.canvas.w, h: p.canvas.h },
      sourceSize: { w: p.canvas.w, h: p.canvas.h }
    };
  }
  const json = {
    frames,
    meta: { app: 'nexus-art-forge', image, format: 'RGBA8888', size: { w: width, h: height }, scale: '1' }
  };
  return { texture: tex, json };
}

function pow2(n) {
  let p = 16;
  while (p < n) p *= 2;
  return p;
}

/** QA contact sheet: every frame upscaled on a checkerboard with its name underneath. */
export function contactSheet(items, { scale = 3, columns = 8, cell = 0 } = {}) {
  const maxW = Math.max(...items.map((i) => i.canvas.w)) * scale;
  const maxH = Math.max(...items.map((i) => i.canvas.h)) * scale;
  const cw = Math.max(cell, maxW + 8, 64);
  const ch = maxH + 16;
  const rows = Math.ceil(items.length / columns);
  const sheet = new PixelCanvas(cw * Math.min(columns, items.length), ch * rows);
  for (let yy = 0; yy < sheet.h; yy++) {
    for (let xx = 0; xx < sheet.w; xx++) {
      const light = ((xx >> 3) + (yy >> 3)) & 1;
      sheet.set(xx, yy, light ? '#d8d2e0' : '#c4bdd0');
    }
  }
  items.forEach((it, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const ox = col * cw + 4;
    const oy = row * ch + 4;
    drawLabel(sheet, it.name.slice(0, Math.floor((cw - 6) / 4)), ox, oy, '#261a3a');
    sheet.blit(it.canvas.scaled(scale), ox, oy + 9);
  });
  return sheet;
}
