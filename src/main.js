import Phaser from 'phaser';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';

import { GAME_WIDTH, GAME_HEIGHT } from './config/layout.js';
import { SCENES } from './scenes/index.js';
import { installDebugHooks } from './core/debug.js';

const config = {
  type: Phaser.WEBGL,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#3f3570',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    // Crisp scaled pixels with smooth edges; safe under camera zoom (see Phaser 4 Pixel Art Guide).
    smoothPixelArt: true,
    powerPreference: 'high-performance'
  },
  input: { activePointers: 2 },
  // Automated tests render with a software GPU at a few frames per second; raw deltas keep
  // their game time in step with the wall clock (smoothing would turn slow frames into slow-mo).
  fps: { smoothStep: !new URLSearchParams(window.location.search).has('test') },
  disableContextMenu: true,
  scene: SCENES
};

const game = new Phaser.Game(config);

/**
 * The canvas is CSS-scaled by Scale.FIT. At exact integer device scales (e.g. 1080p art on a 4K
 * panel) nearest-neighbour keeps pixel art perfectly sharp; at fractional scales smooth resampling
 * avoids uneven pixel rows.
 */
function updateCanvasRendering() {
  const canvas = game.canvas;
  if (!canvas) return;
  const deviceScale = (canvas.getBoundingClientRect().width / GAME_WIDTH) * (window.devicePixelRatio || 1);
  const nearInteger = Math.abs(deviceScale - Math.round(deviceScale)) < 0.02 && Math.round(deviceScale) >= 2;
  canvas.style.imageRendering = nearInteger ? 'pixelated' : 'auto';
}

game.events.once(Phaser.Core.Events.READY, () => {
  updateCanvasRendering();
  game.scale.on(Phaser.Scale.Events.RESIZE, updateCanvasRendering);
  window.addEventListener('resize', updateCanvasRendering);
});

installDebugHooks(game);

export default game;
