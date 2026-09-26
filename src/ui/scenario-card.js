// Scenario card: ICON · NAME · SHORT DESCRIPTION · DIFFICULTY · MAIN SYSTEMS AFFECTED
import Phaser from 'phaser';
import { UI } from '../config/palette.js';
import { textStyle } from './theme.js';
import { panel } from './components.js';
import { stars, systemBadges } from './widgets.js';

export const SCN_W = 348;
export const SCN_H = 380;

export class ScenarioCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, scenario, { onPick } = {}) {
    super(scene, x, y);
    this.scenario = scenario;
    this.onPick = onPick;
    const w = SCN_W;
    const h = SCN_H;
    const left = -w / 2;
    const top = -h / 2;
    const s = scenario;

    this.glow = panel(scene, left - 14, top - 14, w + 28, h + 28, 'select-gold').setVisible(false);
    this.body = panel(scene, left, top, w, h, s.chaos ? 'card' : 'card-white');
    this.add([this.glow, this.body]);
    this.add(panel(scene, left, top, w, 70, `band-${s.color}`));
    const light = ['yellow', 'cyan', 'green', 'coral', 'blue'].includes(s.color);
    this.add(scene.add.text(0, top + 35, s.name.toUpperCase(), textStyle({ size: 25, font: 'display', color: light ? UI.ink : UI.white, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 6, align: 'center', wrap: w - 24, lineSpacing: -6 })).setOrigin(0.5));

    // icon + difficulty
    this.icon = scene.add.image(left + 70, top + 128, 'icons', s.icon).setScale(4);
    this.add(this.icon);
    this.add(scene.add.text(left + 140, top + 96, 'DIFFICULTY', textStyle({ size: 15, weight: '900', color: UI.inkSoft })));
    this.add(stars(scene, left + 140, top + 134, s.difficulty, 5, { scale: 2, gap: 4 }));

    this.add(scene.add.text(left + 18, top + 186, s.description, textStyle({ size: 17, weight: '700', wrap: w - 36, lineSpacing: -1 })));

    // main systems affected
    this.add(scene.add.text(left + 18, top + h - 72, 'MAIN SYSTEMS AFFECTED', textStyle({ size: 14, weight: '900', color: UI.inkSoft })));
    if (s.systems.length) {
      this.add(systemBadges(scene, left + 18, top + h - 30, s.systems, { scale: 2.5, gap: 8 }));
    } else {
      this.add(scene.add.text(left + 18, top + h - 30, '??? · two crises + a twist', textStyle({ size: 20, weight: '900', color: UI.magenta })).setOrigin(0, 0.5));
    }

    this.setSize(w, h);
    this.body.setInteractive({ useHandCursor: true });
    this.body.on('pointerover', () => this.emit('hover', this));
    this.body.on('pointerup', () => {
      if (this.focused) this.activate();
      else this.emit('hover', this);
    });
    scene.add.existing(this);
  }

  setFocus(on) {
    this.focused = on;
    this.glow.setVisible(on);
    this.setDepth(on ? 5 : 1);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: on ? 1.04 : 1, duration: 160, ease: 'Back.easeOut' });
    if (on) this.emit('focused', this);
  }

  activate() {
    this.onPick?.(this.scenario, this);
  }
}
