import Phaser from 'phaser';
import { ATLASES, IMAGES, SPRITESHEETS } from '../assets.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { textStyle } from '../ui/theme.js';
import { registerAnims } from '../world/anims.js';

/** Loads every atlas/image with a chunky progress bar, then registers animations. */
export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, hex(UI.hudLight)).setOrigin(0);
    this.add.text(cx, cy - 90, 'NEXUS: CITY ZERO', textStyle({ size: 72, font: 'display', color: UI.yellow, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5);
    const frame = this.add.rectangle(cx, cy + 20, 720, 44, hex(UI.ink)).setStrokeStyle(6, hex(UI.paper));
    frame.setRounded(12);
    const fill = this.add.rectangle(cx - 350, cy + 20, 0, 28, hex(UI.teal)).setOrigin(0, 0.5);
    fill.setRounded(8);
    const label = this.add.text(cx, cy + 80, 'Preparing the city…', textStyle({ size: 28, color: UI.paper })).setOrigin(0.5);
    this.load.on('progress', (p) => { fill.width = Math.max(1, 700 * p); });
    this.load.on('loaderror', (file) => label.setText(`Could not load ${file.key}`).setColor(UI.redLight));

    for (const a of ATLASES) this.load.atlas(a.key, a.png, a.json);
    for (const i of IMAGES) this.load.image(i.key, i.url);
    for (const s of SPRITESHEETS) this.load.spritesheet(s.key, s.url, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  }

  create() {
    registerAnims(this);
    this.scene.start(this.registry.get('startScene') || 'title');
  }
}
