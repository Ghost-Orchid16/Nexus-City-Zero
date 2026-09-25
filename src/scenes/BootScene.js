import Phaser from 'phaser';
import { FONT_FACES } from '../ui/theme.js';

/** Waits for bundled fonts, then hands over to the preloader. */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const fonts = document.fonts ? Promise.all(FONT_FACES.map((f) => document.fonts.load(f))) : Promise.resolve();
    // Never block forever on a font: fall back after 3 s.
    const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
    Promise.race([fonts, timeout]).then(() => {
      document.getElementById('boot-splash')?.classList.add('hidden');
      this.scene.start('title');
    });
  }
}
