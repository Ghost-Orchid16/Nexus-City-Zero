// Character card: PORTRAIT · NAME · ROLE · STRENGTHS · WEAKNESS · SPECIAL ABILITY · [SELECT]
// Laid out bottom-up: the SELECT button and the ability box are fixed at the bottom, and the
// upper text shrinks a step if a role's description would not fit.
import Phaser from 'phaser';
import { UI } from '../config/palette.js';
import { textStyle } from './theme.js';
import { panel, Button } from './components.js';

export const CARD_W = 256;
export const CARD_H = 790;

const LIGHT = ['yellow', 'cyan', 'green', 'coral'];

export class CharacterCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, character, { onSelect, width = CARD_W, height = CARD_H } = {}) {
    super(scene, x, y);
    this.character = character;
    this.onSelect = onSelect;
    const w = width;
    const pad = 16;
    const c = character;
    const top = -height / 2;
    const left = -w / 2;

    this.glow = panel(scene, left - 14, top - 14, w + 28, height + 28, 'select-gold').setVisible(false);
    this.body = panel(scene, left, top, w, height, 'card-white');
    this.add([this.glow, this.body]);

    // header band with the role name
    this.add(panel(scene, left, top, w, 72, `band-${c.color}`));
    const light = LIGHT.includes(c.color);
    this.add(scene.add.text(0, top + 36, c.name.toUpperCase(), textStyle({ size: 25, font: 'display', color: light ? UI.ink : UI.white, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 6, align: 'center', wrap: w - 24, lineSpacing: -6 })).setOrigin(0.5));

    // portrait on a colored disc
    const py = top + 158;
    this.add(scene.add.image(0, py, 'ui', `badge-${c.color}`).setScale(10));
    this.portrait = scene.add.image(0, py + 2, 'portraits', c.portrait).setScale(3);
    this.add(this.portrait);

    // bottom: SELECT button + special ability box (measured first)
    const selectY = top + height - 46;
    const boxBottom = selectY - 44;
    const abLabel = scene.add.text(left + 74, 0, 'SPECIAL ABILITY', textStyle({ size: 14, weight: '900', color: UI.violetDeep })).setOrigin(0, 0.5);
    const abName = scene.add.text(left + pad + 6, 0, c.ability.name.toUpperCase(), textStyle({ size: 17, weight: '900', wrap: w - 2 * pad - 12, lineSpacing: -3 }));
    const abShort = scene.add.text(left + pad + 6, 0, c.ability.short, textStyle({ size: 16, weight: '700', color: UI.inkSoft, wrap: w - 2 * pad - 12, lineSpacing: -2 }));
    const boxH = 58 + abName.height + 4 + abShort.height + 12;
    const boxTop = boxBottom - boxH;
    this.add(panel(scene, left + 10, boxTop, w - 20, boxH, 'card-inset'));
    this.add(scene.add.image(left + 40, boxTop + 30, 'icons', c.ability.icon).setScale(2));
    abLabel.setY(boxTop + 30);
    abName.setY(boxTop + 56);
    abShort.setY(boxTop + 56 + abName.height + 4);
    this.add([abLabel, abName, abShort]);

    // upper text: role, strengths, weakness (auto-fit above the ability box)
    const upper = scene.add.container(0, 0);
    this.add(upper);
    const build = (size) => {
      upper.removeAll(true);
      let cy = top + 252;
      const roleText = scene.add.text(0, cy, c.role, textStyle({ size: size + 1, weight: '800', color: UI.inkSoft, align: 'center', wrap: w - 2 * pad })).setOrigin(0.5, 0);
      upper.add(roleText);
      cy += roleText.height + 12;
      const section = (iconFrame, title, color) => {
        upper.add(scene.add.image(left + pad + 10, cy + 11, 'icons', iconFrame).setScale(1.5));
        upper.add(scene.add.text(left + pad + 26, cy + 11, title, textStyle({ size: 16, weight: '900', color })).setOrigin(0, 0.5));
        cy += 27;
      };
      section('ui-check', 'STRENGTHS', UI.teal);
      for (const s of c.strengths) {
        const t = scene.add.text(left + pad, cy, `• ${s}`, textStyle({ size, weight: '700', wrap: w - 2 * pad, lineSpacing: -2 }));
        upper.add(t);
        cy += t.height + 3;
      }
      cy += 6;
      section('ui-cross', 'WEAKNESS', UI.red);
      const weak = scene.add.text(left + pad, cy, c.weakness, textStyle({ size, weight: '700', wrap: w - 2 * pad, lineSpacing: -2 }));
      upper.add(weak);
      return cy + weak.height;
    };
    for (const size of [17, 16, 15, 14]) if (build(size) <= boxTop - 8) break;

    const btnColor = { yellow: 'orange', cyan: 'blue' }[c.color] || c.color;
    this.select = new Button(scene, 0, selectY, { text: 'SELECT', width: w - 36, height: 68, color: btnColor, size: 30, sfx: 'select', onClick: () => this.activate() });
    this.add(this.select);

    this.setSize(w, height);
    this.body.setInteractive({ useHandCursor: true });
    this.body.on('pointerover', () => this.emit('hover', this));
    this.body.on('pointerup', () => this.emit('hover', this));
    this.select.on('hover', () => this.emit('hover', this));
    scene.add.existing(this);
  }

  setFocus(on) {
    this.focused = on;
    this.glow.setVisible(on);
    this.setDepth(on ? 5 : 1);
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: on ? 1.035 : 1, y: on ? this.baseY - 6 : this.baseY, duration: 160, ease: 'Back.easeOut' });
  }

  activate() {
    this.onSelect?.(this.character, this);
  }
}
