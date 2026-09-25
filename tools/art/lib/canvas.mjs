// PixelCanvas — a tiny RGBA raster with pixel-art primitives used by every art family.
import { encodePNG } from './png.mjs';

const colorCache = new Map();

/** Parse '#rrggbb', '#rrggbbaa' or [r,g,b(,a)] into a cached [r,g,b,a] array. */
export function parseColor(c) {
  if (c == null) return null;
  if (Array.isArray(c)) return c.length === 4 ? c : [c[0], c[1], c[2], 255];
  let v = colorCache.get(c);
  if (!v) {
    const s = c.charAt(0) === '#' ? c.slice(1) : c;
    v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16),
      s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255];
    colorCache.set(c, v);
  }
  return v;
}

export function toHex([r, g, b]) {
  return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Mix two colors (t = 0 → a, 1 → b). */
export function mix(a, b, t) {
  const A = parseColor(a);
  const B = parseColor(b);
  return toHex([0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t)));
}

// 4×4 ordered-dither threshold matrix (values 0..15).
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

/** True when the ordered-dither pattern at (x,y) should show the second color for fraction t. */
export function ditherOn(x, y, t) {
  return (BAYER4[y & 3][x & 3] + 0.5) / 16 < t;
}

export class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Overwrite a pixel (no blending). */
  set(x, y, color) {
    x |= 0;
    y |= 0;
    if (!this.inBounds(x, y) || color == null) return;
    const c = parseColor(color);
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  /** Alpha-composite a color over the pixel. */
  blend(x, y, color, alpha = 1) {
    x |= 0;
    y |= 0;
    if (!this.inBounds(x, y) || color == null) return;
    const c = parseColor(color);
    const a = (c[3] / 255) * alpha;
    const i = (y * this.w + x) * 4;
    const da = this.data[i + 3] / 255;
    const outA = a + da * (1 - a);
    if (outA <= 0) return;
    for (let k = 0; k < 3; k++) {
      this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / outA;
    }
    this.data[i + 3] = outA * 255;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x, y) {
    if (!this.inBounds(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  opaque(x, y) {
    return this.alpha(x, y) > 0;
  }

  clearPixel(x, y) {
    if (!this.inBounds(x, y)) return;
    this.data.fill(0, (y * this.w + x) * 4, (y * this.w + x) * 4 + 4);
  }

  fillRect(x, y, w, h, color) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color);
    return this;
  }

  blendRect(x, y, w, h, color, alpha = 1) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.blend(xx, yy, color, alpha);
    return this;
  }

  strokeRect(x, y, w, h, color) {
    this.hline(x, x + w - 1, y, color);
    this.hline(x, x + w - 1, y + h - 1, color);
    this.vline(x, y, y + h - 1, color);
    this.vline(x + w - 1, y, y + h - 1, color);
    return this;
  }

  hline(x0, x1, y, color) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, color);
    return this;
  }

  vline(x, y0, y1, color) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, color);
    return this;
  }

  /** Bresenham line. */
  line(x0, y0, x1, y1, color) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Filled oval inscribed in the box (x, y, w, h), tested at pixel centers. */
  fillOval(x, y, w, h, color) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
      for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx++) {
        const nx = (xx + 0.5 - cx) / rx;
        const ny = (yy + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1.0) this.set(xx, yy, color);
      }
    }
    return this;
  }

  /** Oval outline (pixels inside the oval whose 4-neighbor lies outside it). */
  strokeOval(x, y, w, h, color) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const inside = (xx, yy) => {
      const nx = (xx + 0.5 - cx) / (w / 2);
      const ny = (yy + 0.5 - cy) / (h / 2);
      return nx * nx + ny * ny <= 1.0;
    };
    for (let yy = Math.floor(y); yy < Math.ceil(y + h); yy++) {
      for (let xx = Math.floor(x); xx < Math.ceil(x + w); xx++) {
        if (!inside(xx, yy)) continue;
        if (!inside(xx - 1, yy) || !inside(xx + 1, yy) || !inside(xx, yy - 1) || !inside(xx, yy + 1)) {
          this.set(xx, yy, color);
        }
      }
    }
    return this;
  }

  /** Scanline polygon fill; points = [[x,y], ...] in pixel units. */
  fillPoly(points, color) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, py] of points) { minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) {
          xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, color);
      }
    }
    return this;
  }

  /** Paint every pixel where predicate(x, y) is true. */
  fillWhere(predicate, color) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (predicate(x, y)) this.set(x, y, color);
    return this;
  }

  /** Recolor opaque pixels through fn(x, y, [r,g,b,a]) → color|null. */
  mapOpaque(fn) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c[3] === 0) continue;
        const out = fn(x, y, c);
        if (out) this.set(x, y, out);
      }
    }
    return this;
  }

  /** Vertical gradient through color stops with ordered dithering between neighbors. */
  gradientV(x, y, w, h, stops, dither = true) {
    const n = stops.length - 1;
    for (let yy = 0; yy < h; yy++) {
      const t = (yy / Math.max(1, h - 1)) * n;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      for (let xx = 0; xx < w; xx++) {
        const useNext = dither ? ditherOn(x + xx, y + yy, f) : f >= 0.5;
        this.set(x + xx, y + yy, useNext ? stops[i + 1] : stops[i]);
      }
    }
    return this;
  }

  /** Copy another canvas onto this one (opaque pixels; partial alpha is composited). */
  blit(src, dx, dy, { flipX = false, flipY = false, only = null } = {}) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, flipY ? src.h - 1 - y : y);
        if (c[3] === 0) continue;
        if (only && !only(dx + x, dy + y)) continue;
        if (c[3] === 255) this.set(dx + x, dy + y, c);
        else this.blend(dx + x, dy + y, [c[0], c[1], c[2], 255], c[3] / 255);
      }
    }
    return this;
  }

  /**
   * Add an outline in empty pixels that touch opaque ones.
   * corners=false keeps rounded, chunky pixel-art silhouettes.
   */
  outline(color, { corners = false, where = null } = {}) {
    const marks = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.opaque(x, y)) continue;
        const n = this.opaque(x - 1, y) || this.opaque(x + 1, y) || this.opaque(x, y - 1) || this.opaque(x, y + 1);
        const d = corners && (this.opaque(x - 1, y - 1) || this.opaque(x + 1, y - 1) ||
          this.opaque(x - 1, y + 1) || this.opaque(x + 1, y + 1));
        if ((n || d) && (!where || where(x, y))) marks.push(x, y);
      }
    }
    for (let i = 0; i < marks.length; i += 2) this.set(marks[i], marks[i + 1], color);
    return this;
  }

  /** Replace exact colors: { '#from': '#to' }. */
  swap(map) {
    const lookup = new Map(Object.entries(map).map(([k, v]) => [parseColor(k).slice(0, 3).join(','), v]));
    return this.mapOpaque((x, y, c) => lookup.get(`${c[0]},${c[1]},${c[2]}`) || null);
  }

  clone() {
    const c = new PixelCanvas(this.w, this.h);
    c.data.set(this.data);
    return c;
  }

  crop(x, y, w, h) {
    const c = new PixelCanvas(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const px = this.get(x + xx, y + yy);
      if (px[3]) c.set(xx, yy, px);
    }
    return c;
  }

  /** Bounding box of opaque pixels, or null when empty. */
  bounds() {
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.opaque(x, y)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  /** Nearest-neighbor upscale (for previews). */
  scaled(n) {
    const c = new PixelCanvas(this.w * n, this.h * n);
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const px = this.get((x / n) | 0, (y / n) | 0);
      if (px[3]) c.set(x, y, px);
    }
    return c;
  }

  /** Count distinct opaque colors (palette discipline check). */
  colorCount() {
    const s = new Set();
    for (let i = 0; i < this.data.length; i += 4) if (this.data[i + 3]) s.add(`${this.data[i]},${this.data[i + 1]},${this.data[i + 2]}`);
    return s.size;
  }

  toPNG() {
    return encodePNG(this.w, this.h, this.data);
  }
}
