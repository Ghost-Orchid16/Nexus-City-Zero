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
      // `?test&start=<scene>` lets automated tests and visual QA jump straight to a screen.
      const params = new URLSearchParams(window.location.search);
      if ((params.has('test') || params.has('debug')) && params.get('start')) this.registry.set('startScene', params.get('start'));
      this.scene.start('preload');
    });
  }
}
