import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI } from '../config/palette.js';
import { RESOURCE_BY_ID } from '../data/resources.js';
import { CHARACTER_BY_ID } from '../data/characters.js';
import { CHAOS_TWISTS } from '../data/scenarios.js';
import { SIM } from '../sim/simulation.js';
import { textStyle } from '../ui/theme.js';
import { Button } from '../ui/components.js';
import { KeyGuard } from '../ui/focus.js';
import { tag, floatText, signed, confetti } from '../ui/widgets.js';
import { RoleCard, ClockCard, StabilityCard } from '../ui/hud/top-bar.js';
import { SystemsPanel } from '../ui/hud/systems-panel.js';
import { AbilityCard } from '../ui/hud/ability-card.js';
import { EventCard, CARD } from '../ui/hud/event-card.js';
import { Toasts, banner, cascadeBanner, Tutorial, PauseMenu, FREE_CX } from '../ui/hud/overlays.js';
import { session, settings, isExhibition } from '../core/session.js';
import { bus } from '../core/event-bus.js';

/** The in-game HUD, running on top of the world scene and reading the live simulation. */
export default class HudScene extends Phaser.Scene {
  constructor() {
    super('hud');
  }

  init(data) {
    this.run = data.run;
    this.sim = data.run.sim;
    this.tutorial = null;
    this.pauseMenu = null;
    this.offs = [];
  }

  create() {
    const sim = this.sim;
    const run = this.run;
    this.role = new RoleCard(this, sim);
    this.clock = new ClockCard(this, sim);
    this.stability = new StabilityCard(this, sim);
    this.pauseBtn = new Button(this, 1428, 58, { text: 'II', width: 84, height: 84, color: 'blue', size: 36, sfx: 'click', onClick: () => this.togglePause() });
    this.systems = new SystemsPanel(this, sim);
    this.ability = new AbilityCard(this, sim, { onUse: () => sim.useAbility() });
    this.card = new EventCard(this, sim, {
      onChoose: (id) => sim.choose(id),
      onPreview: (choice) => this.systems.preview(choice)
    });
    this.toasts = new Toasts(this);
    this.collapseTag = null;
    if (sim.config.twist) {
      const twist = CHAOS_TWISTS.find((t) => t.id === sim.config.twist);
      this.twistTag = tag(this, 16, 0, `TWIST: ${twist.name.toUpperCase()}`, { color: 'magenta', size: 15, height: 30, pad: 10, iconFrame: 'ui-dice' });
      this.twistTag.y = 855;
    }

    // simulation → HUD
    const on = (name, fn) => this.offs.push(sim.on(name, fn));
    on('event', (ev) => {
      this.card.show(ev);
      bus.emit('sfx', ev.def.kind === 'recovery' ? 'opportunity' : ev.def.severity >= 3 || ev.reason === 'cascade' ? 'alarm' : 'alert');
    });
    on('event-update', (ev) => this.card.refresh(ev));
    on('event-cancelled', () => this.card.destroy());
    on('resolved', (d) => this.onResolved(d));
    on('message', (m) => {
      this.toasts.push(m, { hold: m.urgent ? 6.5 : 5.5 });
      bus.emit('sfx', m.kind === 'warning' || m.kind === 'cascade' ? 'warning' : 'message');
    });
    on('rule', (r) => {
      this.toasts.push({ kind: 'rule', prefix: 'CITY ALERT', text: r.text }, { hold: 5 });
      bus.emit('sfx', 'warning');
    });
    on('cascade', (c) => {
      cascadeBanner(this, c.from, c.to);
      bus.emit('sfx', 'cascade');
    });
    on('failure', () => bus.emit('sfx', 'fail'));
    on('phase', (p) => {
      banner(this, { title: p.title, text: p.text, color: p.id === 'critical-window' ? 'orange' : 'red', iconFrame: 'ui-warning', duration: 2600 });
      bus.emit('sfx', 'phase');
      if (p.id === 'critical-window') bus.emit('music', 'final');
    });
    on('ability', (a) => this.onAbility(a));
    on('collapse-warning', () => bus.emit('sfx', 'alarm'));
    on('end', (e) => this.onEnd(e));

    // input
    this.keyGuard = new KeyGuard();
    this.keyHandler = (e) => this.onKey(e);
    this.input.keyboard.on('keydown', this.keyHandler);
    this.events.once('shutdown', () => this.cleanup());

    if (run.demo) {
      this.demoOverlay();
      run.start();
    } else if ((settings().tutorial || isExhibition()) && !session.tutorialSeen) {
      session.tutorialSeen = true;
      this.startTutorial();
    } else {
      this.begin();
    }
  }

