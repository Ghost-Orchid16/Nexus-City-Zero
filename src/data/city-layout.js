/**
 * NEXUS city layout — shared by the art forge (ground rendering) and the game (placement,
 * traffic, camera focus). World units are native pixels; 1 tile = 16 px; 45×25 tiles.
 *
 * Ground codes: f forest floor, g grass, G park lawn, m farmland, ~ water, s sand,
 * r road, b bridge deck, p plaza paving, c concrete yard, d dirt/gravel, t rail track, P parking.
 */
import { TILE, WORLD_COLS as COLS, WORLD_ROWS as ROWS } from '../config/layout.js';

export { TILE, COLS, ROWS };

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('g'));
const fill = (c0, r0, c1, r1, ch) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (r >= 0 && c >= 0 && r < ROWS && c < COLS) grid[r][c] = ch;
};

// ----- nature -----
fill(0, 0, COLS - 1, 2, 'f'); // forest belt along the north edge
fill(0, 0, 1, ROWS - 1, 'f'); // far river bank
fill(43, 3, 44, 21, 'm'); // eastern farmland under the wind farm
fill(2, 0, 8, ROWS - 1, '~'); // the river
fill(9, 0, 9, ROWS - 1, 's'); // east bank beach
fill(0, 23, 30, ROWS - 1, '~'); // the bay
fill(31, 23, 44, 23, 's');
fill(31, 24, 44, 24, '~');

// ----- district blocks (ground treatment) -----
export const BLOCKS = {
  water: [11, 4, 17, 11],
  residential: [19, 4, 26, 11],
  downtown: [28, 4, 34, 11],
  medical: [36, 4, 41, 11],
  energy: [11, 14, 17, 20],
  command: [19, 14, 26, 20],
  transport: [28, 14, 34, 20],
  industrial: [36, 14, 41, 20]
};
fill(...BLOCKS.water, 'c');
fill(...BLOCKS.residential, 'g');
fill(...BLOCKS.downtown, 'p');
fill(...BLOCKS.medical, 'p');
fill(38, 9, 41, 11, 'G'); // hospital lawn
fill(...BLOCKS.energy, 'd');
fill(11, 18, 13, 20, 'c');
fill(...BLOCKS.command, 'p');
fill(23, 14, 26, 20, 'G'); // central park
fill(...BLOCKS.transport, 'p');
fill(31, 14, 34, 16, 'P'); // parking lot
fill(...BLOCKS.industrial, 'd');
fill(36, 17, 38, 20, 'c');

// ----- roads -----
fill(10, 3, 10, 21, 'r'); // River Road
fill(18, 3, 18, 21, 'r');
fill(27, 3, 27, 21, 'r');
fill(35, 3, 35, 21, 'r');
fill(42, 3, 42, 21, 'r');
fill(10, 3, 42, 3, 'r'); // north street
fill(0, 12, COLS - 1, 13, 'r'); // Nexus Boulevard (leaves the map on both sides)
fill(10, 21, 42, 21, 'r'); // south street
fill(2, 12, 8, 13, 'b'); // boulevard bridge
// ----- rail -----
fill(0, 22, COLS - 1, 22, 't');

export const GROUND = grid.map((row) => row.join(''));

/** Organic river banks (pixel x of the west and east bank at world row y). */
export function riverBanks(y) {
  const left = 30 + 5 * Math.sin(y / 41) + 2 * Math.sin(y / 13 + 2);
  const right = 138 + 6 * Math.sin(y / 33 + 1) + 2.5 * Math.sin(y / 11);
  return [left, right];
}

/** Bay shoreline: water lies below this y at column x. */
export function bayShore(x) {
  return 370 + 3 * Math.sin(x / 21) + 1.5 * Math.sin(x / 7 + 1) + (x > 470 ? Math.min(12, (x - 470) / 8) : 0);
}

/** Pixel-precise water test used by rendering and by boats. */
export function isWaterAt(x, y) {
  const [l, r] = riverBanks(y);
  return (x >= l && x <= r) || y >= bayShore(x);
}

export function groundAt(col, row) {
  if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return null;
  return GROUND[row][col];
}

