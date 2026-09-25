// Pixel-friendly charts drawn with Graphics: the stability curve of a run (results, timeline,
// What-If comparisons).
import { UI, hex } from '../config/palette.js';
import { SESSION_LENGTH, FAST_PHASE, timeForClock } from '../sim/clock.js';
import { textStyle } from './theme.js';
import { panel } from './components.js';

/** Map simulated time to x inside a chart of width w. */
export const timeX = (t, w) => (Math.max(0, Math.min(SESSION_LENGTH, t)) / SESSION_LENGTH) * w;

/**
 * Stability over time.
 * @param {object} o
 * @param {{t:number, stability:number}[]} o.series
 * @param {{t:number, kind:'cascade'|'ability'|'decision'|'failure'}[]} [o.markers]
 * @param {{t:number, stability:number}[]} [o.compare] optional second curve (What-If)
 */
export function stabilityChart(scene, x, y, w, h, { series, markers = [], compare = null, labels = true, frame = 'card-inset', highlight = null }) {
  const c = scene.add.container(x, y);
  c.add(panel(scene, 0, 0, w, h, frame));
  const pad = { l: 44, r: 16, t: 14, b: labels ? 30 : 12 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const px = (t) => pad.l + timeX(t, cw);
  const py = (v) => pad.t + ch * (1 - Math.max(0, Math.min(100, v)) / 100);
  const g = scene.add.graphics();
  c.add(g);

  // bands and grid
  g.fillStyle(hex(UI.redLight), 0.14);
  g.fillRect(pad.l, py(25), cw, py(0) - py(25));
  g.lineStyle(2, hex(UI.inkSoft), 0.18);
  for (const v of [25, 50, 75, 100]) {
    g.beginPath();
    g.moveTo(pad.l, py(v));
    g.lineTo(pad.l + cw, py(v));
    g.strokePath();
  }
  // final minute
  g.fillStyle(hex(UI.orange), 0.12);
  g.fillRect(px(FAST_PHASE), pad.t, px(SESSION_LENGTH) - px(FAST_PHASE), ch);
  for (const v of [0, 50, 100]) c.add(scene.add.text(pad.l - 8, py(v), `${v}`, textStyle({ size: 14, weight: '900', color: UI.inkSoft })).setOrigin(1, 0.5));
  if (labels) {
    for (const [clock, text] of [[900, '15:00'], [600, '10:00'], [300, '05:00'], [60, '01:00'], [0, '00:00']]) {
      const tx = px(timeForClock(clock));
      c.add(scene.add.text(tx, pad.t + ch + 14, text, textStyle({ size: 14, weight: '900', color: UI.inkSoft })).setOrigin(clock === 900 ? 0 : clock === 0 ? 1 : 0.5, 0.5));
    }
  }

  const curve = (list, color, width, fillAlpha) => {
    if (list.length < 2) return;
    const pts = list.map((s) => ({ x: px(s.t), y: py(s.stability) }));
    if (fillAlpha > 0) {
      g.fillStyle(hex(color), fillAlpha);
      g.fillPoints([{ x: pts[0].x, y: py(0) }, ...pts, { x: pts[pts.length - 1].x, y: py(0) }], true);
    }
    g.lineStyle(width, hex(color), 1);
    g.strokePoints(pts, false);
  };
  if (compare) curve(compare, UI.orange, 4, 0);
  curve(series, UI.teal, 5, 0.22);

  const icons = { cascade: 'ui-cascade', ability: 'ui-star', failure: 'ui-cross' };
  for (const m of markers) {
    const mx = px(m.t);
    if (m.kind === 'decision') {
      g.fillStyle(hex(UI.violetDeep), 0.9);
      g.fillRect(mx - 2, py(0) - 10, 4, 10);
      continue;
    }
    const at = series.reduce((best, s) => (Math.abs(s.t - m.t) < Math.abs(best.t - m.t) ? s : best), series[0]);
    c.add(scene.add.image(mx, py(at.stability) - 18, 'icons', icons[m.kind] || 'ui-info').setScale(1.4));
  }
  if (highlight !== null) {
    g.lineStyle(3, hex(UI.violetDeep), 0.9);
    g.beginPath();
    g.moveTo(px(highlight), pad.t);
    g.lineTo(px(highlight), pad.t + ch);
    g.strokePath();
  }
  c.plot = { px, py, pad, cw, ch };
  return c;
}
