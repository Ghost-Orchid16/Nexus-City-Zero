import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { CHARACTERS, CHARACTER_BY_ID } from '../data/characters.js';
import { textStyle } from '../ui/theme.js';
import { Button, panel, transitionTo, fadeIn } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Backdrop } from '../ui/backdrop.js';
import { confetti } from '../ui/widgets.js';
import { CharacterCard, CARD_W, CARD_H } from '../ui/character-card.js';
import { randomCharacter } from '../sim/run-setup.js';
import { RNG, freshSeed } from '../core/rng.js';
import { session, isExhibition, reducedMotion } from '../core/session.js';
import { IdleWatcher } from '../core/idle.js';
import { bus } from '../core/event-bus.js';

/** CHARACTER SELECTION: seven command roles with real gameplay differences. */
export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('character');
  }

  init() {
    this.busy = false;
  }

  create() {
    fadeIn(this);
    this.backdrop = new Backdrop(this, { speed: reducedMotion() ? 0 : 0.6, tint: 0xd8d0ff });
    this.add.text(GAME_WIDTH / 2, 54, 'CHOOSE YOUR COMMAND ROLE', textStyle({ size: 56, font: 'display', color: UI.yellow, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5);

    this.focus = new FocusGroup(this, { onCancel: () => this.back() });
    const gap = 12;
    const x0 = (GAME_WIDTH - (CARD_W * 7 + gap * 6)) / 2 + CARD_W / 2;
    const y = 108 + CARD_H / 2;
    this.cards = CHARACTERS.map((c, i) => {
      const card = new CharacterCard(this, x0 + i * (CARD_W + gap), y, c, { onSelect: (ch, cardObj) => this.choose(ch, cardObj) });
      card.baseY = y;
      this.focus.add(card);
      return card;
    });
    const initial = Math.max(0, CHARACTERS.findIndex((c) => c.id === session.character));
    this.focus.focus(initial);

    // bottom bar
    const by = GAME_HEIGHT - 52;
    const back = new Button(this, 150, by, { text: 'BACK', width: 220, height: 80, color: 'stone', size: 30, sfx: 'back', onClick: () => this.back() });
    const random = new Button(this, GAME_WIDTH / 2, by, { text: 'RANDOM CHARACTER', width: 540, height: 88, color: 'magenta', iconFrame: 'ui-dice', size: 34, sfx: 'dice', onClick: () => this.randomCharacter() });
    this.focus.add(back);
    this.focus.add(random);
    this.add.text(GAME_WIDTH - 40, by, 'Pick a card, then SELECT', textStyle({ size: 22, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(1, 0.5);

    if (isExhibition()) this.idle = new IdleWatcher(this, 60, () => transitionTo(this, 'title'));
  }

  back() {
    if (this.busy) return;
    transitionTo(this, 'title');
  }

  choose(character, card) {
    if (this.busy) return;
    this.busy = true;
    session.character = character.id;
    bus.emit('sfx', 'select');
    confetti(this, card.x, card.y - 200, { count: 26, spread: 360 });
    this.tweens.add({ targets: card, scale: 1.1, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
    this.time.delayedCall(420, () => transitionTo(this, 'scenario'));
  }

  /** 🎲 RANDOM CHARACTER: a roulette over the real cards, then a role and ability reveal. */
  randomCharacter() {
    if (this.busy) return;
    this.busy = true;
    this.focus.enabled = false;
    const pick = randomCharacter(new RNG(freshSeed()));
    const target = CHARACTERS.findIndex((c) => c.id === pick);
    const laps = 2 * CHARACTERS.length + ((target - Math.max(0, this.focus.index) + CHARACTERS.length) % CHARACTERS.length);
    let step = 0;
    let index = Math.max(0, this.focus.index);
    const tick = () => {
      index = (index + 1) % CHARACTERS.length;
      this.focus.focus(index);
      bus.emit('sfx', 'tick');
      step++;
      if (step < laps) {
        const progress = step / laps;
        this.time.delayedCall(45 + 260 * progress * progress * progress, tick);
      } else {
        this.time.delayedCall(260, () => this.reveal(CHARACTER_BY_ID[pick]));
      }
    };
    tick();
  }

  reveal(character) {
    const layer = this.add.container(0, 0).setDepth(100);
    layer.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, hex(UI.ink), 0.7).setOrigin(0).setInteractive());
    const W = 1100;
    const H = 640;
    const x0 = (GAME_WIDTH - W) / 2;
    const y0 = (GAME_HEIGHT - H) / 2 - 20;
    layer.add(panel(this, x0, y0, W, H, 'card-white'));
    layer.add(panel(this, x0, y0, W, 90, `band-${character.color}`));
    const light = ['yellow', 'cyan', 'green', 'coral'].includes(character.color);
    const heading = this.add.text(GAME_WIDTH / 2, y0 + 45, 'YOUR ROLE', textStyle({ size: 40, font: 'display', color: light ? UI.ink : UI.white, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 8 })).setOrigin(0.5);
    layer.add(heading);

    // role reveal
    const disc = this.add.image(x0 + 220, y0 + 290, 'ui', `badge-${character.color}`).setScale(0);
    const portrait = this.add.image(x0 + 220, y0 + 294, 'portraits', character.portrait).setScale(0);
    const name = this.add.text(x0 + 420, y0 + 150, character.name.toUpperCase(), textStyle({ size: 54, font: 'display', color: UI.violetDeep })).setAlpha(0);
    const role = this.add.text(x0 + 422, y0 + 222, character.role, textStyle({ size: 26, weight: '800', color: UI.inkSoft })).setAlpha(0);
    layer.add([disc, portrait, name, role]);
    this.tweens.add({ targets: disc, scale: 16, duration: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: portrait, scale: 5, duration: 420, delay: 120, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [name, role], alpha: 1, x: '+=10', duration: 300, delay: 300 });
    bus.emit('sfx', 'reveal');

    // ability reveal
    const box = panel(this, x0 + 410, y0 + 290, W - 450, 200, 'card-inset').setAlpha(0);
    const abIcon = this.add.image(x0 + 480, y0 + 360, 'icons', character.ability.icon).setScale(0);
    const abLabel = this.add.text(x0 + 540, y0 + 312, 'SPECIAL ABILITY', textStyle({ size: 20, weight: '900', color: UI.violetDeep })).setAlpha(0);
    const abName = this.add.text(x0 + 540, y0 + 340, character.ability.name.toUpperCase(), textStyle({ size: 32, weight: '900', wrap: W - 600 })).setAlpha(0);
    const abText = this.add.text(x0 + 440, y0 + 410, character.ability.description, textStyle({ size: 19, weight: '700', color: UI.inkSoft, wrap: W - 500 })).setAlpha(0);
    layer.add([box, abIcon, abLabel, abName, abText]);
    this.time.delayedCall(700, () => {
      bus.emit('sfx', 'ability');
      this.tweens.add({ targets: box, alpha: 1, duration: 200 });
      this.tweens.add({ targets: abIcon, scale: 3, angle: { from: -180, to: 0 }, duration: 520, ease: 'Back.easeOut' });
      this.tweens.add({ targets: [abLabel, abName, abText], alpha: 1, duration: 300, delay: 200 });
      confetti(this, GAME_WIDTH / 2, y0 + 120, { count: 40, depth: 101 });
    });

    const focus = new FocusGroup(this, {});
    const again = new Button(this, GAME_WIDTH / 2 - 190, y0 + H - 60, { text: 'SPIN AGAIN', width: 320, height: 80, color: 'magenta', iconFrame: 'ui-dice', size: 28, sfx: 'dice', onClick: () => { focus.destroy(); layer.destroy(); this.busy = false; this.focus.enabled = true; this.randomCharacter(); } });
    const go = new Button(this, GAME_WIDTH / 2 + 190, y0 + H - 60, { text: 'CONTINUE', width: 320, height: 80, color: 'teal', iconFrame: 'ui-play', size: 30, onClick: () => { focus.destroy(); session.character = character.id; transitionTo(this, 'scenario'); } });
    layer.add([again, go]);
    again.setAlpha(0);
    go.setAlpha(0);
    this.time.delayedCall(1100, () => {
      this.tweens.add({ targets: [again, go], alpha: 1, duration: 250 });
      focus.add(again);
      focus.add(go);
      focus.focusItem(go);
      if (isExhibition()) this.time.delayedCall(5000, () => { if (layer.active && !this._leaving) go.activate(); });
    });
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.backdrop.update(dt);
    this.idle?.update(dt);
  }
}
