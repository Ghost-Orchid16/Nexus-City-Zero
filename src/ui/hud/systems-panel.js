// CITY SYSTEMS panel: one animated row per system + the emergency budget.
// Shows level, trend, warning state, cascade shields, data fog, Predictive Model forecasts and a
// live preview of what the hovered response would do.
import { PX } from '../../config/layout.js';
import { UI, hex } from '../../config/palette.js';
import { SYSTEMS, BUDGET, THRESHOLDS } from '../../data/resources.js';
import { textStyle } from '../theme.js';
import { panel, Bar } from '../components.js';
import { tag } from '../widgets.js';

const ROW_H = 74;
const STATES = [
  { below: THRESHOLDS.failure, text: 'FAILED', color: 'red' },
  { below: THRESHOLDS.critical, text: 'CRITICAL', color: 'red' },
  { below: THRESHOLDS.warning, text: 'LOW', color: 'orange' }
];

class SystemRow {
  constructor(scene, parent, res, x, y, w) {
    this.scene = scene;
    this.res = res;
    this.id = res.id;
    this.w = w;
    this.x = x;
    this.y = y;
    const c = scene.add.container(x, y);
    parent.add(c);
    this.c = c;
    this.flash = scene.add.rectangle(-6, -2, w + 12, ROW_H - 4, hex(UI.redLight), 0).setOrigin(0);
    c.add(this.flash);
    c.add(scene.add.image(24, 32, 'ui', `badge-${res.badge}`).setScale(3));
    c.add(scene.add.image(24, 31, 'icons', res.icon).setScale(2));
    this.name = scene.add.text(56, 14, res.short, textStyle({ size: 21, weight: '900' })).setOrigin(0, 0.5);
    c.add(this.name);
    this.value = scene.add.text(w, 14, '0', textStyle({ size: 28, weight: '900' })).setOrigin(1, 0.5);
    c.add(this.value);
    this.arrow = scene.add.image(0, 16, 'icons', 'ui-down').setScale(1.5).setVisible(false);
    c.add(this.arrow);
    this.shield = scene.add.image(0, 14, 'effects', 'shield').setScale(2).setVisible(false);
    c.add(this.shield);
    this.stateTag = null;
    this.stateKey = null;
    this.barW = w - 56;
    this.bar = new Bar(scene, 56, 32, { width: this.barW, height: 27, fill: res.color });
    c.add(this.bar);
    // live preview of the hovered response (+ green, − red)
    this.preview = scene.add.rectangle(56, 32 + PX * 2, 0, 27 - PX * 4, hex(UI.green), 0.55).setOrigin(0).setVisible(false);
    c.add(this.preview);
    // Predictive Model marker: where this system is heading in 60 s
    this.marker = scene.add.rectangle(0, 28, 6, 35, hex(UI.ink), 0.9).setOrigin(0.5, 0).setVisible(false);
    this.markerCap = scene.add.triangle(0, 26, 0, 0, 14, 0, 7, 9, hex(UI.ink)).setVisible(false);
    this.eta = scene.add.text(0, 14, '', textStyle({ size: 16, weight: '900', color: UI.red })).setOrigin(0, 0.5).setVisible(false);
    c.add([this.marker, this.markerCap, this.eta]);
    // data fog cover
    this.fog = scene.add.container(56, 32).setVisible(false);
    this.fog.add(panel(scene, 0, 0, this.barW, 27, 'bar-track'));
    this.fogText = scene.add.text(this.barW / 2, 13, 'DATA FOG', textStyle({ size: 16, weight: '900', color: UI.paper })).setOrigin(0.5);
    this.fog.add(this.fogText);
    c.add(this.fog);
    this.shown = -1;
    this.previewDelta = 0;
  }

  levelOf(sim) {
    return this.id === 'budget' ? sim.budget : sim.levels[this.id];
  }

  update(sim, time) {
    const level = this.levelOf(sim);
    const fogged = this.id !== 'budget' && sim.isFogged(this.id);
    const max = this.id === 'budget' ? 100 : 100;
    this.fog.setVisible(fogged);
    this.bar.setVisible(!fogged);
    if (fogged) {
      this.value.setText('??');
      this.fogText.setAlpha(0.6 + 0.4 * Math.sin(time / 180));
    } else {
      this.bar.setValue(Math.min(1, level / max));
      const shown = Math.round(level);
      if (shown !== this.shown) {
        this.shown = shown;
        this.value.setText(String(shown));
      }
    }

    // warning state
    let state = null;
    if (this.id !== 'budget' && !fogged) state = STATES.find((s) => level < s.below) || null;
    const key = state?.text ?? null;
    if (key !== this.stateKey) {
      this.stateKey = key;
      this.stateTag?.destroy();
      this.stateTag = null;
      if (state) {
        this.stateTag = tag(this.scene, 0, 14, state.text, { color: state.color, size: 14, height: 26, pad: 8 });
        this.c.add(this.stateTag);
      }
      this.bar.setFillFrame(level < THRESHOLDS.critical ? 'red' : this.res.color);
    }
    let nx = 56 + this.name.width + 8;
    if (this.stateTag) {
      this.stateTag.x = nx;
      nx += this.stateTag.width + 6;
      if (level < THRESHOLDS.critical) this.flash.setAlpha(0.12 + 0.1 * Math.sin(time / 140));
      else this.flash.setAlpha(0);
    } else {
      this.flash.setAlpha(0);
    }

    // cascade / decay shields
    const shielded = this.id !== 'budget' && (sim.shielded('cascade', this.id) || sim.shielded('decay', this.id));
    this.shield.setVisible(shielded);
    if (shielded) {
      this.shield.x = nx + 12;
      nx += 30;
    }

    // trend arrow next to the value
    const trend = this.id === 'budget' ? 0 : sim.trendOf(this.id);
    const showArrow = !fogged && Math.abs(trend) > 0.08;
    this.arrow.setVisible(showArrow);
    if (showArrow) {
      this.arrow.setFrame(trend < 0 ? 'ui-down' : 'ui-up');
      this.arrow.x = this.w - this.value.width - 18;
    }
    this.nameEnd = nx;
  }

