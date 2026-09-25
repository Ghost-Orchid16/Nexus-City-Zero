// 3/4-view building generator. Every building returns a base sprite plus a night "lights" mask
// (window glow) so the game can black out districts when energy fails.
import { PixelCanvas, RAMPS, INK, drawWindow, hash2, ditherOn } from '../lib/draw.mjs';

const GLASS = RAMPS.glass;

/**
 * @typedef {object} BuildingSpec
 * @property {number} w facade width
 * @property {number} roofD visible roof depth
 * @property {number} wallH facade height
 * @property {string[]} wall ramp
 * @property {string[]} roof ramp
 * @property {'flat'|'gable'|'sawtooth'|'hip'} [roofStyle]
 */

export function makeBuilding(spec) {
  const {
    w, roofD, wallH, wall, roof,
    trim = RAMPS.stone,
    roofStyle = 'flat',
    windows = null,
    door = null,
    floors = 0,
    plinth = 2,
    roofProps = [],
    decorate = null,
    seed = 1,
    gableH = Math.round(spec.w * 0.3),
    overhang = ['gable', 'hip', 'gableFront'].includes(roofStyle) ? 1 : 0
  } = spec;
  const pad = 1 + overhang;
  const topH = roofStyle === 'gableFront' ? roofD + gableH : roofD;
  const W = w + pad * 2;
  const H = topH + wallH + 2;
  const c = new PixelCanvas(W, H);
  const lights = new PixelCanvas(W, H);
  const ox = pad;
  const oy = 1;
  const fy = oy + topH; // facade top

  // ---------- facade ----------
  c.fillRect(ox, fy, w, wallH, wall[2]);
  c.vline(ox, fy, fy + wallH - 1, wall[3]);
  c.vline(ox + 1, fy, fy + wallH - 1, wall[3]);
  c.vline(ox + w - 1, fy, fy + wallH - 1, wall[1]);
  if (floors > 0) {
    for (let y = fy + floors; y < fy + wallH - plinth - 1; y += floors) {
      c.hline(ox + 2, ox + w - 2, y, wall[1]);
      c.hline(ox + 2, ox + w - 2, y + 1, wall[3]);
    }
  }
  // soft shade under the roof edge
  c.hline(ox, ox + w - 1, fy, wall[1]);
  for (let x = ox; x < ox + w; x++) if (ditherOn(x, fy + 1, 0.5)) c.set(x, fy + 1, wall[1]);
  // plinth
  if (plinth > 0) {
    c.fillRect(ox, fy + wallH - plinth, w, plinth, trim[1]);
    c.hline(ox, ox + w - 1, fy + wallH - plinth, trim[3]);
  }

  // ---------- windows ----------
  if (windows) placeWindows(c, lights, { ox, fy, w, wallH, plinth, spec: windows, seed });

  // ---------- door ----------
  if (door) drawDoor(c, lights, { ox, fy, w, wallH, plinth, door });

  // ---------- roof ----------
  if (roofStyle === 'gableFront') drawFrontGable(c, lights, { ox, oy, w, roofD, gableH, roof, wall, overhang, fy });
  else drawRoof(c, { ox, oy, w, roofD, roof, roofStyle, overhang });
  for (const p of roofProps) drawRoofProp(c, lights, ox, oy, p);

  if (decorate) decorate(c, lights, { ox, oy, fy, w, wallH, roofD, W, H });

  c.outline(INK);
  return { canvas: c, lights, anchorX: Math.floor(W / 2), anchorY: H - 1 };
}

function placeWindows(c, lights, { ox, fy, w, wallH, plinth, spec, seed }) {
  const {
    rows, cols, ww = 3, wh = 4, gx = 3, gy = 3, top = 4, glass = GLASS,
    frame = null, sill = null, style = 'grid', warmRatio = 0.75, litRatio = 0.9, skipDoorCols = 0,
    blinds = false
  } = spec;
  const gridW = cols * ww + (cols - 1) * gx;
  const startX = ox + Math.floor((w - gridW) / 2);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = startX + k * (ww + gx);
      const y = fy + top + r * (wh + gy);
      if (y + wh > fy + wallH - plinth - 1) continue;
      if (skipDoorCols && r === rows - 1) {
        const mid = (cols - 1) / 2;
        if (Math.abs(k - mid) < skipDoorCols / 2) continue;
      }
      if (style === 'curtain') {
        // glass curtain wall: structured diagonal sky reflections, never random noise
        for (let yy = y; yy < y + wh; yy++) {
          for (let xx = x; xx < x + ww; xx++) {
            const band = ((xx - ox) + (yy - fy) * 0.6) % 22;
            const tone = band < 2 ? 4 : band < 5 ? 3 : band < 12 ? 2 : 1;
            c.set(xx, yy, glass[tone]);
          }
        }
        if (hash2(k, r, seed + 3) < litRatio) {
          const warm = hash2(k, r, seed + 5) < warmRatio;
          lights.fillRect(x, y, ww, wh, warm ? RAMPS.glow[3] : RAMPS.cyan[4]);
        }
      } else {
        drawWindow(c, lights, x, y, ww, wh, {
          frame, glass, sill, blinds,
          lit: hash2(k, r, seed + 3) < litRatio,
          warm: hash2(k, r, seed + 5) < warmRatio
        });
      }
    }
  }
}

