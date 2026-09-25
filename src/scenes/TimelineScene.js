import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { SYSTEMS, RESOURCE_BY_ID } from '../data/resources.js';
import { DISTRICT_BY_ID } from '../data/city-layout.js';
import { formatClock } from '../sim/clock.js';
import { whatIf } from '../sim/what-if.js';
import { createRunConfig } from '../sim/run-setup.js';
import { freshSeed } from '../core/rng.js';
import { session, isExhibition, reducedMotion } from '../core/session.js';
import { IdleWatcher } from '../core/idle.js';
import { bus } from '../core/event-bus.js';
import { textStyle } from '../ui/theme.js';
import { Button, panel, transitionTo, fadeIn } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Backdrop } from '../ui/backdrop.js';
import { tag, signed } from '../ui/widgets.js';
import { stabilityChart } from '../ui/charts.js';
import { chipRow, DISTRICT_COLOR } from '../ui/hud/event-card.js';

const CATEGORY_ICON = { cyber: 'scn-cyber', industrial: 'scn-industrial', weather: 'scn-weather', recovery: 'ui-star' };
const iconFor = (category) => CATEGORY_ICON[category] || RESOURCE_BY_ID[category]?.icon || 'ui-warning';

/** Timeline node for one decision (focusable). */
class Node extends Phaser.GameObjects.Container {
  constructor(scene, x, y, decision, onPick) {
    super(scene, x, y);
    this.decision = decision;
    this.onPick = onPick;
    const d = decision;
    const delta = (d.stabilityLater ?? d.stabilityAfter) - d.stabilityBefore;
    const badge = d.ignored ? 'badge-stone' : delta >= 2 ? 'badge-green' : delta <= -2 ? 'badge-red' : 'badge-cream';
    this.ring = scene.add.image(0, 0, 'ui', 'select-gold').setScale(4.2).setVisible(false);
    this.add(this.ring);
    const disc = scene.add.image(0, 0, 'ui', badge).setScale(3.4);
    this.add(disc);
    this.add(scene.add.image(0, -1, 'icons', d.ignored ? 'ui-cross' : iconFor(d.category)).setScale(iconFor(d.category).startsWith('scn') ? 1.3 : 1.8));
    this.clockLabel = scene.add.text(0, 40, formatClock(d.clock), textStyle({ size: 15, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 5 })).setOrigin(0.5);
    this.add(this.clockLabel);
    this.setSize(60, 60);
    disc.setInteractive({ useHandCursor: true });
    disc.on('pointerover', () => this.emit('hover', this));
    disc.on('pointerup', () => this.activate());
    scene.add.existing(this);
  }

  setFocus(on) {
    this.ring.setVisible(on);
    this.scene.tweens.add({ targets: this, scale: on ? 1.15 : 1, duration: 140 });
    if (on) this.activate(true);
  }

  activate(silent = false) {
    this.onPick(this.decision, silent);
  }
}

/** DECISION TIMELINE + WHAT-IF ANALYSIS. */
export default class TimelineScene extends Phaser.Scene {
  constructor() {
    super('timeline');
  }

  init() {
    this.sim = session.sim;
    this.selected = null;
    this.detailButtons = [];
  }

