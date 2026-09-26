import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI } from '../config/palette.js';
import { SYSTEMS, RESOURCE_BY_ID } from '../data/resources.js';
import { CHARACTER_BY_ID } from '../data/characters.js';
import { ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { STYLES } from '../sim/strategy-analysis.js';
import { createRunConfig, randomRunConfig } from '../sim/run-setup.js';
import { commanderName } from '../data/commander-names.js';
import { renameRun } from '../core/profile.js';
import { profileStore } from '../core/storage.js';
import { RNG, freshSeed } from '../core/rng.js';
import { session, resetSession, isExhibition, reducedMotion } from '../core/session.js';
import { IdleWatcher } from '../core/idle.js';
import { bus } from '../core/event-bus.js';
import { textStyle } from '../ui/theme.js';
import { Button, Bar, panel, transitionTo, fadeIn } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Backdrop } from '../ui/backdrop.js';
import { tag, confetti } from '../ui/widgets.js';
import { stabilityChart } from '../ui/charts.js';
import { showRunReveal } from '../ui/reveal.js';

const fmt = (n) => n.toLocaleString('en-US');

/** FINAL CITY REPORT: survival, systems, citizens, resources, decisions, cascades and play style. */
export default class ResultsScene extends Phaser.Scene {
  constructor() {
    super('results');
  }

  init() {
    this.report = session.report;
    this.sim = session.sim;
  }