/** District metadata: bounds in tiles, identity color, linked systems, map label anchor. */
export const DISTRICTS = [
  { id: 'water', name: 'Water Facility', systems: ['water'], color: '#48b3ea' },
  { id: 'residential', name: 'Residential District', systems: ['safety', 'supplies'], color: '#ff8f8a' },
  { id: 'downtown', name: 'Downtown', systems: ['communication', 'budget'], color: '#9c7df0' },
  { id: 'medical', name: 'Medical District', systems: ['health'], color: '#ff5a5f' },
  { id: 'energy', name: 'Energy Station', systems: ['energy'], color: '#ffe159' },
  { id: 'command', name: 'Emergency Command Center', systems: ['communication', 'safety'], color: '#3cc29f' },
  { id: 'transport', name: 'Transport Hub', systems: ['transport', 'supplies'], color: '#ff9f45' },
  { id: 'industrial', name: 'Industrial District', systems: ['infrastructure', 'supplies'], color: '#b97e52' }
].map((d) => {
  const [c0, r0, c1, r1] = BLOCKS[d.id];
  return {
    ...d,
    tiles: [c0, r0, c1, r1],
    rect: { x: c0 * TILE, y: r0 * TILE, w: (c1 - c0 + 1) * TILE, h: (r1 - r0 + 1) * TILE },
    center: { x: ((c0 + c1 + 1) / 2) * TILE, y: ((r0 + r1 + 1) / 2) * TILE }
  };
});

export const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));

/**
 * Structures: sprite key in the buildings atlas + bottom-center baseline (world px).
 * `lights` marks buildings that have a night-window layer; `role` tags drive visual reactions.
 */
export const STRUCTURES = [
  // Water Facility
  { key: 'water-tower', district: 'water', x: 196, y: 120, role: 'water' },
  { key: 'pump-house', district: 'water', x: 252, y: 116, lights: true, role: 'water' },
  { key: 'clarifier', district: 'water', x: 204, y: 160, anim: 'clarifier', role: 'water' },
  { key: 'clarifier', district: 'water', x: 256, y: 160, anim: 'clarifier', role: 'water' },
  { key: 'reservoir', district: 'water', x: 232, y: 188, anim: 'reservoir', role: 'water' },
  // Residential
  { key: 'house-a', district: 'residential', x: 322, y: 104, lights: true },
  { key: 'house-b', district: 'residential', x: 362, y: 104, lights: true },
  { key: 'house-c', district: 'residential', x: 406, y: 104, lights: true },
  { key: 'apartments-a', district: 'residential', x: 336, y: 150, lights: true },
  { key: 'house-d', district: 'residential', x: 386, y: 146, lights: true },
  { key: 'house-e', district: 'residential', x: 420, y: 146, lights: true },
  { key: 'house-f', district: 'residential', x: 322, y: 188, lights: true },
  { key: 'apartments-b', district: 'residential', x: 364, y: 188, lights: true },
  // Downtown
  { key: 'office-violet', district: 'downtown', x: 470, y: 120, lights: true },
  { key: 'office-teal', district: 'downtown', x: 536, y: 116, lights: true },
  { key: 'nexus-tower', district: 'downtown', x: 498, y: 178, lights: true, role: 'landmark' },
  { key: 'shops', district: 'downtown', x: 542, y: 188, lights: true },
  // Medical District
  { key: 'hospital', district: 'medical', x: 616, y: 138, lights: true, role: 'health' },
  { key: 'clinic', district: 'medical', x: 598, y: 188, lights: true, role: 'health' },
  { key: 'pharmacy', district: 'medical', x: 650, y: 188, lights: true, role: 'health' },
  // Energy Station
  { key: 'power-plant', district: 'energy', x: 206, y: 276, lights: true, role: 'energy' },
  { key: 'reactor', district: 'energy', x: 262, y: 280, role: 'reactor' },
  { key: 'battery-bank', district: 'energy', x: 256, y: 330, lights: true, role: 'energy' },
  // Emergency Command Center
  { key: 'command-center', district: 'command', x: 336, y: 300, lights: true, role: 'command' },
  // Transport Hub
  { key: 'bus-terminal', district: 'transport', x: 478, y: 262, role: 'transport' },
  { key: 'train-station', district: 'transport', x: 500, y: 332, lights: true, role: 'transport' },
  // Industrial
  { key: 'factory', district: 'industrial', x: 606, y: 272, lights: true, role: 'industry' },
  { key: 'smokestack', district: 'industrial', x: 660, y: 268, role: 'industry' },
  { key: 'warehouse', district: 'industrial', x: 630, y: 330, lights: true, role: 'industry' },
  { key: 'containers', district: 'industrial', x: 590, y: 330, role: 'industry' }
];