function drawDoor(c, lights, { ox, fy, w, wallH, plinth, door }) {
  const { w: dw = 5, h: dh = 7, offset = 0, color = RAMPS.brown, awning = null, glassDoor = false, step = true } = door;
  const dx = ox + Math.floor((w - dw) / 2) + offset;
  const dy = fy + wallH - dh;
  c.fillRect(dx - 1, dy - 1, dw + 2, dh + 1, color[0]);
  if (glassDoor) {
    c.fillRect(dx, dy, dw, dh, GLASS[1]);
    c.fillRect(dx, dy, dw, Math.ceil(dh / 2), GLASS[2]);
    c.vline(dx + Math.floor(dw / 2), dy, dy + dh - 1, color[1]);
    lights.fillRect(dx, dy, dw, dh, RAMPS.glow[2]);
  } else {
    c.fillRect(dx, dy, dw, dh, color[2]);
    c.vline(dx, dy, dy + dh - 1, color[3]);
    c.set(dx + dw - 2, dy + Math.floor(dh / 2), RAMPS.yellow[3]);
  }
  if (step) c.hline(dx - 1, dx + dw, fy + wallH - 1, RAMPS.stone[3]);
  if (awning) {
    const ay = dy - 4;
    for (let x = dx - 2; x < dx + dw + 2; x++) {
      const band = Math.floor((x - dx + 2) / 2) % 2 === 0;
      c.set(x, ay, awning[3]);
      c.set(x, ay + 1, band ? awning[2] : RAMPS.cream[4]);
      c.set(x, ay + 2, band ? awning[1] : RAMPS.cream[3]);
    }
  }
  void plinth;
}

function drawRoof(c, { ox, oy, w, roofD, roof, roofStyle, overhang }) {
  if (roofD <= 0) return;
  if (roofStyle === 'flat') {
    c.fillRect(ox, oy, w, roofD, roof[2]);
    // parapet rim
    c.hline(ox, ox + w - 1, oy, roof[3]);
    c.vline(ox, oy, oy + roofD - 1, roof[3]);
    c.vline(ox + w - 1, oy, oy + roofD - 1, roof[1]);
    // parapet casts shadow onto the roof inside the top/left rim
    if (roofD > 3) {
      c.hline(ox + 1, ox + w - 2, oy + 1, roof[1]);
      c.vline(ox + 1, oy + 1, oy + roofD - 2, roof[1]);
    }
    // front lip catches the light
    c.hline(ox, ox + w - 1, oy + roofD - 1, roof[4]);
    // gravel speckle
    for (let y = oy + 2; y < oy + roofD - 1; y++) for (let x = ox + 2; x < ox + w - 1; x++) {
      if (hash2(x, y, 11) < 0.06) c.set(x, y, roof[3]);
    }
  } else if (roofStyle === 'gable' || roofStyle === 'hip') {
    // Side-gable seen from the front and above: a thin shaded back slope, a bright ridge,
    // then the lit front slope with shingle courses down to a deep eave shadow.
    const x0 = ox - overhang;
    const x1 = ox + w - 1 + overhang;
    const back = Math.max(1, Math.round(roofD * 0.25));
    for (let y = oy; y < oy + roofD; y++) {
      const row = y - oy;
      const inset = roofStyle === 'hip' ? Math.max(0, Math.min(5, back + 3 - row)) : 0;
      let color;
      if (row < back) color = roof[1];
      else if (row === back) color = roof[4];
      else color = row < back + (roofD - back) * 0.45 ? roof[3] : roof[2];
      c.hline(x0 + inset, x1 - inset, y, color);
      if (row > back + 1 && (row - back) % 3 === 0) {
        for (let x = x0 + inset + 1; x < x1 - inset; x++) if ((x + row) % 5 !== 0) c.set(x, y, roof[1]);
      }
      c.set(x0 + inset, y, row <= back ? roof[2] : roof[3]);
      c.set(x1 - inset, y, roof[1]);
    }
    c.hline(x0, x1, oy + roofD - 1, roof[1]);
    c.hline(x0, x1, oy + roofD, roof[0]);
  } else if (roofStyle === 'sawtooth') {
    const tooth = 8;
    c.fillRect(ox, oy, w, roofD, roof[1]);
    for (let tx = ox; tx < ox + w; tx += tooth) {
      for (let y = oy; y < oy + roofD; y++) {
        const t = (y - oy) / Math.max(1, roofD - 1);
        const glassW = Math.max(1, Math.round((1 - t) * 3));
        for (let x = tx; x < Math.min(ox + w, tx + tooth); x++) {
          const local = x - tx;
          c.set(x, y, local < glassW ? GLASS[2 + (y % 2)] : local === glassW ? roof[4] : roof[2 + ((local + y) % 5 === 0 ? 1 : 0)]);
        }
      }
    }
    c.hline(ox, ox + w - 1, oy + roofD - 1, roof[4]);
  }
}