  cleanup() {
    for (const off of this.offs) off();
    this.offs = [];
    this.input.keyboard?.off('keydown', this.keyHandler);
  }

  // ------------------------------------------------------------------ flow
  startTutorial() {
    const role = CHARACTER_BY_ID[this.sim.config.character];
    const sb = this.systems.bounds();
    const steps = [
      {
        target: sb, cardX: sb.x + sb.w + 40, cardY: 200,
        title: 'YOUR CITY SYSTEMS',
        text: 'Keep every bar out of the red. Systems depend on each other: when power fails, water, hospitals and networks start failing too.'
      },
      {
        target: { x: CARD.x, y: CARD.y, w: CARD.w, h: 700 }, cardX: CARD.x - 700, cardY: 300,
        title: 'CRISES APPEAR HERE',
        text: 'Pick one response before the timer runs out. Every response has a trade-off: hover it to preview its effect on your bars. Keys 1–4 work too.'
      },
      {
        target: { x: 16, y: 870, w: 376, h: 194 }, cardX: 430, cardY: 800,
        title: role.ability.name.toUpperCase(),
        text: `Your special ability: ${role.ability.description}`
      },
      {
        target: { x: GAME_WIDTH / 2 - 200, y: 12, w: GAME_WIDTH / 2 + 184, h: 92 }, cardX: 900, cardY: 150,
        title: '15 MINUTES UNTIL COLLAPSE',
        text: `Keep City Stability up until the clock hits 00:00. The command AI will tell you what it sees. Good luck, ${this.sim.config.commander}!`
      }
    ];
    this.tutorial = new Tutorial(this, steps, {
      portrait: role.portrait,
      color: role.color,
      auto: isExhibition() ? 5 : 0,
      onDone: () => {
        this.tutorial = null;
        this.begin();
      }
    });
  }

  begin() {
    banner(this, { title: '15 MINUTES UNTIL CITY COLLAPSE', text: 'Protect NEXUS. Every decision counts.', color: 'red', iconFrame: 'ui-clock', duration: 2200, y: 320, width: 1000 });
    bus.emit('sfx', 'start');
    bus.emit('music', 'game');
    this.run.start();
  }

  demoOverlay() {
    const t = tag(this, 0, GAME_HEIGHT / 2 + 60, 'DEMO · TOUCH ANYWHERE TO PLAY', { color: 'yellow', size: 34, height: 70, pad: 26, iconFrame: 'ui-pointer' });
    t.x = FREE_CX - t.width / 2;
    t.setDepth(80);
    this.tweens.add({ targets: t, alpha: 0.55, duration: 800, yoyo: true, repeat: -1 });
    const exit = () => this.run.exitDemo();
    this.input.once('pointerdown', exit);
    this.input.keyboard.once('keydown', exit);
  }

