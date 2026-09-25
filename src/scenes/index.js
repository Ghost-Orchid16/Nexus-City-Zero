import BootScene from './BootScene.js';
import PreloadScene from './PreloadScene.js';
import TitleScene from './TitleScene.js';
import GameScene from './GameScene.js';

/** Scene order: the first entry boots automatically. */
export const SCENES = [BootScene, PreloadScene, TitleScene, GameScene];