/**
 * Front-facing gable: two roof planes receding from the viewer (left lit, right shaded), a ridge
 * line, and the triangular gable wall with an attic window — the classic storybook house.
 */
function drawFrontGable(c, lights, { ox, oy, w, roofD, gableH, roof, wall, overhang, fy }) {
  const midX = ox + Math.floor(w / 2);
  const ridgeFrontY = oy + roofD;
  const eaveL = ox - overhang;
  const eaveR = ox + w - 1 + overhang;
  const eaveY = fy + 1;
  // roof planes (back edges are the front edges shifted up by roofD)
  c.fillPoly([[eaveL, eaveY - roofD], [midX + 0.5, oy], [midX + 0.5, ridgeFrontY], [eaveL, eaveY]], roof[3]);
  c.fillPoly([[midX + 0.5, oy], [eaveR + 1, eaveY - roofD], [eaveR + 1, eaveY], [midX + 0.5, ridgeFrontY]], roof[2]);
  // shingle courses parallel to the eaves
  for (let k = 2; k < roofD; k += 3) {
    for (let x = eaveL; x <= eaveR; x++) {
      const onLeft = x <= midX;
      const t = onLeft ? (x - eaveL) / Math.max(1, midX - eaveL) : (eaveR - x) / Math.max(1, eaveR - midX);
      const yy = Math.round(eaveY - t * (eaveY - ridgeFrontY)) - k;
      const cur = c.get(x, yy);
      if (cur[3] && (x + k) % 4 !== 0) c.set(x, yy, onLeft ? roof[2] : roof[1]);
    }
  }
  c.vline(midX, oy, ridgeFrontY, roof[4]);
  // gable wall triangle
  c.fillPoly([[ox, fy + 0.5], [midX + 0.5, ridgeFrontY + 1], [ox + w, fy + 0.5]], wall[2]);
  // bargeboards along the gable edges
  for (let x = ox - overhang; x <= ox + w - 1 + overhang; x++) {
    const t = x <= midX ? (x - eaveL) / Math.max(1, midX - eaveL) : (eaveR - x) / Math.max(1, eaveR - midX);
    const y = Math.round(eaveY - t * (eaveY - ridgeFrontY));
    c.set(x, y, roof[0]);
    c.set(x, y + 1, RAMPS.cream[4]);
  }
  // attic window
  const ay = ridgeFrontY + Math.max(3, Math.floor(gableH * 0.45));
  c.fillRect(midX - 1, ay, 3, 3, RAMPS.glass[2]);
  c.set(midX - 1, ay, RAMPS.glass[4]);
  c.strokeRect(midX - 2, ay - 1, 5, 5, roof[0]);
  lights.fillRect(midX - 1, ay, 3, 3, RAMPS.glow[3]);
  // eave shadow on the facade
  c.hline(ox, ox + w - 1, fy, wall[1]);
}