/** Where hazards appear in each district (world px), first entry = primary hotspot. */
export const HOTSPOTS = {
  water: [[252, 100], [204, 150], [232, 178]],
  residential: [[336, 122], [362, 92], [322, 176]],
  downtown: [[498, 118], [536, 92], [542, 176]],
  medical: [[616, 106], [598, 176], [650, 178]],
  energy: [[206, 252], [262, 246], [214, 300]],
  command: [[336, 272], [318, 250], [372, 262]],
  transport: [[500, 312], [478, 248], [524, 244]],
  industrial: [[606, 252], [660, 226], [630, 312]]
};

/** Road spots near each district for cracks, barriers and repair crews. */
export const ROAD_SPOTS = {
  water: [184, 200], residential: [312, 204], downtown: [456, 212], medical: [596, 204],
  energy: [168, 290], command: [300, 232], transport: [440, 300], industrial: [572, 280]
};

/** Hand-placed props (atlas frame key + baseline). Trees are scattered procedurally below. */
export const PROPS = [
  { key: 'fountain', x: 404, y: 282, anim: 'fountain' },
  { key: 'pond', x: 404, y: 318 },
  { key: 'radar', x: 314, y: 254, anim: 'radar', role: 'command' },
  { key: 'mast', x: 372, y: 282, role: 'command' },
  { key: 'helipad-pad', x: 364, y: 326 },
  { key: 'solar-array', x: 196, y: 330, role: 'energy' },
  { key: 'solar-array', x: 196, y: 312, role: 'energy' },
  { key: 'pylon', x: 232, y: 312, role: 'energy' },
  { key: 'transformer', x: 214, y: 300, role: 'energy' },
  { key: 'plaza-fountain', x: 466, y: 186, anim: 'fountain' },
  { key: 'wind-turbine', x: 704, y: 118, anim: 'turbine', role: 'energy' },
  { key: 'wind-turbine', x: 704, y: 196, anim: 'turbine', role: 'energy' },
  { key: 'wind-turbine', x: 704, y: 274, anim: 'turbine', role: 'energy' },
  { key: 'crane', x: 668, y: 322, role: 'industry' },
  { key: 'playground', x: 410, y: 184 },
  { key: 'bus-stop', x: 452, y: 236 },
  { key: 'boat', x: 72, y: 150, anim: 'boat' },
  { key: 'boat', x: 110, y: 380, anim: 'boat' }
];

/** Streetlamp positions: staggered along the boulevard sidewalks and mid-block on avenues. */
export const LAMPS = [];
for (let x = 200; x <= 660; x += 96) {
  LAMPS.push({ x, y: 12 * TILE - 2 });
  LAMPS.push({ x: x + 48, y: 14 * TILE + 3 });
}
for (const y of [100, 300]) {
  LAMPS.push({ x: 18 * TILE - 2, y });
  LAMPS.push({ x: 35 * TILE - 2, y });
}

/** Deterministic tree scatter over forest/park/farm tiles, avoiding structures and props. */
function scatterTrees() {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const occupied = [...STRUCTURES, ...PROPS];
  const trees = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const g = GROUND[r][c];
      const density = g === 'f' ? 0.85 : g === 'G' ? 0.28 : g === 'm' ? 0.08 : g === 'g' && r > 3 ? 0.06 : 0;
      if (rand() >= density) continue;
      const x = c * TILE + 3 + Math.floor(rand() * 10);
      const y = r * TILE + 8 + Math.floor(rand() * 8);
      if (occupied.some((o) => Math.abs(o.x - x) < 26 && y < o.y + 6 && y > o.y - 40)) continue;
      if (trees.some((t) => Math.abs(t.x - x) < 9 && Math.abs(t.y - y) < 7)) continue;
      const kinds = g === 'f' ? ['pine', 'oak', 'oak', 'teal'] : g === 'G' ? ['oak', 'blossom', 'lime', 'bush'] : ['oak', 'autumn', 'bush'];
      trees.push({ key: `tree-${kinds[Math.floor(rand() * kinds.length)]}`, x, y });
    }
  }
  return trees;
}
export const TREES = scatterTrees();

// ----- traffic network: lanes are derived from road tiles -----
/** Road centerlines as segments between intersections (tile coordinates). */
export const ROADS = {
  vertical: [10, 18, 27, 35, 42].map((c) => ({ col: c, from: 3, to: 21 })),
  horizontal: [
    { row: 3, from: 10, to: 42, width: 1 },
    { row: 12, from: 0, to: COLS - 1, width: 2 },
    { row: 21, from: 10, to: 42, width: 1 }
  ]
};