  create() {
    if (!this.report || !this.sim) {
      this.scene.start('title');
      return;
    }
    fadeIn(this);
    const r = this.report;
    bus.emit('music', r.completed ? 'results' : 'results-low');
    this.backdrop = new Backdrop(this, { speed: reducedMotion() ? 0 : 0.5, tint: r.completed ? 0xfff0dc : 0xe0c8f0 });
    this.add.text(GAME_WIDTH / 2, 50, 'NEXUS CITY STATUS', textStyle({ size: 58, font: 'display', color: UI.yellow, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5);
    this.commanderTag();

    this.leftCard(40, 100, 600, 740);
    this.systemsCard(660, 100, 520, 740);
    this.styleCard(1200, 100, 680, 740);
    this.rewardsStrip(40, 856, 1840, 86);

    this.focus = new FocusGroup(this);
    const y = 1012;
    const buttons = [
      new Button(this, 290, y, { text: 'TIMELINE & WHAT-IF', width: 480, height: 84, color: 'violet', iconFrame: 'ui-branch', size: 28, onClick: () => transitionTo(this, 'timeline') }),
      new Button(this, 780, y, { text: 'PLAY AGAIN', width: 420, height: 84, color: 'teal', iconFrame: 'ui-restart', size: 30, onClick: () => this.playAgain() }),
      new Button(this, 1240, y, { text: 'RANDOM RUN', width: 420, height: 84, color: 'magenta', iconFrame: 'ui-dice', size: 30, sfx: 'dice', onClick: () => this.randomRun() }),
      new Button(this, 1660, y, { text: 'RESET', width: 340, height: 84, color: 'stone', iconFrame: 'ui-home', size: 30, sfx: 'back', onClick: () => this.reset() })
    ];
    for (const b of buttons) this.focus.add(b);
    this.focus.focus(1);
    if (isExhibition()) this.idle = new IdleWatcher(this, 75, () => this.reset());
  }

  commanderTag() {
    const rec = session.recorded;
    const c = this.add.container(GAME_WIDTH - 40, 50);
    const label = this.add.text(0, 0, rec?.name || this.report.commander, textStyle({ size: 24, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(1, 0.5);
    c.add(label);
    const reroll = new Button(this, -label.width - 50, 0, { text: '', width: 64, height: 56, color: 'magenta', iconFrame: 'ui-dice', size: 20, sfx: 'dice', onClick: () => {
      const name = commanderName(new RNG(freshSeed()));
      const store = profileStore();
      renameRun(store.get(), this.report.seed, rec.date, name);
      store.save();
      rec.name = name;
      label.setText(name);
      reroll.x = -label.width - 50;
    } });
    c.add(reroll);
    const role = CHARACTER_BY_ID[this.report.character];
    const t = tag(this, 40, 50, role.name.toUpperCase(), { color: role.color, size: 20, height: 40, pad: 12 });
    t.setDepth(2);
  }

  leftCard(x, y, w, h) {
    const r = this.report;
    panel(this, x, y, w, h, 'card-white');
    panel(this, x, y, w, 96, `band-${r.outcomeColor}`);
    this.add.text(x + w / 2, y + 34, r.outcomeTitle, textStyle({ size: 40, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(x + w / 2, y + 74, r.outcomeText, textStyle({ size: 18, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 5 })).setOrigin(0.5);

    this.add.text(x + 28, y + 128, 'CITY SURVIVAL', textStyle({ size: 22, weight: '900', color: UI.inkSoft }));
    const big = this.add.text(x + 24, y + 146, '0%', textStyle({ size: 112, weight: '900', color: r.survival >= 70 ? UI.teal : r.survival >= 45 ? UI.orangeDeep : UI.red })).setOrigin(0, 0);
    this.tweens.addCounter({ from: 0, to: r.survival, duration: 1400, ease: 'Cubic.easeOut', onUpdate: (tw) => big.setText(`${Math.round(tw.getValue())}%`) });
    this.time.delayedCall(1400, () => bus.emit('sfx', r.completed ? 'success' : 'fail'));
    this.add.text(x + w - 28, y + 170, `stability at the end: ${r.finalStability}%\naverage: ${r.avgStability}% · lowest: ${r.minStability}%`, textStyle({ size: 17, weight: '800', color: UI.inkSoft, align: 'right' })).setOrigin(1, 0);

    const markers = [
      ...this.sim.cascades.map((c) => ({ t: c.t, kind: 'cascade' })),
      ...this.sim.log.filter((e) => e.type === 'ability').map((e) => ({ t: e.t, kind: 'ability' })),
      ...this.sim.decisions.map((d) => ({ t: d.t, kind: 'decision' }))
    ];
    stabilityChart(this, x + 20, y + 290, w - 40, 176, { series: this.sim.series, markers });

    const tiles = [
      { icon: 'ui-people', label: 'CITIZENS PROTECTED', value: `${r.citizensProtected}%`, sub: `${fmt(r.citizensCount)} of ${fmt(r.population)}` },
      { icon: 'res-budget', label: 'RESOURCES REMAINING', value: `${r.resourcesRemaining}%`, sub: `${r.budgetFinal} budget left of ${r.budgetEarned}` },
      { icon: 'ui-check', label: 'DECISIONS MADE', value: `${r.decisionsMade}`, sub: r.decisionsMissed ? `${r.decisionsMissed} crises unanswered` : 'no crisis ignored' },
      { icon: 'ui-cascade', label: 'CASCADE EVENTS', value: `${r.cascades}`, sub: r.blockedCascades.length ? `${r.blockedCascades.length} contained by your ability` : `${r.cascadesAnswered} answered at the source` },
      { icon: 'ui-warning', label: 'CRITICAL FAILURES', value: `${r.criticalFailures}`, sub: 'systems that hit the failure line' },
      { icon: 'ui-star', label: 'RESOURCE EFFICIENCY', value: `${r.efficiency}`, sub: `${r.survival}% survival for ${r.budgetSpent} budget spent` }
    ];
    tiles.forEach((t, i) => {
      const tx = x + 20 + (i % 2) * ((w - 50) / 2 + 10);
      const ty = y + 484 + Math.floor(i / 2) * 84;
      const tw = (w - 50) / 2;
      panel(this, tx, ty, tw, 76, 'card');
      this.add.image(tx + 30, ty + 38, 'icons', t.icon).setScale(2);
      this.add.text(tx + 58, ty + 18, t.label, textStyle({ size: 14, weight: '900', color: UI.inkSoft })).setOrigin(0, 0.5);
      const value = this.add.text(tx + 58, ty + 46, t.value, textStyle({ size: 30, weight: '900' })).setOrigin(0, 0.5);
      // the note takes whatever room the value leaves, so wide values never run into it
      const room = tw - 12 - (58 + value.width + 12);
      this.add.text(tx + tw - 12, ty + 50, t.sub, textStyle({ size: 13, weight: '800', color: UI.inkSoft, align: 'right', wrap: room })).setOrigin(1, 0.5);
    });
  }

  systemsCard(x, y, w, h) {
    const r = this.report;
    panel(this, x, y, w, h, 'card-white');
    this.add.text(x + 24, y + 30, 'SYSTEMS AT THE END', textStyle({ size: 28, font: 'display', color: UI.violetDeep })).setOrigin(0, 0.5);
    this.add.text(x + w - 24, y + 30, 'lowest', textStyle({ size: 15, weight: '900', color: UI.inkSoft })).setOrigin(1, 0.5);
    SYSTEMS.forEach((s, i) => {
      const ry = y + 70 + i * 82;
      this.add.image(x + 44, ry + 32, 'ui', `badge-${s.badge}`).setScale(3);
      this.add.image(x + 44, ry + 31, 'icons', s.icon).setScale(2);
      this.add.text(x + 80, ry + 12, s.short, textStyle({ size: 20, weight: '900' })).setOrigin(0, 0.5);
      const value = r.systems[s.id];
      this.add.text(x + w - 90, ry + 12, `${value}%`, textStyle({ size: 26, weight: '900', color: value < 25 ? UI.red : value < 40 ? UI.orangeDeep : UI.ink })).setOrigin(1, 0.5);
      this.add.text(x + w - 24, ry + 12, `${r.minLevels[s.id]}`, textStyle({ size: 17, weight: '900', color: r.minLevels[s.id] < 25 ? UI.red : UI.inkSoft })).setOrigin(1, 0.5);
      const bar = new Bar(this, x + 80, ry + 30, { width: w - 110, height: 27, fill: value < 25 ? 'red' : s.color, value: 0 });
      this.time.delayedCall(200 + i * 90, () => bar.setValue(value / 100));
    });
  }

  styleCard(x, y, w, h) {
    const st = this.report.style;
    panel(this, x, y, w, h, 'card-white');
    panel(this, x, y, w, 64, 'band-violet');
    this.add.image(x + 36, y + 32, 'icons', 'ui-ai').setScale(2);
    this.add.text(x + 66, y + 32, 'GAMEPLAY STRATEGY ANALYSIS', textStyle({ size: 24, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0, 0.5);
    this.add.text(x + 30, y + 96, 'YOUR PLAY STYLE', textStyle({ size: 20, weight: '900', color: UI.inkSoft }));
    const body = this.add.container(0, 0).setAlpha(0);
    const name = this.add.text(x + 30, y + 124, st.name.toUpperCase(), textStyle({ size: 46, font: 'display', color: UI.violetDeep, wrap: w - 60 }));
    body.add(name);
    let cy = y + 124 + name.height + 10;
    const blurb = this.add.text(x + 30, cy, st.blurb, textStyle({ size: 21, weight: '800', wrap: w - 60 }));
    body.add(blurb);
    cy += blurb.height + 22;
    body.add(this.add.text(x + 30, cy, 'BASED ON YOUR GAMEPLAY', textStyle({ size: 16, weight: '900', color: UI.teal })));
    cy += 30;
    for (const reason of st.reasons) {
      body.add(this.add.image(x + 42, cy + 13, 'icons', st.style ? 'ui-check' : 'ui-warning').setScale(1.5));
      const t = this.add.text(x + 64, cy, reason, textStyle({ size: 19, weight: '700', wrap: w - 100 }));
      body.add(t);
      cy += t.height + 12;
    }
    const adaptive = `Adaptive engine: crisis level ended at ${Math.round(((this.report.finalIntensity - 0.6) / 0.9) * 4) + 1}/5 after ${this.report.adaptiveChanges} adjustment${this.report.adaptiveChanges === 1 ? '' : 's'}.`;
    const note = st.style ? `Close second: ${STYLES[st.runnerUp].name}` : 'Answer crises with a click or keys 1–4 before their timers run out.';
    body.add(this.add.text(x + 30, y + h - 88, note, textStyle({ size: 18, weight: '900', color: UI.inkSoft, wrap: w - 60 })));
    body.add(this.add.text(x + 30, y + h - 56, adaptive, textStyle({ size: 17, weight: '800', color: UI.inkSoft, wrap: w - 60 })));
    // "analyzing…" then reveal
    const analyzing = this.add.text(x + 30, y + 130, 'Analyzing your decisions…', textStyle({ size: 26, weight: '900', color: UI.inkSoft }));
    this.time.delayedCall(1300, () => {
      analyzing.destroy();
      bus.emit('sfx', 'reveal');
      this.tweens.add({ targets: body, alpha: 1, duration: 420 });
      this.tweens.add({ targets: name, scale: { from: 1.25, to: 1 }, duration: 420, ease: 'Back.easeOut' });
    });
  }

  rewardsStrip(x, y, w, h) {
    const rec = session.recorded || { unlocked: [], placements: [] };
    panel(this, x, y, w, h, 'card');
    let cx = x + 24;
    const cy = y + h / 2;
    this.add.image(cx + 16, cy, 'icons', 'ui-trophy').setScale(2);
    cx += 44;
    if (!rec.unlocked.length && !rec.placements.length) {
      this.add.text(cx, cy, 'No new achievements or records this time. Try another role or strategy!', textStyle({ size: 21, weight: '800', color: UI.inkSoft })).setOrigin(0, 0.5);
      return;
    }
    rec.unlocked.forEach((id, i) => {
      const a = ACHIEVEMENT_BY_ID[id];
      const t = tag(this, cx, cy, a.name, { color: a.color, size: 20, height: 48, pad: 14, iconFrame: a.icon });
      t.setScale(0);
      this.time.delayedCall(1800 + i * 450, () => {
        this.tweens.add({ targets: t, scale: 1, duration: 320, ease: 'Back.easeOut' });
        confetti(this, t.x + t.width / 2, cy, { count: 24, spread: 300 });
        bus.emit('sfx', 'achievement');
      });
      cx += t.width + 12;
    });
    for (const p of rec.placements.filter((pl) => pl.rank <= 3).slice(0, 3)) {
      const t = tag(this, cx, cy, `${p.rank === 1 ? 'NEW RECORD' : `TOP ${p.rank}`}: ${p.title}`, { color: p.rank === 1 ? 'yellow' : 'cyan', size: 17, height: 42, pad: 12, iconFrame: p.rank === 1 ? 'ui-crown' : 'ui-medal' });
      if (cx + t.width > x + w - 20) {
        t.destroy();
        break;
      }
      cx += t.width + 12;
    }
  }

  playAgain() {
    const c = session.config;
    const config = createRunConfig({ character: c.character, scenario: c.scenario, seed: freshSeed(), randomize: c.randomized });
    session.config = config;
    transitionTo(this, 'game', { config });
  }

  randomRun() {
    this.focus.enabled = false;
    const config = randomRunConfig(freshSeed());
    session.config = config;
    showRunReveal(this, config, {
      title: 'RANDOM RUN',
      auto: isExhibition() ? 4 : 0,
      onStart: () => transitionTo(this, 'game', { config }),
      onCancel: () => { this.focus.enabled = true; }
    });
  }

  reset() {
    resetSession();
    transitionTo(this, 'title');
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.backdrop?.update(dt);
    this.idle?.update(dt);
  }
}

export { RESOURCE_BY_ID };