/** Rooftop details: ac units, tanks, antennas, solar panels, helipads, gardens. */
function drawRoofProp(c, lights, ox, oy, p) {
  const x = ox + p.x;
  const y = oy + p.y;
  switch (p.type) {
    case 'ac':
      c.fillRect(x, y, 4, 3, RAMPS.stone[3]);
      c.hline(x, x + 3, y, RAMPS.stone[4]);
      c.hline(x, x + 3, y + 2, RAMPS.stone[1]);
      c.set(x + 1, y + 1, RAMPS.stone[1]);
      c.set(x + 2, y + 1, RAMPS.stone[1]);
      break;
    case 'vent':
      c.fillRect(x, y, 2, 2, RAMPS.stone[1]);
      c.set(x, y, RAMPS.stone[3]);
      break;
    case 'tank':
      c.fillOval(x, y, 6, 5, RAMPS.brown[2]);
      c.hline(x + 1, x + 4, y, RAMPS.brown[4]);
      c.vline(x + 5, y + 1, y + 3, RAMPS.brown[1]);
      c.set(x + 1, y + 5, RAMPS.brown[0]);
      c.set(x + 4, y + 5, RAMPS.brown[0]);
      break;
    case 'antenna':
      c.vline(x, y - (p.h || 8), y, RAMPS.stone[1]);
      c.set(x, y - (p.h || 8) - 1, RAMPS.red[3]);
      lights.set(x, y - (p.h || 8) - 1, RAMPS.red[4]);
      c.hline(x - 1, x + 1, y - Math.floor((p.h || 8) / 2), RAMPS.stone[2]);
      break;
    case 'solar':
      for (let k = 0; k < (p.n || 3); k++) {
        const sx = x + k * 5;
        c.fillRect(sx, y, 4, 3, RAMPS.blue[1]);
        c.hline(sx, sx + 3, y, RAMPS.blue[3]);
        c.set(sx + 1, y + 1, RAMPS.blue[2]);
      }
      break;
    case 'helipad': {
      const r = p.r || 10;
      c.fillOval(x, y, r, Math.round(r * 0.7), RAMPS.stone[1]);
      c.strokeOval(x, y, r, Math.round(r * 0.7), RAMPS.yellow[3]);
      const hx = x + Math.floor(r / 2) - 2;
      const hy = y + Math.floor(r * 0.35) - 2;
      c.vline(hx, hy, hy + 3, RAMPS.cream[4]);
      c.vline(hx + 3, hy, hy + 3, RAMPS.cream[4]);
      c.hline(hx, hx + 3, hy + 1, RAMPS.cream[4]);
      break;
    }
    case 'garden':
      for (let yy = y; yy < y + (p.h || 3); yy++) for (let xx = x; xx < x + (p.w || 8); xx++) {
        c.set(xx, yy, hash2(xx, yy, 5) < 0.5 ? RAMPS.green[3] : RAMPS.green[2]);
      }
      c.hline(x, x + (p.w || 8) - 1, y, RAMPS.lime[3]);
      break;
    case 'dish':
      c.fillOval(x, y, 5, 4, RAMPS.cream[4]);
      c.strokeOval(x, y, 5, 4, RAMPS.stone[2]);
      c.set(x + 2, y + 1, RAMPS.stone[1]);
      break;
    case 'chimney':
      c.fillRect(x, y - 3, 3, 5, RAMPS.brown[2]);
      c.hline(x, x + 2, y - 3, RAMPS.stone[1]);
      c.vline(x + 2, y - 2, y + 1, RAMPS.brown[1]);
      break;
    case 'beacon':
      c.fillRect(x, y, 2, 2, RAMPS.red[2]);
      lights.fillRect(x, y, 2, 2, RAMPS.red[4]);
      break;
    default:
      throw new Error(`Unknown roof prop ${p.type}`);
  }
}

/** Painted sign board (no text — symbols only, so nothing needs translation). */
export function drawSign(c, x, y, w, h, ramp, symbol = null, symbolColor = RAMPS.cream[4]) {
  c.fillRect(x, y, w, h, ramp[2]);
  c.hline(x, x + w - 1, y, ramp[3]);
  c.hline(x, x + w - 1, y + h - 1, ramp[1]);
  if (symbol === 'cross') {
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    c.vline(cx, cy - 1, cy + 1, symbolColor);
    c.hline(cx - 1, cx + 1, cy, symbolColor);
  } else if (symbol === 'bolt') {
    const cx = x + Math.floor(w / 2);
    c.set(cx, y + 1, symbolColor); c.set(cx - 1, y + 2, symbolColor); c.set(cx, y + 2, symbolColor);
    c.set(cx + 1, y + 2, symbolColor); c.set(cx, y + 3, symbolColor);
  } else if (symbol === 'dots') {
    for (let k = x + 1; k < x + w - 1; k += 2) c.set(k, y + Math.floor(h / 2), symbolColor);
  }
}
