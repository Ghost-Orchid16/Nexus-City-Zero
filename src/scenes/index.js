import BootScene from './BootScene.js';
import PreloadScene from './PreloadScene.js';
import TitleScene from './TitleScene.js';
import CharacterScene from './CharacterScene.js';
import ScenarioScene from './ScenarioScene.js';
import GameScene from './GameScene.js';
import HudScene from './HudScene.js';
import ResultsScene from './ResultsScene.js';
import TimelineScene from './TimelineScene.js';
import HallScene from './HallScene.js';
import SettingsScene from './SettingsScene.js';

/**
 * Scene order: the first entry boots automatically. Later entries render on top, so the HUD sits
 * above the world and Settings above everything.
 */
export const SCENES = [BootScene, PreloadScene, TitleScene, CharacterScene, ScenarioScene, GameScene, HudScene, ResultsScene, TimelineScene, HallScene, SettingsScene];
