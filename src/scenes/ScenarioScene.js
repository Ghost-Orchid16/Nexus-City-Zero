import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI } from '../config/palette.js';
import { SCENARIOS } from '../data/scenarios.js';
import { CHARACTER_BY_ID } from '../data/characters.js';
import { textStyle } from '../ui/theme.js';
import { Button, panel, transitionTo, fadeIn } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Backdrop } from '../ui/backdrop.js';
import { Toggle } from '../ui/widgets.js';
import { ScenarioCard, SCN_W, SCN_H } from '../ui/scenario-card.js';
import { showRunReveal } from '../ui/reveal.js';
import { createRunConfig, randomCharacter } from '../sim/run-setup.js';
import { RNG, freshSeed } from '../core/rng.js';
import { session, isExhibition, reducedMotion } from '../core/session.js';
import { IdleWatcher } from '../core/idle.js';

/** CRISIS THEME SELECTION + optional surprise conditions and CHAOS MODE. */
export default class ScenarioScene extends Phaser.Scene {
  constructor() {
    super('scenario');
  }

  init() {
    this.busy = false;
    if (!session.character) session.character = randomCharacter(new RNG(freshSeed()));
  }

  create() {
    fadeIn(this);
    this.backdrop = new Backdrop(this, { speed: reducedMotion() ? 0 : 0.6, tint: 0xffd9c2 });
    const role = CHARACTER_BY_ID[session.character];
    this.add.text(GAME_WIDTH / 2, 56, 'CHOOSE THE CRISIS', textStyle({ size: 56, font: 'display', color: UI.yellow, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5);
    // who is in command
    const who = this.add.container(40, 56);
    who.add(this.add.image(34, 0, 'ui', `badge-${role.color}`).setScale(4.2));
    who.add(this.add.image(34, 2, 'portraits', role.portrait).setScale(1.2));
    who.add(this.add.text(78, 0, role.name.toUpperCase(), textStyle({ size: 24, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0, 0.5));

    // rule strip for the focused theme
    this.strip = panel(this, 40, 902, GAME_WIDTH - 80, 58, 'card');
    this.stripIcon = this.add.image(84, 931, 'icons', 'ui-info').setScale(2);
    this.stripText = this.add.text(114, 931, '', textStyle({ size: 21, weight: '800' })).setOrigin(0, 0.5);

    this.focus = new FocusGroup(this, { onCancel: () => this.back() });
    const gapX = 16;
    const gapY = 16;
    const x0 = (GAME_WIDTH - (SCN_W * 5 + gapX * 4)) / 2 + SCN_W / 2;
    const y0 = 110 + SCN_H / 2;
    this.cards = SCENARIOS.map((s, i) => {
      const card = new ScenarioCard(this, x0 + (i % 5) * (SCN_W + gapX), y0 + Math.floor(i / 5) * (SCN_H + gapY), s, { onPick: (scn) => this.pick(scn) });
      card.on('focused', () => this.showRule(s));
      this.focus.add(card);
      return card;
    });

    // controls
    const by = 1020;
    const back = new Button(this, 150, by, { text: 'BACK', width: 220, height: 80, color: 'stone', size: 30, sfx: 'back', onClick: () => this.back() });
    this.surprise = new Toggle(this, 640, by, { text: 'SURPRISE CONDITIONS', hint: 'random start, budget, first crisis + a twist', width: 640, height: 80, value: session.surprise, onChange: (v) => { session.surprise = v; } });
    const chaos = new Button(this, 1250, by, { text: 'CHAOS MODE', width: 380, height: 84, color: 'magenta', iconFrame: 'ui-dice', size: 32, sfx: 'dice', onClick: () => this.pick(SCENARIOS.find((s) => s.chaos)) });
    const start = new Button(this, 1690, by, { text: 'START', width: 380, height: 88, color: 'teal', iconFrame: 'ui-play', size: 38, onClick: () => this.focusedCard() && this.pick(this.focusedCard().scenario) });
    for (const b of [back, this.surprise, chaos, start]) this.focus.add(b);
    const initial = Math.max(0, SCENARIOS.findIndex((s) => s.id === session.scenario));
    this.focus.focus(initial);
    this.showRule(SCENARIOS[initial]);

    if (isExhibition()) this.idle = new IdleWatcher(this, 60, () => transitionTo(this, 'title'));
  }

  focusedCard() {
    const cur = this.focus.current();
    if (cur instanceof ScenarioCard) return cur;
    return this.cards.find((c) => c.scenario.id === this.lastRule) || this.cards[0];
  }

  showRule(s) {
    this.lastRule = s.id;
    this.stripIcon.setFrame(s.icon);
    this.stripText.setText(`${s.chaos ? 'CHAOS MODE' : 'SPECIAL RULE'}: ${s.rule.text}`);
  }

  back() {
    if (this.busy) return;
    transitionTo(this, 'character');
  }

  pick(scenario) {
    if (this.busy) return;
    this.busy = true;
    this.focus.enabled = false;
    session.scenario = scenario.id;
    const config = createRunConfig({ character: session.character, scenario: scenario.id, seed: freshSeed(), randomize: session.surprise });
    session.config = config;
    const go = () => transitionTo(this, 'game', { config });
    if (scenario.chaos || session.surprise) {
      showRunReveal(this, config, {
        title: scenario.chaos ? 'CHAOS MODE' : 'SURPRISE CONDITIONS',
        auto: isExhibition() ? 4 : 0,
        onStart: go,
        onCancel: () => { this.busy = false; this.focus.enabled = true; }
      });
    } else {
      go();
    }
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.backdrop.update(dt);
    this.idle?.update(dt);
  }
}
