// Parallax golden-hour skyline shared by the menu screens.
import { GAME_WIDTH, GAME_HEIGHT, PX } from '../config/layout.js';

const LAYERS = [
  { key: 'mountains', y: 160, speed: 1.5 },
  { key: 'skyline-far', y: 150, speed: 3 },
  { key: 'skyline-mid', y: 130, speed: 6 },
  { key: 'skyline-near', y: 250, speed: 12 }
];

export class Backdrop {
  constructor(scene, { tint = 0xffffff, speed = 1 } = {}) {
    this.scene = scene;
    this.speed = speed;
    this.sky = scene.add.image(0, 0, 'sky').setOrigin(0).setScale(PX).setTint(tint);
    this.clouds = [];
    const cloudSpots = [[140, 70], [900, 130], [1500, 60], [1900, 170]];
    cloudSpots.forEach(([x, y], i) => {
      const c = scene.add.image(x, y, 'clouds', `cloud-${i % 4}`).setScale(PX).setTint(tint);
      this.clouds.push({ img: c, v: 8 + i * 3 });
    });
    this.layers = LAYERS.map((l) => {
      const tex = scene.textures.get(l.key).getSourceImage();
      const ts = scene.add.tileSprite(0, l.y * PX, GAME_WIDTH / PX, tex.height, l.key).setOrigin(0).setScale(PX).setTint(tint);
      return { ts, speed: l.speed };
    });
    this.height = GAME_HEIGHT;
  }

  setTint(t) {
    this.sky.setTint(t);
    for (const c of this.clouds) c.img.setTint(t);
    for (const l of this.layers) l.ts.setTint(t);
  }

  update(dt) {
    for (const l of this.layers) l.ts.tilePositionX += l.speed * this.speed * dt;
    for (const c of this.clouds) {
      c.img.x += c.v * this.speed * dt;
      if (c.img.x > GAME_WIDTH + 200) c.img.x = -200;
    }
  }
}
