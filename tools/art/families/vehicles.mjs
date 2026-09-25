// Vehicles in the three 3/4 top-down facings: side (east; flipX for west), front (south),
// back (north). One parametric builder keeps proportions, outline and lighting consistent.
import { PixelCanvas, RAMPS, INK } from '../lib/draw.mjs';

const GLASS = RAMPS.glass;
const TIRE = RAMPS.plum[0];

export const VEHICLE_TYPES = {
  car: { len: 16, body: RAMPS.coral, cabin: [4, 12], cabinH: 4, bodyH: 4 },
  taxi: { len: 16, body: RAMPS.yellow, cabin: [4, 12], cabinH: 4, bodyH: 4, roofSign: RAMPS.orange },
  bus: { len: 30, body: RAMPS.orange, cabin: [1, 29], cabinH: 5, bodyH: 5, busWindows: true, stripe: RAMPS.cream },
  truck: { len: 24, body: RAMPS.green, cabin: [17, 23], cabinH: 5, bodyH: 4, cargo: RAMPS.cream },
  ambulance: { len: 20, body: RAMPS.cream, cabin: [13, 19], cabinH: 5, bodyH: 4, cargo: RAMPS.cream, stripe: RAMPS.red, lights: 'red', cross: true },
  fire: { len: 24, body: RAMPS.red, cabin: [17, 23], cabinH: 5, bodyH: 5, cargo: RAMPS.red, ladder: true, lights: 'red' },
  police: { len: 17, body: RAMPS.violet, cabin: [4, 12], cabinH: 4, bodyH: 4, lights: 'blue', stripe: RAMPS.cream },
  repair: { len: 19, body: RAMPS.yellow, cabin: [12, 18], cabinH: 5, bodyH: 4, cargo: RAMPS.orange, lights: 'amber', hazard: true }
};

export const CAR_COLORS = {
  coral: RAMPS.coral, sky: RAMPS.blue, teal: RAMPS.teal, violet: RAMPS.violet,
  lime: RAMPS.lime, cream: RAMPS.cream, magenta: RAMPS.magenta, orange: RAMPS.orange
};

function lightColors(kind, frame) {
  if (kind === 'red') return frame ? [RAMPS.red[4], RAMPS.cream[4]] : [RAMPS.cream[4], RAMPS.red[4]];
  if (kind === 'blue') return frame ? [RAMPS.blue[4], RAMPS.red[3]] : [RAMPS.red[3], RAMPS.blue[4]];
  return frame ? [RAMPS.yellow[4], RAMPS.orange[3]] : [RAMPS.orange[3], RAMPS.yellow[4]];
}

/** Side view facing east. */
export function vehicleSide(type, color = null, frame = 0) {
  const t = { ...VEHICLE_TYPES[type] };
  const body = color || t.body;
  const L = t.len;
  const H = t.cabinH + t.bodyH + 3;
  const c = new PixelCanvas(L + 2, H + 2);
  const ox = 1;
  const oy = 1;
  const bodyY = oy + t.cabinH;
  // lower body
  c.fillRect(ox, bodyY, L, t.bodyH, body[2]);
  c.hline(ox, ox + L - 1, bodyY, body[3]);
  c.hline(ox, ox + L - 1, bodyY + t.bodyH - 1, body[1]);
  // cargo box or cabin
  if (t.cargo) {
    const [c0, c1] = t.cabin;
    const boxEnd = c0 - 1;
    c.fillRect(ox, oy, boxEnd, t.cabinH + 1, t.cargo[3]);
    c.hline(ox, ox + boxEnd - 1, oy, t.cargo[4]);
    c.vline(ox + boxEnd - 1, oy, oy + t.cabinH, t.cargo[1]);
    // cab
    c.fillRect(ox + c0, oy + 1, c1 - c0, t.cabinH, body[2]);
    c.hline(ox + c0, ox + c1 - 1, oy + 1, body[3]);
    c.fillRect(ox + c0 + 2, oy + 2, c1 - c0 - 3, t.cabinH - 2, GLASS[2]);
    c.set(ox + c0 + 2, oy + 2, GLASS[4]);
  } else if (t.busWindows) {
    c.fillRect(ox, oy, L, t.cabinH, body[2]);
    c.hline(ox, ox + L - 1, oy, body[4]);
    for (let x = ox + 2; x < ox + L - 3; x += 4) {
      c.fillRect(x, oy + 1, 3, t.cabinH - 2, GLASS[2]);
      c.set(x, oy + 1, GLASS[4]);
    }
    c.fillRect(ox + L - 3, oy + 1, 2, t.cabinH, GLASS[1]);
  } else {
    const [c0, c1] = t.cabin;
    c.fillPoly([[ox + c0 + 1, oy], [ox + c1 - 1, oy], [ox + c1 + 1, bodyY + 0.5], [ox + c0 - 1, bodyY + 0.5]], body[2]);
    c.hline(ox + c0 + 1, ox + c1 - 2, oy, body[4]);
    // windows split by a pillar
    const mid = Math.floor((c0 + c1) / 2);
    c.fillPoly([[ox + c0 + 1, oy + 1], [ox + mid - 1, oy + 1], [ox + mid - 1, bodyY - 0.5], [ox + c0 - 0.2, bodyY - 0.5]], GLASS[2]);
    c.fillPoly([[ox + mid + 1, oy + 1], [ox + c1 - 2, oy + 1], [ox + c1, bodyY - 0.5], [ox + mid + 1, bodyY - 0.5]], GLASS[2]);
    c.set(ox + c0 + 1, oy + 1, GLASS[4]);
    c.set(ox + mid + 1, oy + 1, GLASS[4]);
  }
  if (t.stripe) c.hline(ox + 1, ox + L - 2, bodyY + 1, t.stripe[t.stripe === RAMPS.cream ? 4 : 2]);
  if (t.hazard) for (let x = ox + 1; x < ox + L - 1; x++) if ((x >> 1) % 2) c.set(x, bodyY + 1, RAMPS.plum[1]);
  if (t.cross) {
    const cx = ox + 6;
    c.vline(cx, oy + 1, oy + 3, RAMPS.red[2]);
    c.hline(cx - 1, cx + 1, oy + 2, RAMPS.red[2]);
  }
  if (t.ladder) {
    c.hline(ox + 1, ox + 15, oy - 0, RAMPS.stone[4]);
    for (let x = ox + 2; x < ox + 15; x += 3) c.set(x, oy + 1, RAMPS.stone[3]);
  }
  if (t.roofSign) {
    c.fillRect(ox + 6, oy - 1, 4, 1, t.roofSign[3]);
  }
  if (t.lights) {
    const [a, b] = lightColors(t.lights, frame);
    const lx = t.cargo ? ox + t.cabin[0] + 1 : ox + t.cabin[0] + 2;
    c.set(lx, oy, a);
    c.set(lx + 1, oy, a);
    c.set(lx + 2, oy, b);
    c.set(lx + 3, oy, b);
  }
  // lamps
  c.set(ox + L - 1, bodyY + 1, RAMPS.yellow[4]);
  c.set(ox, bodyY + 1, RAMPS.red[3]);
  // wheels
  const wy = bodyY + t.bodyH - 2;
  for (const wx of [ox + 2, ox + L - 6]) {
    c.fillOval(wx, wy, 4, 4, TIRE);
    c.set(wx + 1, wy + 1, RAMPS.stone[3]);
  }
  c.outline(INK);
  return c;
}