  togglePause() {
    if (this.run.demo || this.tutorial || this.sim.ended) return;
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = null;
      this.run.paused = false;
      bus.emit('sfx', 'back');
      return;
    }
    this.run.paused = true;
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.togglePause(),
      onRestart: () => this.run.restart(),
      onSettings: () => this.scene.launch('settings', { from: 'hud' }),
      onQuit: () => this.run.quit()
    });
  }

  onKey(e) {
    if (this.keyGuard.skip(e)) return; // Phaser may re-dispatch queued events on slow frames
    if (this.tutorial || this.run.demo || this.sim.ended) return;
    if (this.pauseMenu) return; // the pause menu's focus group handles keys
    if (this.scene.isActive('settings')) return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      this.togglePause();
      return;
    }
    if (this.card.handleKey(e)) return;
    if (e.code === 'KeyE') this.ability.activate();
  }

  // ------------------------------------------------------------------ reactions
  onResolved(d) {
    this.card.resolve(d);
    this.systems.preview(null);
    let k = 0;
    for (const [id, v] of Object.entries(d.applied)) {
      const a = this.systems.rowAnchor(id);
      if (!a || Math.abs(v) < 0.5) continue;
      floatText(this, a.x - 150, a.y + 14, signed(v), { color: v > 0 ? UI.good : UI.redLight, size: 28, rise: 22, duration: 1400, delay: k++ * 90 });
    }
    if (d.ignored) {
      this.toasts.push({ kind: 'warning', prefix: 'NO RESPONSE', text: `${d.title}: the crisis ran its course.` }, { hold: 4.5 });
      bus.emit('sfx', 'fail');
    } else {
      bus.emit('sfx', d.kind === 'recovery' ? 'success' : 'confirm');
      if (d.followUp) this.toasts.push({ kind: 'warning', prefix: 'SIDE EFFECT', text: `Your response triggered a new crisis: ${this.sim.eventTitle(d.followUp)}.` }, { hold: 5 });
    }
  }

  onAbility(a) {
    const role = CHARACTER_BY_ID[this.sim.config.character];
    banner(this, { title: a.name.toUpperCase(), text: a.text, color: role.color === 'cyan' ? 'cyan' : role.color, iconFrame: this.sim.ability.icon, duration: 2400, y: 320, width: 980 });
    bus.emit('sfx', 'ability');
    let k = 0;
    for (const [id, v] of Object.entries(a.effects || {})) {
      const anchor = this.systems.rowAnchor(id);
      if (!anchor || !v) continue;
      floatText(this, anchor.x - 150, anchor.y + 14, signed(v), { color: v > 0 ? UI.good : UI.redLight, size: 28, rise: 22, duration: 1400, delay: k++ * 90 });
    }
  }

  onEnd({ outcome }) {
    this.card.destroy();
    this.pauseMenu?.destroy();
    this.pauseMenu = null;
    this.collapseTag?.destroy();
    if (outcome === 'collapsed') {
      banner(this, { title: 'CITY COLLAPSED', text: 'NEXUS could not hold. See what happened, and what could have.', color: 'red', iconFrame: 'ui-warning', duration: 0, y: 420, width: 1000 });
      bus.emit('sfx', 'collapse');
    } else {
      banner(this, { title: 'CITY SURVIVED!', text: 'The countdown is over. Relief crews are arriving.', color: 'green', iconFrame: 'ui-trophy', duration: 0, y: 420, width: 1000 });
      confetti(this, FREE_CX, 360, { count: 70, spread: 900, depth: 70 });
      bus.emit('sfx', 'victory');
    }
  }

  // ------------------------------------------------------------------ frame
  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.clock.update(time);
    this.stability.update();
    this.systems.update(dt, time);
    this.ability.update(time);
    this.card.update();
    this.updateCollapse(time);
    this.updateForecast();
  }

  /** Scientist's Rapid Analysis: the revealed crises stay listed until they arrive. */
  updateForecast() {
    const ids = this.sim.forecast;
    const key = ids.join(',');
    if (key === this.forecastKey) return;
    this.forecastKey = key;
    this.forecastStrip?.destroy();
    this.forecastStrip = null;
    if (!ids.length) return;
    const c = this.add.container(0, 116).setDepth(30);
    const items = [tag(this, 0, 0, 'NEXT CRISES', { color: 'cyan', size: 16, height: 36, pad: 10, iconFrame: 'abl-analysis' })];
    for (const id of ids) items.push(tag(this, 0, 0, this.sim.eventTitle(id).toUpperCase(), { color: 'violet', size: 16, height: 36, pad: 10 }));
    let x = 0;
    for (const t of items) {
      t.x = x;
      x += t.width + 8;
      c.add(t);
    }
    c.x = FREE_CX - (x - 8) / 2;
    c.y = 136;
    this.forecastStrip = c;
  }

  updateCollapse(time) {
    const sim = this.sim;
    const danger = sim.collapseTimer > 0 && !sim.ended;
    const left = danger ? Math.max(0, Math.ceil(SIM.collapseAfter - sim.collapseTimer)) : null;
    if (left !== this.collapseLeft) {
      this.collapseLeft = left;
      this.collapseTag?.destroy();
      this.collapseTag = null;
      if (danger) {
        this.collapseTag = tag(this, 0, 200, `CITY COLLAPSE IN ${left} s: RAISE STABILITY ABOVE ${SIM.collapseStability + 3}%`, { color: 'red', size: 26, height: 56, pad: 22, iconFrame: 'ui-warning' });
        this.collapseTag.x = FREE_CX - this.collapseTag.width / 2;
        this.collapseTag.setDepth(70);
      }
    }
    if (this.collapseTag) this.collapseTag.setAlpha(0.75 + 0.25 * Math.sin(time / 120));
  }
}

export { RESOURCE_BY_ID };
