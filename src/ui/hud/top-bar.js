// Top bar: who is in command and which crisis, the 15:00 countdown, and city stability with the
// adaptive engine's current crisis level.
import { GAME_WIDTH } from '../../config/layout.js';
import { UI, hex } from '../../config/palette.js';
import { CHARACTER_BY_ID } from '../../data/characters.js';
import { SCENARIO_BY_ID, CHAOS_TWISTS } from '../../data/scenarios.js';
import { formatClock, CLOCK } from '../../sim/clock.js';
import { INTENSITY } from '../../sim/adaptive-director.js';
import { textStyle } from '../theme.js';
import { panel, Bar } from '../components.js';

export class RoleCard {
  constructor(scene, sim, { x = 16, y = 12, w = 376, h = 92 } = {}) {
    const c = scene.add.container(x, y);
    this.container = c;
    const role = CHARACTER_BY_ID[sim.config.character];
    c.add(panel(scene, 0, 0, w, h, 'card'));
    c.add(scene.add.image(48, h / 2, 'ui', `badge-${role.color}`).setScale(4.6));
    c.add(scene.add.image(48, h / 2 + 2, 'portraits', role.portrait).setScale(1.4));
    c.add(scene.add.text(96, 28, role.name.toUpperCase(), textStyle({ size: 22, weight: '900' })).setOrigin(0, 0.5));
    const cfg = sim.config;
    const scenario = SCENARIO_BY_ID[cfg.scenario];
    const names = cfg.chaos ? cfg.scenarioIds.map((id) => SCENARIO_BY_ID[id].name.replace(/ (Crisis|Emergency|Collapse|Overload|Accident|Failure)$/i, '')) : [scenario.name];
    c.add(scene.add.image(112, 64, 'icons', scenario.icon).setScale(1.2));
    const label = cfg.chaos ? `CHAOS: ${names.join(' + ')}` : scenario.name;
    c.add(scene.add.text(134, 64, label.toUpperCase(), textStyle({ size: 16, weight: '900', color: UI.inkSoft, wrap: w - 140 })).setOrigin(0, 0.5));
    if (cfg.twist) {
      const twist = CHAOS_TWISTS.find((t) => t.id === cfg.twist);
      this.twist = twist;
    }
  }
}

export class ClockCard {
  constructor(scene, sim, { cx = GAME_WIDTH / 2, y = 12, w = 400, h = 96 } = {}) {
    this.scene = scene;
    this.sim = sim;
    const c = scene.add.container(cx - w / 2, y);
    this.container = c;
    this.w = w;
    this.h = h;
    this.bg = panel(scene, 0, 0, w, h, 'card');
    this.redBg = panel(scene, 0, 0, w, h, 'band-red').setVisible(false);
    c.add([this.bg, this.redBg]);
    this.icon = scene.add.image(46, h / 2, 'icons', 'ui-clock').setScale(3);
    c.add(this.icon);
    this.label = scene.add.text(w / 2 + 30, 20, 'UNTIL CITY COLLAPSE', textStyle({ size: 15, weight: '900', color: UI.inkSoft })).setOrigin(0.5);
    this.time = scene.add.text(w / 2 + 30, 58, '15:00', textStyle({ size: 54, weight: '900', color: UI.ink })).setOrigin(0.5);
    c.add([this.label, this.time]);
    this.final = false;
    this.shown = '';
  }

  update(time) {
    const remaining = this.sim.clock();
    const text = formatClock(remaining);
    if (text !== this.shown) {
      this.shown = text;
      this.time.setText(text);
    }
    const final = remaining <= CLOCK.finalWindow && !this.sim.ended;
    if (final !== this.final) {
      this.final = final;
      this.bg.setVisible(!final);
      this.redBg.setVisible(final);
      this.time.setColor(final ? UI.white : UI.ink).setStroke(UI.ink, final ? 8 : 0);
      this.label.setColor(final ? UI.white : UI.inkSoft).setText(final ? 'CRITICAL WINDOW' : 'UNTIL CITY COLLAPSE');
    }
    if (final) this.time.setScale(1 + 0.04 * Math.max(0, Math.sin(time / 160)));
  }
}

const CRISIS_LEVELS = 5;

export class StabilityCard {
  constructor(scene, sim, { x = GAME_WIDTH - 16 - 420, y = 12, w = 420, h = 92 } = {}) {
    this.scene = scene;
    this.sim = sim;
    const c = scene.add.container(x, y);
    this.container = c;
    c.add(panel(scene, 0, 0, w, h, 'card'));
    c.add(scene.add.text(18, 22, 'CITY STABILITY', textStyle({ size: 15, weight: '900', color: UI.inkSoft })).setOrigin(0, 0.5));
    this.value = scene.add.text(18, 60, '0%', textStyle({ size: 42, weight: '900' })).setOrigin(0, 0.5);
    c.add(this.value);
    this.arrow = scene.add.image(160, 60, 'icons', 'ui-up').setScale(1.5).setVisible(false);
    c.add(this.arrow);
    this.bar = new Bar(scene, 188, 44, { width: 214, height: 27, fill: 'good' });
    c.add(this.bar);
    c.add(scene.add.text(188, 22, 'CRISIS LEVEL', textStyle({ size: 13, weight: '900', color: UI.inkSoft })).setOrigin(0, 0.5));
    this.pips = [];
    for (let i = 0; i < CRISIS_LEVELS; i++) {
      const p = scene.add.rectangle(292 + i * 22, 22, 16, 14, hex(UI.paperDeep)).setStrokeStyle(3, hex(UI.ink));
      this.pips.push(p);
      c.add(p);
    }
    this.level = -1;
    this.shown = -1;
  }

  crisisLevel() {
    const i = this.sim.adaptive.intensity;
    return Math.max(1, Math.min(CRISIS_LEVELS, 1 + Math.round(((i - INTENSITY.min) / (INTENSITY.max - INTENSITY.min)) * (CRISIS_LEVELS - 1))));
  }

  update() {
    const s = this.sim.stability;
    const shown = Math.round(s);
    if (shown !== this.shown) {
      this.shown = shown;
      this.value.setText(`${shown}%`);
      this.value.setColor(s >= 70 ? UI.teal : s >= 45 ? UI.orangeDeep : UI.red);
    }
    this.bar.setValue(s / 100);
    this.bar.setFillFrame(s >= 70 ? 'good' : s >= 45 ? 'energy' : 'red');
    const trend = s - this.sim.stabilityAt(this.sim.t - 10);
    this.arrow.setVisible(Math.abs(trend) > 1.5);
    this.arrow.setFrame(trend < 0 ? 'ui-down' : 'ui-up');
    this.arrow.x = 30 + this.value.width;
    const level = this.crisisLevel();
    if (level !== this.level) {
      const colors = [UI.green, UI.tealLight, UI.yellow, UI.orange, UI.redLight];
      this.pips.forEach((p, i) => p.setFillStyle(hex(i < level ? colors[i] : UI.paperDeep)));
      if (this.level > 0) this.scene.tweens.add({ targets: this.pips, scaleY: 1.6, duration: 160, yoyo: true });
      this.level = level;
    }
  }
}