  /** Forecast from the Predictive Model / AI Architect perk. */
  setForecast(projected, crossingIn) {
    if (projected === null || projected === undefined) {
      this.marker.setVisible(false);
      this.markerCap.setVisible(false);
      this.eta.setVisible(false);
      return;
    }
    const x = 56 + PX * 2 + (this.barW - PX * 4) * Math.max(0, Math.min(1, projected / 100));
    this.marker.setPosition(x, 28).setVisible(true);
    this.markerCap.setPosition(x - 7, 22).setVisible(true);
    if (crossingIn !== null && crossingIn !== undefined) {
      this.eta.setText(`CRITICAL ~${Math.max(5, Math.round(crossingIn / 5) * 5)} s`).setVisible(true);
      this.eta.x = Math.min(this.nameEnd ?? 150, this.w - this.value.width - 150);
    } else {
      this.eta.setVisible(false);
    }
  }

  setPreview(delta, level) {
    if (!delta) {
      this.preview.setVisible(false);
      return;
    }
    const inner = this.barW - PX * 4;
    const from = Math.max(0, Math.min(100, level));
    const to = Math.max(0, Math.min(100, level + delta));
    const x0 = 56 + PX * 2 + (inner * Math.min(from, to)) / 100;
    this.preview.setPosition(x0, 32 + PX * 2);
    this.preview.width = Math.max(4, (inner * Math.abs(to - from)) / 100);
    this.preview.setFillStyle(hex(delta > 0 ? UI.green : UI.redLight), 0.7);
    this.preview.setVisible(true);
  }
}

export class SystemsPanel {
  constructor(scene, sim, { x = 16, y = 116, width = 376 } = {}) {
    this.scene = scene;
    this.sim = sim;
    const rows = [...SYSTEMS, BUDGET];
    const height = 52 + rows.length * ROW_H + 6;
    this.container = scene.add.container(x, y);
    this.container.add(panel(scene, 0, 0, width, height, 'card'));
    this.container.add(scene.add.text(20, 26, 'CITY SYSTEMS', textStyle({ size: 24, font: 'display', color: UI.violetDeep })).setOrigin(0, 0.5));
    this.hint = scene.add.text(width - 18, 26, '', textStyle({ size: 15, weight: '900', color: UI.teal })).setOrigin(1, 0.5);
    this.container.add(this.hint);
    this.rows = rows.map((r, i) => new SystemRow(scene, this.container, r, 18, 52 + i * ROW_H, width - 36));
    this.byId = Object.fromEntries(this.rows.map((r) => [r.id, r]));
    this.width = width;
    this.height = height;
    this.projectTimer = 0;
  }

  bounds() {
    return { x: this.container.x, y: this.container.y, w: this.width, h: this.height };
  }

  update(dt, time) {
    const sim = this.sim;
    for (const r of this.rows) r.update(sim, time);
    // forecasts refresh twice a second (projection is cheap but not free)
    this.projectTimer -= dt;
    if (this.projectTimer <= 0) {
      this.projectTimer = 0.5;
      const foresight = sim.hasForesight();
      this.hint.setText(foresight ? (sim.perk('seeForecast') ? 'TRENDS: 60 s AHEAD' : 'PREDICTIVE MODEL ON') : '');
      if (foresight) {
        const p = sim.project(60, 2);
        for (const r of this.rows) {
          if (r.id === 'budget' || sim.isFogged(r.id)) {
            r.setForecast(null);
            continue;
          }
          const hit = p.crossings.find((c) => c.system === r.id);
          r.setForecast(p.levels[r.id], hit ? hit.in : null);
        }
      } else {
        for (const r of this.rows) r.setForecast(null);
      }
    }
  }

  /** Show what a response would change (null clears). */
  preview(choice) {
    for (const r of this.rows) {
      if (!choice) {
        r.setPreview(0, 0);
        continue;
      }
      let delta = choice.effects[r.id] || 0;
      if (r.id === 'budget') delta = (choice.effects.budget || 0) - (choice.underfunded ? this.sim.budget : choice.cost);
      r.setPreview(delta, r.levelOf(this.sim));
    }
  }

  /** Point at a row (used by feedback effects): world position of the row's value. */
  rowAnchor(id) {
    const r = this.byId[id];
    if (!r) return null;
    return { x: this.container.x + r.x + r.w - 60, y: this.container.y + r.y + 30 };
  }
}