/** Front (south-facing) or back (north-facing) view. */
export function vehicleEnd(type, facing = 'front', color = null, frame = 0) {
  const t = VEHICLE_TYPES[type];
  const body = color || t.body;
  const big = ['bus', 'truck', 'fire'].includes(type);
  const W = big ? 13 : 11;
  const roofLen = big ? 12 : type === 'car' || type === 'taxi' || type === 'police' ? 5 : 8;
  const H = roofLen + 8;
  const c = new PixelCanvas(W + 2, H + 2);
  const ox = 1;
  const oy = 1;
  const roofColor = t.cargo && facing === 'back' ? t.cargo : body;
  // roof seen from above (length foreshortened)
  c.fillRect(ox + 1, oy, W - 2, roofLen, roofColor[3]);
  c.vline(ox + 1, oy, oy + roofLen - 1, roofColor[4]);
  c.vline(ox + W - 2, oy, oy + roofLen - 1, roofColor[2]);
  if (t.ladder) for (let y = oy + 1; y < oy + roofLen - 1; y += 2) c.hline(ox + 3, ox + W - 4, y, RAMPS.stone[4]);
  if (t.roofSign) c.fillRect(ox + 4, oy + 1, 3, 2, t.roofSign[3]);
  if (t.cross) {
    const cx = ox + Math.floor(W / 2);
    c.vline(cx, oy + 1, oy + 3, RAMPS.red[2]);
    c.hline(cx - 1, cx + 1, oy + 2, RAMPS.red[2]);
  }
  // windshield / rear window
  const gy = oy + roofLen;
  c.fillRect(ox + 1, gy, W - 2, 3, facing === 'front' ? GLASS[2] : GLASS[1]);
  c.set(ox + 2, gy, GLASS[4]);
  // face
  const fy = gy + 3;
  c.fillRect(ox, fy, W, 4, body[2]);
  c.hline(ox, ox + W - 1, fy, body[3]);
  c.hline(ox, ox + W - 1, fy + 3, body[1]);
  if (facing === 'front') {
    c.set(ox + 1, fy + 1, RAMPS.yellow[4]);
    c.set(ox + W - 2, fy + 1, RAMPS.yellow[4]);
    c.hline(ox + 3, ox + W - 4, fy + 2, RAMPS.plum[1]);
  } else {
    c.set(ox + 1, fy + 1, RAMPS.red[3]);
    c.set(ox + W - 2, fy + 1, RAMPS.red[3]);
  }
  if (t.lights) {
    const [a, b] = lightColors(t.lights, frame);
    const mx = ox + Math.floor(W / 2);
    c.set(mx - 2, gy - 1, a);
    c.set(mx - 1, gy - 1, a);
    c.set(mx, gy - 1, b);
    c.set(mx + 1, gy - 1, b);
  }
  // tires peeking out
  c.fillRect(ox, fy + 3, 2, 2, TIRE);
  c.fillRect(ox + W - 2, fy + 3, 2, 2, TIRE);
  c.outline(INK);
  return c;
}
