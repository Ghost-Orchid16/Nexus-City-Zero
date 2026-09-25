// Renders the whole city ground (720×400) from the shared layout, with auto-tiled roads,
// sidewalks, shorelines, rails and district surfaces, plus flowing-water animation frames.
import { PixelCanvas, RAMPS, hash2, ditherOn } from '../lib/draw.mjs';
import { TILE, COLS, ROWS, ROADS, groundAt, riverBanks, bayShore, isWaterAt } from '../../../src/data/city-layout.js';

const W = COLS * TILE;
const H = ROWS * TILE;

const isRoad = (ch) => ch === 'r' || ch === 'b';
const isWater = (ch) => ch === '~';
const hasSidewalk = (ch) => ['g', 'G', 'p', 'c', 'd', 'P'].includes(ch);

const vRoadCols = new Set(ROADS.vertical.map((v) => v.col));
const hRoadRows = new Set(ROADS.horizontal.flatMap((h) => (h.width === 2 ? [h.row, h.row + 1] : [h.row])));

function isVerticalRoad(c, r) {
  return vRoadCols.has(c) && isRoad(groundAt(c, r)) && r >= 3 && r <= 21;
}
function isHorizontalRoad(c, r) {
  return hRoadRows.has(r) && isRoad(groundAt(c, r));
}

/** Distance (in tiles, 0..3) from a water tile to the nearest land tile. */
function waterDepth(c, r) {
  for (let d = 1; d <= 3; d++) {
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      const g = groundAt(c + dx, r + dy);
      if (g !== null && !isWater(g) && g !== 'b') return d - 1;
    }
  }
  return 3;
}

function paintTile(g, c, r) {
  const x0 = c * TILE;
  const y0 = r * TILE;
  const ch = groundAt(c, r);
  const px = (fn) => {
    for (let y = y0; y < y0 + TILE; y++) for (let x = x0; x < x0 + TILE; x++) fn(x, y);
  };
  switch (ch) {
    case 'g':
      px((x, y) => {
        const h = hash2(x >> 1, y >> 1, 3);
        g.set(x, y, h < 0.04 ? RAMPS.green[2] : RAMPS.green[3]);
        if (h > 0.992) g.set(x, y, RAMPS.lime[3]);
      });
      break;
    case 'G':
      px((x, y) => {
        const stripe = Math.floor(y / 8) % 2 === 0;
        g.set(x, y, stripe && ditherOn(x, y, 0.3) ? RAMPS.green[4] : RAMPS.green[3]);
      });
      break;
    case 'f':
      px((x, y) => {
        const h = hash2(x >> 1, y >> 1, 5);
        g.set(x, y, h < 0.18 ? RAMPS.green[1] : RAMPS.green[2]);
        if (hash2(x, y, 6) > 0.995) g.set(x, y, RAMPS.orange[3]);
      });
      break;
    case 'm':
      px((x, y) => {
        const row = y % 5;
        g.set(x, y, row === 0 ? RAMPS.brown[3] : row === 4 ? RAMPS.brown[4] : hash2(x >> 1, y, 8) < 0.2 ? RAMPS.lime[2] : RAMPS.lime[3]);
      });
      break;
    case 's':
      px((x, y) => {
        const h = hash2(x, y, 9);
        g.set(x, y, h < 0.06 ? RAMPS.sand[2] : RAMPS.sand[3]);
        if (h > 0.99) g.set(x, y, RAMPS.cream[4]);
      });
      break;
    case '~': {
      const depth = waterDepth(c, r);
      px((x, y) => {
        const base = depth >= 2 ? RAMPS.water[1] : depth === 1 ? RAMPS.water[2] : RAMPS.water[2];
        g.set(x, y, base);
        if (depth >= 2 && ditherOn(x, y, 0.25)) g.set(x, y, RAMPS.water[2]);
      });
      break;
    }
    case 'p':
      // regular slab paving: 8px slabs, alternating tone in a calm checker, lit top-left edges
      px((x, y) => {
        const alt = ((x >> 3) + (y >> 3)) % 2 === 0;
        let col = alt ? RAMPS.stone[3] : RAMPS.cream[3];
        if ((x & 7) === 7 || (y & 7) === 7) col = RAMPS.stone[2];
        else if ((x & 7) === 0 || (y & 7) === 0) col = alt ? RAMPS.stone[4] : RAMPS.cream[4];
        g.set(x, y, col);
      });
      break;
    case 'c':
      px((x, y) => {
        let col = RAMPS.stone[3];
        if ((x & 15) === 15 || (y & 15) === 15) col = RAMPS.stone[2];
        else if ((x & 15) === 0 || (y & 15) === 0) col = RAMPS.stone[4];
        g.set(x, y, col);
      });
      break;
    case 'd':
      px((x, y) => {
        const h = hash2(x >> 1, y >> 1, 14);
        g.set(x, y, h < 0.05 ? RAMPS.brown[2] : h > 0.97 ? RAMPS.sand[3] : RAMPS.brown[3]);
      });
      break;
    case 'P':
      px((x, y) => {
        g.set(x, y, RAMPS.asphalt[3]);
        if ((x % 12) === 0 && (y - y0) > 2 && (y - y0) < 13) g.set(x, y, RAMPS.cream[4]);
      });
      break;
    case 't':
      px((x, y) => {
        const ly = y - y0;
        let col = hash2(x, y, 15) < 0.3 ? RAMPS.stone[1] : RAMPS.stone[2];
        if ((x % 5) < 2 && ly > 2 && ly < 14) col = RAMPS.brown[2];
        if (ly === 5 || ly === 11) col = RAMPS.stone[4];
        if (ly === 6 || ly === 12) col = RAMPS.stone[0];
        g.set(x, y, col);
      });
      break;
    case 'r':
    case 'b':
      paintRoad(g, c, r, ch === 'b');
      break;
    default:
      throw new Error(`Unknown ground code ${ch}`);
  }
}

