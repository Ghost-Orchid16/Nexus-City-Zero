import Phaser from 'phaser';
import { CityView } from '../world/city-view.js';
import { Simulation } from '../sim/simulation.js';
import { Autopilot } from '../sim/autopilot.js';
import { createRunConfig, randomRunConfig } from '../sim/run-setup.js';
import { computeReport } from '../sim/scoring.js';
import { recordRun } from '../core/profile.js';
import { profileStore } from '../core/storage.js';
import { RESOURCE_BY_ID } from '../data/resources.js';
import { DISTRICT_BY_ID } from '../data/city-layout.js';
import { freshSeed } from '../core/rng.js';
import { session, reducedMotion } from '../core/session.js';
import { transitionTo, fadeIn } from '../ui/components.js';
import { exposeDebug } from '../core/debug.js';

/** Visual QA / tests: `?test&start=game&role=ai&theme=power&seed=qa` starts that exact run. */
function qaConfig() {
  const p = new URLSearchParams(globalThis.location?.search || '');
  if (!(p.has('test') || p.has('debug')) || !p.get('role')) return null;
  return createRunConfig({ character: p.get('role'), scenario: p.get('theme') || 'power', seed: p.get('seed') || 'qa', randomize: p.has('surprise') });
}

/** Map feedback per system when a response lands. */
const BURST = { health: 'health', energy: 'energy', water: 'water', supplies: 'supplies', infrastructure: 'repair', transport: 'good', safety: 'good', communication: 'good' };

/**
 * CITY SIMULATION: the living city driven by the headless simulation. The HUD runs as a parallel
 * scene; both share the `run` controller (start, pause, restart, quit).
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  init(data = {}) {
    this.demo = !!data.demo;
    this.config = this.demo ? randomRunConfig(freshSeed()) : data.config || session.config || qaConfig() || randomRunConfig(freshSeed());
    this.finished = false;
    this.viewTimer = 0;
  }

  create() {
    fadeIn(this);
    const sim = new Simulation(this.config);
    this.sim = sim;
    if (!this.demo) {
      session.config = this.config;
      session.sim = sim;
      session.character = this.config.character;
      session.scenario = this.config.scenario;
    }
    this.city = new CityView(this, { seed: this.config.seed }).build();
    this.calm = reducedMotion();
    if (this.city.effects) this.city.effects.reducedMotion = this.calm;
    this.city.applyState(sim.getView());
    this.pilot = this.demo ? new Autopilot('expert', this.config.seed) : null;
    this.run = {
      sim,
      demo: this.demo,
      started: false,
      paused: false,
      start: () => { this.run.started = true; },
      restart: () => this.restart(),
      quit: () => transitionTo(this, 'title'),
      exitDemo: () => transitionTo(this, 'title')
    };

    // the world reacts to the simulation
    sim.on('event', (ev) => this.focusDistrict(ev.def.district));
    sim.on('resolved', (d) => this.onResolved(d));
    sim.on('cascade', (c) => this.city.effects.burst(RESOURCE_BY_ID[c.from].district, 'bad', 12));
    sim.on('rule', (r) => {
      if (r.district) this.city.effects.burst(r.district, 'bad', 8);
      if (r.rule === 'storm-fronts') this.city.effects.lightning();
    });
    sim.on('ability', (a) => this.onAbility(a));
    sim.on('end', () => this.finish());

    this.scene.launch('hud', { run: this.run });
    this.events.once('shutdown', () => {
      this.scene.stop('hud');
      sim.removeAll();
    });
    exposeDebug('sim', sim);
    exposeDebug('city', this.city);
    exposeDebug('run', this.run);
    exposeDebug('fastForward', (seconds, strategy = 'expert') => this.fastForward(seconds, strategy));
  }

  focusDistrict(district) {
    const d = DISTRICT_BY_ID[district];
    if (d) this.city.focus(d.center.x, d.center.y, { duration: this.calm ? 0 : 800 });
  }

  onResolved(d) {
    const best = Object.entries(d.applied).filter(([k, v]) => v > 0 && k !== 'budget').sort((a, b) => b[1] - a[1])[0];
    const kind = d.ignored ? 'bad' : BURST[best?.[0]] || 'good';
    this.city.effects.burst(d.district, kind, d.ignored ? 8 : 12);
    this.time.delayedCall(1700, () => {
      if (!this.sim.activeEvent && !this.sim.ended) this.city.resetView(this.calm ? 0 : 1100);
    });
  }

  onAbility(a) {
    const systems = Object.entries(a.effects || {}).filter(([k, v]) => k !== 'budget' && v > 0).map(([k]) => k);
    for (const id of systems.slice(0, 2)) this.city.effects.burst(RESOURCE_BY_ID[id].district, BURST[id] || 'good', 14);
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    const sim = this.sim;
    if (this.run.started && !this.run.paused && !sim.ended) {
      this.pilot?.update(sim, dt);
      sim.update(dt);
    }
    this.viewTimer -= dt;
    if (this.viewTimer <= 0) {
      this.viewTimer = 0.15;
      this.city.applyState(sim.getView());
    }
    this.city.update(time, delta);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.city.resetView(1400);
    if (this.demo) {
      this.time.delayedCall(3500, () => transitionTo(this, 'game', { demo: true }));
      return;
    }
    const report = computeReport(this.sim);
    const store = profileStore();
    const date = new Date().toISOString();
    const result = recordRun(store.get(), report, { date });
    store.save();
    session.report = report;
    session.recorded = { ...result, date, name: report.commander };
    session.runs++;
    this.time.delayedCall(2800, () => transitionTo(this, 'results'));
  }

  /** PLAY AGAIN with the same role and crisis, new seed (new event order). */
  restart() {
    const c = this.config;
    transitionTo(this, 'game', { config: createRunConfig({ character: c.character, scenario: c.scenario, seed: freshSeed(), randomize: c.randomized }) });
  }

  /** Test hook: play `seconds` of simulated time instantly with an autopilot. */
  fastForward(seconds, strategy) {
    const pilot = new Autopilot(strategy, 1);
    this.run.started = true;
    const end = this.sim.t + seconds;
    for (let guard = 0; guard < 200000 && !this.sim.ended && this.sim.t < end; guard++) {
      pilot.update(this.sim, 0.1);
      this.sim.update(0.1);
    }
    return { t: this.sim.t, ended: this.sim.ended, outcome: this.sim.outcome };
  }
}
