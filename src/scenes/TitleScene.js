import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { textStyle } from '../ui/theme.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.add.gradient({
      bands: [{ start: 0, end: 1, colorStart: hex('#6fb0ff'), colorEnd: hex('#ff9f45') }],
      start: { x: 0.5, y: 0 },
      shape: { x: 0, y: 1 }
    }, 0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0);

    const card = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 1100, 360, hex(UI.paper)).setStrokeStyle(8, hex(UI.ink));
    card.setRounded(28);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'NEXUS: CITY ZERO', textStyle({ size: 110, font: 'display', color: UI.violetDeep })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, 'SAVE THE CITY BEFORE IT COLLAPSES', textStyle({ size: 40, color: UI.orangeDeep, weight: '900' })).setOrigin(0.5);
  }
}