function paintRoad(g, c, r, bridge) {
  const x0 = c * TILE;
  const y0 = r * TILE;
  for (let y = y0; y < y0 + TILE; y++) for (let x = x0; x < x0 + TILE; x++) {
    g.set(x, y, hash2(x, y, 16) < 0.04 ? RAMPS.asphalt[1] : RAMPS.asphalt[2]);
  }
  const vert = isVerticalRoad(c, r);
  const horiz = isHorizontalRoad(c, r);
  const boulevardTop = r === 12;
  const boulevardBottom = r === 13;
  if (horiz && !vert) {
    if (boulevardTop) {
      g.hline(x0, x0 + TILE - 1, y0 + TILE - 1, RAMPS.yellow[3]);
    } else if (boulevardBottom) {
      g.hline(x0, x0 + TILE - 1, y0, RAMPS.yellow[3]);
    } else if ((c % 2) === 0) {
      g.hline(x0 + 3, x0 + 11, y0 + 7, RAMPS.cream[4]);
    }
    // crosswalk on approach to an intersection
    const nearV = isVerticalRoad(c - 1, r) || isVerticalRoad(c + 1, r);
    if (nearV && !bridge) {
      const side = isVerticalRoad(c - 1, r) ? x0 + 1 : x0 + TILE - 6;
      for (let y = y0 + 1; y < y0 + TILE - 1; y += 2) g.hline(side, side + 4, y, RAMPS.cream[4]);
    }
  } else if (vert && !horiz) {
    if ((r % 2) === 0) g.vline(x0 + 7, y0 + 3, y0 + 11, RAMPS.cream[4]);
    const nearH = isHorizontalRoad(c, r - 1) || isHorizontalRoad(c, r + 1);
    if (nearH) {
      const side = isHorizontalRoad(c, r - 1) ? y0 + 1 : y0 + TILE - 6;
      for (let x = x0 + 1; x < x0 + TILE - 1; x += 2) g.vline(x, side, side + 4, RAMPS.cream[4]);
    }
  }
  if (bridge) {
    // railings along the deck edges, casting a shadow onto the water
    if (r === 12) {
      g.hline(x0, x0 + TILE - 1, y0, RAMPS.stone[4]);
      g.hline(x0, x0 + TILE - 1, y0 + 1, RAMPS.stone[2]);
      for (let x = x0; x < x0 + TILE; x += 4) g.set(x, y0 + 1, RAMPS.stone[1]);
    }
    if (r === 13) {
      g.hline(x0, x0 + TILE - 1, y0 + TILE - 2, RAMPS.stone[4]);
      g.hline(x0, x0 + TILE - 1, y0 + TILE - 1, RAMPS.stone[1]);
      for (let x = x0; x < x0 + TILE; x += 4) g.set(x, y0 + TILE - 2, RAMPS.stone[2]);
    }
  }
}

