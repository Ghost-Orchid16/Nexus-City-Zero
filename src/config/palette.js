/**
 * NEXUS master palette — shared by the art forge (tools/art) and the game.
 *
 * Every ramp runs darkest → lightest (index 0..4) and is hue-shifted: shadows lean toward
 * violet/blue, highlights toward warm yellow. Outlines use plum "ink", never pure black, which
 * keeps the city warm and charming instead of harsh. Red is reserved for emergencies.
 */
export const RAMPS = {
  ink: ['#1c1330', '#261a3a', '#3d2e57', '#5a4677', '#7f6a9c'],
  plum: ['#261a3a', '#3d2e57', '#5a4677', '#7f6a9c', '#a996c2'],
  stone: ['#4a3f55', '#6d6177', '#958aa0', '#bdb3c4', '#e4dde6'],
  cream: ['#8f6f5a', '#c09a78', '#e3c29a', '#f5dfb8', '#fff5e0'],
  brown: ['#3f2630', '#673a37', '#8f5840', '#b97e52', '#dba878'],
  sand: ['#8a6a44', '#b8905c', '#d9b57a', '#efd5a0', '#fff0cc'],
  orange: ['#6e2a24', '#b04a2a', '#e8752e', '#ff9f45', '#ffcf7a'],
  yellow: ['#7a4a1c', '#c78a20', '#f2bd2b', '#ffe159', '#fff6ad'],
  coral: ['#6b2238', '#b33d4e', '#e8606a', '#ff8f8a', '#ffc2b3'],
  red: ['#5c1224', '#9e1c33', '#e0293e', '#ff5a5f', '#ffa3a0'],
  magenta: ['#4d1446', '#8a2270', '#c73a99', '#f06cc0', '#ffb3e3'],
  violet: ['#2b1d5c', '#4a2f94', '#7050cc', '#9c7df0', '#cdb8ff'],
  blue: ['#1c2f6b', '#2a4fa8', '#3f7fe0', '#6fb0ff', '#b5dcff'],
  cyan: ['#0c4a66', '#127a99', '#1fb0c7', '#4fdde6', '#b0f7f5'],
  teal: ['#0c3b40', '#146360', '#1f8f7e', '#3cc29f', '#9af0cf'],
  green: ['#12352e', '#1d5c3a', '#2f8c42', '#5cbf4a', '#a8e36b'],
  lime: ['#3b5c1c', '#5f8f24', '#8fc234', '#c3e65a', '#ecff9e'],
  water: ['#123a78', '#1a5cad', '#2386d6', '#48b3ea', '#9be3fb'],
  asphalt: ['#2a2a40', '#3a3b55', '#4c4e6a', '#62657f', '#7d8098'],
  glass: ['#1a3a66', '#2a5f99', '#4a8fcc', '#86c4f0', '#d4f0ff'],
  glow: ['#8a5a1a', '#d99a2b', '#ffc94d', '#ffe98a', '#fffbe0'],
  skin1: ['#5a2e2a', '#8a4a3a', '#b8704f', '#d99a6c', '#f0c49a'],
  skin2: ['#3a1f24', '#5c3228', '#7f4a33', '#a86a45', '#cf9265'],
  skin3: ['#6b3a33', '#a8634f', '#d9906e', '#f2b894', '#ffdcc2'],
  skin4: ['#2a1618', '#44251f', '#633826', '#86502f', '#ab7045']
};

export const INK = RAMPS.ink[1];
export const INK_SOFT = RAMPS.ink[2];

/** UI colors (hex strings) — the interface stays bright; dark tones are for contrast only. */
export const UI = {
  ink: '#261a3a',
  inkSoft: '#3d2e57',
  paper: '#fff5e0',
  paperShade: '#f5dfb8',
  paperDeep: '#e3c29a',
  hud: '#2b2350',
  hudLight: '#3f3570',
  sky: '#6fb0ff',
  teal: '#1f8f7e',
  tealLight: '#3cc29f',
  orange: '#ff9f45',
  orangeDeep: '#e8752e',
  yellow: '#ffe159',
  coral: '#ff8f8a',
  violet: '#9c7df0',
  violetDeep: '#4a2f94',
  magenta: '#f06cc0',
  green: '#5cbf4a',
  red: '#e0293e',
  redLight: '#ff5a5f',
  white: '#ffffff',
  good: '#3cc29f',
  warn: '#ffb03b',
  bad: '#ff5a5f'
};

/** Convert '#rrggbb' to 0xRRGGBB for Phaser APIs. */
export function hex(color) {
  return parseInt(color.slice(1), 16);
}

/** Convert '#rrggbb' to [r, g, b] (0–255). */
export function rgb(color) {
  const n = hex(color);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
