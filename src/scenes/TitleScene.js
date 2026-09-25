import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI } from '../config/palette.js';
import { textStyle } from '../ui/theme.js';
import { Button, panel, transitionTo, fadeIn } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Backdrop } from '../ui/backdrop.js';
import { tag } from '../ui/widgets.js';
import { showRunReveal } from '../ui/reveal.js';
import { randomRunConfig } from '../sim/run-setup.js';
import { freshSeed } from '../core/rng.js';
import { session, resetSession, isExhibition, reducedMotion } from '../core/session.js';
import { IdleWatcher } from '../core/idle.js';
import { bus } from '../core/event-bus.js';

/** START SCREEN: title, play, randomize everything, hall of commanders, settings. */
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  init() {
    resetSession();
  }

  create() {
    fadeIn(this);
    bus.emit('music', 'title');
    this.backdrop = new Backdrop(this, { speed: reducedMotion() ? 0 : 1 });
    const cx = GAME_WIDTH / 2;

    // logo + tagline
    this.logo = this.add.image(cx, 232, 'ui', 'logo').setScale(7);
    if (!reducedMotion()) this.tweens.add({ targets: this.logo, y: 222, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const tagline = tag(this, 0, 450, '15 MINUTES UNTIL CITY COLLAPSE', { color: 'red', size: 34, iconFrame: 'ui-warning', height: 64, pad: 24 });
    tagline.x = cx - tagline.width / 2;
    this.add.text(cx, 520, 'Choose a role. Face a crisis. Keep NEXUS standing.', textStyle({ size: 30, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 8 })).setOrigin(0.5);

    // menu
    const stage = panel(this, cx - 330, 570, 660, 420, 'card');
    stage.setAlpha(0.94);
    this.focus = new FocusGroup(this);
    const play = new Button(this, cx, 650, { text: 'PLAY', width: 580, height: 104, color: 'teal', iconFrame: 'ui-play', size: 46, onClick: () => this.play() });
    const random = new Button(this, cx, 770, { text: 'RANDOMIZE EVERYTHING', width: 580, height: 88, color: 'magenta', iconFrame: 'ui-dice', size: 32, onClick: () => this.randomize() });
    const hall = new Button(this, cx - 104, 890, { text: 'HALL OF COMMANDERS', width: 372, height: 84, color: 'orange', iconFrame: 'ui-trophy', size: 23, onClick: () => transitionTo(this, 'hall') });
    const settings = new Button(this, cx + 190, 890, { text: 'SETTINGS', width: 200, height: 84, color: 'blue', iconFrame: 'ui-gear', size: 23, onClick: () => this.scene.launch('settings', { from: 'title' }) });
    for (const b of [play, random, hall, settings]) this.focus.add(b);

    // footer
    this.add.text(24, GAME_HEIGHT - 20, 'Mouse · Touch · Keyboard (arrows + Enter)', textStyle({ size: 20, weight: '800', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0, 1);
    this.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 20, 'Original game · plays fully offline', textStyle({ size: 20, weight: '800', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(1, 1);
    if (isExhibition()) {
      const ex = tag(this, 24, 40, 'EXHIBITION MODE', { color: 'yellow', size: 22, iconFrame: 'ui-flag' });
      ex.setDepth(10);
      // attract loop: after a quiet spell the city plays itself until someone touches it
      this.idle = new IdleWatcher(this, 45, () => transitionTo(this, 'game', { demo: true }));
    }
    this.events.on('resume', () => this.focus && (this.focus.enabled = true));
  }

  play() {
    transitionTo(this, 'character');
  }

  randomize() {
    this.focus.enabled = false;
    const config = randomRunConfig(freshSeed());
    session.character = config.character;
    session.scenario = config.scenario;
    session.surprise = true;
    session.config = config;
    showRunReveal(this, config, {
      title: 'RANDOMIZE EVERYTHING',
      auto: isExhibition() ? 4 : 0,
      onStart: () => transitionTo(this, 'game', { config }),
      onCancel: () => { this.focus.enabled = true; }
    });
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.backdrop.update(dt);
    this.idle?.update(dt);
  }
}