/** Sidewalk strips inside block tiles that touch a road, plus curb highlight/shadow. */
function paintSidewalks(g) {
  const SW = 4;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = groundAt(c, r);
    if (!hasSidewalk(ch)) continue;
    const x0 = c * TILE;
    const y0 = r * TILE;
    const edges = {
      n: isRoad(groundAt(c, r - 1)), s: isRoad(groundAt(c, r + 1)),
      w: isRoad(groundAt(c - 1, r)), e: isRoad(groundAt(c + 1, r))
    };
    const walk = (x, y) => g.set(x, y, ((x + y) % 4 === 0) ? RAMPS.stone[2] : RAMPS.stone[3]);
    if (edges.n) for (let y = y0; y < y0 + SW; y++) for (let x = x0; x < x0 + TILE; x++) walk(x, y);
    if (edges.s) for (let y = y0 + TILE - SW; y < y0 + TILE; y++) for (let x = x0; x < x0 + TILE; x++) walk(x, y);
    if (edges.w) for (let y = y0; y < y0 + TILE; y++) for (let x = x0; x < x0 + SW; x++) walk(x, y);
    if (edges.e) for (let y = y0; y < y0 + TILE; y++) for (let x = x0 + TILE - SW; x < x0 + TILE; x++) walk(x, y);
    // curb lines on the road side
    if (edges.n) g.hline(x0, x0 + TILE - 1, y0, RAMPS.stone[4]);
    if (edges.s) g.hline(x0, x0 + TILE - 1, y0 + TILE - 1, RAMPS.stone[1]);
    if (edges.w) g.vline(x0, y0, y0 + TILE - 1, RAMPS.stone[4]);
    if (edges.e) g.vline(x0 + TILE - 1, y0, y0 + TILE - 1, RAMPS.stone[1]);
    // inner edge of the sidewalk meets the block surface
    if (edges.n) g.hline(x0, x0 + TILE - 1, y0 + SW, RAMPS.stone[1]);
    if (edges.w) g.vline(x0 + SW, y0, y0 + TILE - 1, RAMPS.stone[1]);
  }
}

/** Distance (px) from a water pixel to the nearest shore, for depth shading. */
function shoreDistance(x, y) {
  const [l, r] = riverBanks(y);
  const inRiver = x >= l && x <= r;
  const dRiver = inRiver ? Math.min(x - l, r - x) : Infinity;
  const shore = bayShore(x);
  const dBay = y >= shore ? y - shore : Infinity;
  // where river and bay meet, whichever body is deeper wins
  if (inRiver && y >= shore) return Math.max(dRiver, dBay);
  return Math.min(dRiver, dBay);
}

function waterColor(x, y, d) {
  if (d < 1.2) return RAMPS.water[4];
  if (d < 3) return RAMPS.water[3];
  if (d < 9) return ditherOn(x, y, 1 - (d - 3) / 6) ? RAMPS.water[3] : RAMPS.water[2];
  if (d < 20) return RAMPS.water[2];
  return ditherOn(x, y, Math.min(1, (d - 20) / 12)) ? RAMPS.water[1] : RAMPS.water[2];
}

/** Pixel-level river + bay with meandering banks (replaces the tile shapes in those areas). */
function paintOrganicWater(g) {
  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / TILE);
    if (row === 12 || row === 13 || row === 22) continue; // bridges and rail keep their tiles
    for (let x = 0; x < W; x++) {
      const riverStrip = x < 10 * TILE;
      const bayStrip = row >= 23;
      if (!riverStrip && !bayStrip) continue;
      if (isWaterAt(x, y)) {
        g.set(x, y, waterColor(x, y, shoreDistance(x, y)));
        continue;
      }
      const [l, r] = riverBanks(y);
      const nearWater = isWaterAt(x - 2, y) || isWaterAt(x + 2, y) || isWaterAt(x, y + 2) || isWaterAt(x, y - 2);
      if (bayStrip || (riverStrip && x > r)) {
        const h = hash2(x, y, 9);
        g.set(x, y, nearWater ? RAMPS.sand[2] : h < 0.05 ? RAMPS.sand[2] : RAMPS.sand[3]);
        if (h > 0.992 && !nearWater) g.set(x, y, RAMPS.cream[4]);
      } else if (riverStrip && x < l) {
        const h = hash2(x >> 1, y >> 1, 5);
        g.set(x, y, nearWater ? RAMPS.brown[2] : h < 0.14 ? RAMPS.green[1] : RAMPS.green[2]);
      }
    }
  }
}

export function renderGround() {
  const g = new PixelCanvas(W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) paintTile(g, c, r);
  paintOrganicWater(g);
  paintSidewalks(g);
  return g;
}

/** Flowing highlight frames for water (transparent except sparkles). */
export function renderWaterFrames(count = 4) {
  const frames = [];
  for (let f = 0; f < count; f++) {
    const w = new PixelCanvas(W, H);
    for (let y = 0; y < H; y++) {
      const row = Math.floor(y / TILE);
      if (row === 12 || row === 13 || row === 22) continue;
      if (y % 5 !== 0) continue;
      const lane = Math.floor(y / 5);
      const inBay = y >= 360;
      for (let x = 0; x < W; x++) {
        if (!isWaterAt(x, y) || shoreDistance(x, y) < 4) continue;
        // the river flows south (dashes drift along x slowly); the bay rolls east
        const drift = inBay ? f * 3 : f * 2;
        const phase = (x + drift + lane * 11 + Math.floor(hash2(lane, 0, 22) * 20)) % 26;
        if (phase < 3) w.set(x, y, phase === 1 ? RAMPS.water[4] : RAMPS.water[3]);
      }
    }
    frames.push(w);
  }
  return frames;
}