  create() {
    if (!this.sim) {
      this.scene.start('title');
      return;
    }
    fadeIn(this);
    this.backdrop = new Backdrop(this, { speed: reducedMotion() ? 0 : 0.4, tint: 0xd8e4ff });
    this.add.text(GAME_WIDTH / 2, 46, 'DECISION TIMELINE', textStyle({ size: 54, font: 'display', color: UI.yellow, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 96, 'Pick any decision, then ask WHAT IF: the city is re-simulated from that exact moment. Your score never changes.', textStyle({ size: 20, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0.5);

    this.focus = new FocusGroup(this, { onCancel: () => this.back() });
    panel(this, 40, 440, 860, 540, 'card-white');
    panel(this, 920, 440, 960, 540, 'card-white');
    this.detail = this.add.container(0, 0);
    this.whatIfLayer = this.add.container(0, 0);
    this.detailButtons = [];
    this.ribbon(40, 124, 1840, 300);

    const back = new Button(this, 240, 1030, { text: 'BACK TO REPORT', width: 400, height: 76, color: 'stone', size: 26, sfx: 'back', onClick: () => this.back() });
    const again = new Button(this, 1680, 1030, { text: 'PLAY AGAIN', width: 400, height: 76, color: 'teal', iconFrame: 'ui-restart', size: 28, onClick: () => this.playAgain() });
    this.focus.add(back);
    this.focus.add(again);

    const first = this.sim.decisions.find((d) => !d.ignored) || this.sim.decisions[0];
    if (first) this.pick(first, true);
    else this.add.text(470, 700, 'No decisions were made in this run.', textStyle({ size: 26, weight: '900', color: UI.inkSoft })).setOrigin(0.5);
    if (isExhibition()) this.idle = new IdleWatcher(this, 75, () => transitionTo(this, 'title'));
  }

  ribbon(x, y, w, h) {
    const sim = this.sim;
    panel(this, x, y, w, h, 'card');
    const chartY = y + 124;
    const markers = [
      ...sim.cascades.map((c) => ({ t: c.t, kind: 'cascade' })),
      ...sim.log.filter((e) => e.type === 'ability').map((e) => ({ t: e.t, kind: 'ability' })),
      ...sim.log.filter((e) => e.type === 'failure').map((e) => ({ t: e.t, kind: 'failure' }))
    ];
    this.chart = stabilityChart(this, x + 16, chartY, w - 32, h - 136, { series: sim.series, markers, frame: 'card-inset' });
    this.add.text(x + 20, y + 20, 'DECISIONS · pick one to explore it', textStyle({ size: 15, weight: '900', color: UI.inkSoft }));
    // legend
    const legend = [['badge-green', 'helped the city'], ['badge-cream', 'held steady'], ['badge-red', 'city got worse'], ['badge-stone', 'no response']];
    let lx = x + w - 20;
    for (const [frame, text] of legend.reverse()) {
      const t = this.add.text(lx, y + 20, text, textStyle({ size: 15, weight: '900', color: UI.inkSoft })).setOrigin(1, 0.5);
      lx -= t.width + 8;
      this.add.image(lx - 10, y + 20, 'ui', frame).setScale(1.2);
      lx -= 34;
    }
    // decision nodes, staggered on two rows so they never overlap
    const plot = this.chart.plot;
    this.nodes = [];
    let lastTop = -999;
    for (const d of sim.decisions) {
      const nx = x + 16 + plot.px(d.t);
      const lower = nx - lastTop < 62; // too close to its neighbor: drop to the lower row
      if (!lower) lastTop = nx;
      const node = new Node(this, nx, y + (lower ? 94 : 62), d, (dec, silent) => this.pick(dec, silent));
      if (lower) node.clockLabel.setVisible(false);
      this.nodes.push(node);
      this.focus.add(node);
    }
  }

  pick(decision, silent = false) {
    if (this.selected === decision) return;
    this.selected = decision;
    if (!silent) bus.emit('sfx', 'select');
    const node = this.nodes.find((n) => n.decision === decision);
    if (node && this.focus.current() !== node) this.focus.focusItem(node);
    this.chart.list.filter((o) => o.name === 'cursor').forEach((o) => o.destroy());
    const cursor = this.add.rectangle(this.chart.plot.px(decision.t), this.chart.plot.pad.t, 4, this.chart.plot.ch, hex(UI.violetDeep), 0.8).setOrigin(0.5, 0);
    cursor.name = 'cursor';
    this.chart.add(cursor);
    this.renderDetail(decision);
    this.renderWhatIfIntro();
  }

  renderDetail(d) {
    for (const b of this.detailButtons) {
      this.focus.items = this.focus.items.filter((i) => i !== b);
      b.destroy();
    }
    this.detailButtons = [];
    this.detail.removeAll(true);
    const x = 40;
    const y = 440;
    const w = 860;
    const add = (o) => this.detail.add(o);
    add(this.add.text(x + 28, y + 42, formatClock(d.clock), textStyle({ size: 48, weight: '900', color: UI.violetDeep })).setOrigin(0, 0.5));
    add(this.add.text(x + 190, y + 30, d.title.toUpperCase(), textStyle({ size: 28, font: 'display', wrap: w - 220 })).setOrigin(0, 0.5));
    const dist = tag(this, x + 190, y + 66, DISTRICT_BY_ID[d.district].name.toUpperCase(), { color: DISTRICT_COLOR[d.district] || 'violet', size: 14, height: 28, pad: 10 });
    add(dist);
    if (d.reason === 'cascade') add(tag(this, x + 200 + dist.width, y + 66, 'CASCADE CRISIS', { color: 'red', size: 14, height: 28, pad: 10 }));
    if (d.reason === 'followup') add(tag(this, x + 200 + dist.width, y + 66, 'SIDE EFFECT OF AN EARLIER CHOICE', { color: 'coral', size: 14, height: 28, pad: 10 }));

    add(this.add.text(x + 28, y + 108, 'YOU CHOSE', textStyle({ size: 16, weight: '900', color: UI.teal })));
    add(this.add.text(x + 28, y + 130, d.ignored ? 'No response (the timer ran out)' : d.label, textStyle({ size: 28, weight: '900', color: d.ignored ? UI.red : UI.ink })));
    add(chipRow(this, x + 28, y + 196, d.effects, { cost: d.cost, lingering: d.lingering, size: 20, maxWidth: w - 60 }));
    const before = Math.round(d.stabilityBefore);
    const later = Math.round(d.stabilityLater ?? d.stabilityAfter);
    const delta = later - before;
    add(this.add.text(x + 28, y + 246, `City stability ${before}% → ${later}% 15 s later`, textStyle({ size: 21, weight: '900', color: delta >= 2 ? UI.teal : delta <= -2 ? UI.red : UI.inkSoft })));
    add(this.add.text(x + 28, y + 276, `Decided in ${d.decisionTime.toFixed(1)} s${d.followUp ? ` · triggered: ${this.sim.eventTitle(d.followUp)}` : ''}`, textStyle({ size: 17, weight: '800', color: UI.inkSoft })));

    add(this.add.text(x + 28, y + 314, 'WHAT IF YOU HAD CHOSEN…', textStyle({ size: 20, font: 'display', color: UI.violetDeep })));
    const alts = d.options.filter((o) => o.id !== d.choiceId);
    const options = d.ignored ? alts : [...alts, { id: null, label: 'No response', locked: false, effects: {} }];
    options.slice(0, 4).forEach((o, i) => {
      const bx = x + 28 + (i % 2) * 410 + 200;
      const by = y + 392 + Math.floor(i / 2) * 84;
      const b = new Button(this, bx, by, { text: o.label, width: 396, height: 72, color: o.locked ? 'stone' : o.id === null ? 'coral' : 'blue', size: o.label.length > 24 ? 18 : 21, sub: o.locked ? 'not affordable at the time' : null, disabled: !!o.locked, onClick: () => this.runWhatIf(d, o) });
      this.detailButtons.push(b);
      this.focus.add(b);
    });
  }

  renderWhatIfIntro() {
    this.whatIfLayer.removeAll(true);
    const x = 920;
    const y = 440;
    this.whatIfLayer.add(this.add.image(x + 480, y + 200, 'icons', 'ui-branch').setScale(8).setAlpha(0.9));
    this.whatIfLayer.add(this.add.text(x + 480, y + 330, 'WHAT-IF ANALYSIS', textStyle({ size: 34, font: 'display', color: UI.violetDeep })).setOrigin(0.5));
    this.whatIfLayer.add(this.add.text(x + 480, y + 380, 'Choose an alternative on the left. NEXUS will replay the city from that exact moment and compare it with what really happened.', textStyle({ size: 20, weight: '800', color: UI.inkSoft, align: 'center', wrap: 760 })).setOrigin(0.5, 0));
  }

  runWhatIf(decision, option) {
    const r = whatIf(this.sim.config, decision, option.id);
    if (!r) return;
    bus.emit('sfx', 'reveal');
    const L = this.whatIfLayer;
    L.removeAll(true);
    const x = 920;
    const y = 440;
    const w = 960;
    L.add(panel(this, x, y, w, 64, 'band-violet'));
    L.add(this.add.text(x + 24, y + 32, `WHAT-IF · SIMULATED ${r.horizon} s AFTER ${formatClock(decision.clock)}`, textStyle({ size: 24, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0, 0.5));
    // chosen vs alternative
    L.add(this.add.text(x + 28, y + 86, 'YOU CHOSE', textStyle({ size: 15, weight: '900', color: UI.teal })));
    L.add(this.add.text(x + 28, y + 106, r.chosen.id ? r.chosen.label : 'No response', textStyle({ size: 22, weight: '900', wrap: 420 })));
    L.add(this.add.text(x + 500, y + 86, 'ALTERNATIVE', textStyle({ size: 15, weight: '900', color: UI.orangeDeep })));
    L.add(this.add.text(x + 500, y + 106, r.alternative.label, textStyle({ size: 22, weight: '900', wrap: 430 })));

    // two stability curves
    const cx = x + 28;
    const cy = y + 160;
    const cw = 400;
    const ch = 170;
    L.add(panel(this, cx, cy, cw, ch, 'card-inset'));
    const g = this.add.graphics();
    L.add(g);
    const all = [...r.actual.curve, ...r.alt.curve].map((p) => p.stability);
    const lo = Math.max(0, Math.floor(Math.min(...all) - 5));
    const hi = Math.min(100, Math.ceil(Math.max(...all) + 5));
    const px = (s) => cx + 14 + (s / Math.max(1, r.horizon)) * (cw - 28);
    const py = (v) => cy + 12 + (ch - 24) * (1 - (v - lo) / Math.max(1, hi - lo));
    const line = (curve, color) => {
      g.lineStyle(5, hex(color), 1);
      g.strokePoints(curve.map((p) => ({ x: px(p.in), y: py(p.stability) })), false);
    };
    line(r.actual.curve, UI.teal);
    line(r.alt.curve, UI.orange);
    L.add(this.add.text(cx + 12, cy + ch + 16, '■ what you did', textStyle({ size: 16, weight: '900', color: UI.teal })).setOrigin(0, 0.5));
    L.add(this.add.text(cx + cw - 12, cy + ch + 16, '■ alternative', textStyle({ size: 16, weight: '900', color: UI.orangeDeep })).setOrigin(1, 0.5));
    const verdict = r.verdict === 'better' ? ['THE ALTERNATIVE WAS BETTER', 'green'] : r.verdict === 'worse' ? ['YOUR CHOICE WAS BETTER', 'teal'] : ['ABOUT THE SAME', 'yellow'];
    L.add(tag(this, cx, cy + ch + 58, `${verdict[0]} (${signed(r.stabilityDiff)} stability)`, { color: verdict[1], size: 18, height: 40, pad: 12 }));
    const notes = [];
    if (r.alt.cascades.length) notes.push(`Alternative: ${r.alt.cascades.map((id) => RESOURCE_BY_ID[id].name).join(', ')} cascade${r.alt.cascades.length > 1 ? 's' : ''}`);
    if (r.actual.cascades.length) notes.push(`Your choice: ${r.actual.cascades.map((id) => RESOURCE_BY_ID[id].name).join(', ')} cascade${r.actual.cascades.length > 1 ? 's' : ''}`);
    notes.push('Your final score is not changed.');
    L.add(this.add.text(cx, cy + ch + 94, notes.join('\n'), textStyle({ size: 16, weight: '800', color: UI.inkSoft, wrap: 420 })));

    // simulated difference per system
    const dx = x + 470;
    L.add(this.add.text(dx, y + 160, 'SIMULATED DIFFERENCE', textStyle({ size: 20, font: 'display', color: UI.violetDeep })));
    const rows = [...SYSTEMS.map((s) => ({ id: s.id, name: s.name, icon: s.icon, badge: s.badge, v: r.diff[s.id] })), { id: 'budget', name: 'Budget', icon: 'res-budget', badge: 'magenta', v: r.diff.budget }];
    const max = Math.max(10, ...rows.map((row) => Math.abs(row.v)));
    rows.forEach((row, i) => {
      const ry = y + 206 + i * 36;
      L.add(this.add.image(dx + 14, ry, 'icons', row.icon).setScale(1.5));
      L.add(this.add.text(dx + 36, ry, row.name, textStyle({ size: 17, weight: '900' })).setOrigin(0, 0.5));
      const mid = dx + 290;
      L.add(this.add.rectangle(mid, ry, 2, 24, hex(UI.inkSoft), 0.5));
      if (row.v) {
        const bw = (Math.abs(row.v) / max) * 120;
        L.add(this.add.rectangle(row.v > 0 ? mid : mid - bw, ry, bw, 18, hex(row.v > 0 ? UI.green : UI.redLight)).setOrigin(0, 0.5));
      }
      L.add(this.add.text(dx + 460, ry, `${signed(row.v)}${row.id === 'budget' ? '' : '%'}`, textStyle({ size: 19, weight: '900', color: row.v > 0 ? UI.teal : row.v < 0 ? UI.red : UI.inkSoft })).setOrigin(1, 0.5));
    });
    L.setAlpha(0);
    this.tweens.add({ targets: L, alpha: 1, duration: 260 });
  }

  back() {
    transitionTo(this, 'results');
  }

  playAgain() {
    const c = session.config;
    const config = createRunConfig({ character: c.character, scenario: c.scenario, seed: freshSeed(), randomize: c.randomized });
    session.config = config;
    transitionTo(this, 'game', { config });
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.backdrop?.update(dt);
    this.idle?.update(dt);
  }
}
