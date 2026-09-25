import Phaser from 'phaser';
import { CityView } from '../world/city-view.js';
import { exposeDebug } from '../core/debug.js';

const DEMO_LEVELS = { energy: 72, water: 70, health: 74, transport: 68, infrastructure: 71, safety: 76, communication: 70, supplies: 69, budget: 60 };

/** World scene: the living city. The HUD runs in a parallel scene (HudScene). */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('game');
  }

  init(data) {
    this.runData = data || {};
  }

  create() {
    this.city = new CityView(this, { seed: this.runData.seed ?? 7 }).build();
    this.city.applyState({ levels: { ...DEMO_LEVELS }, stability: 72, night: 0.2, hazards: [], pins: [] });
    exposeDebug('city', this.city);
  }

  update(time, delta) {
    this.city.update(time, delta);
  }
}
