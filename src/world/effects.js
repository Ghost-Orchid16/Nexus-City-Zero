// Hazards, alert pins, ambient emitters, weather and feedback bursts on the city map.
// The simulation hands over lists; this module diffs them against what is on screen.
import Phaser from 'phaser';
import { HOTSPOTS, ROAD_SPOTS, DISTRICT_BY_ID } from '../data/city-layout.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/layout.js';
import { DEPTH, depthFor, anchorBottom } from './depth.js';

const PIN_FRAMES = { critical: 'pin-critical', warning: 'pin-warning', info: 'pin-info', health: 'pin-health', power: 'pin-power' };
const BURST_FRAMES = {
  repair: ['mini-wrench'], health: ['mini-plus'], energy: ['mini-bolt'], water: ['mini-drop'],
  supplies: ['mini-box'], good: ['sparkle-0', 'sparkle-1', 'sparkle-2'], bad: ['smoke-0', 'smoke-1']
};

export class CityEffects {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.hazards = new Map();
    this.pins = new Map();
    this.emitters = [];
    this.reducedMotion = false;
  }

  build() {
    const s = this.scene;
    // chimney smoke from the smokestack and power plant, steam for the reactor (off until active)
    this.stackSmoke = this._smoke(660, 210, 'smoke', { frequency: 260 });
    this.plantSteam = this._smoke(186, 236, 'steam', { frequency: 700, scale: { start: 0.6, end: 1.3 } });
    this.reactorSteam = this._smoke(272, 229, 'steam', { frequency: 180, scale: { start: 1, end: 2.4 } });
    this.reactorSteam.stop();
    // drifting cloud shadows
    this.cloudShadows = [];
    for (let i = 0; i < 3; i++) {
      const c = s.add.image(this.rng.float(0, WORLD_WIDTH), this.rng.float(40, WORLD_HEIGHT - 60), 'clouds', `cloud-${i % 4}`);
      c.setScale(2.4).setTint(0x2b1d5c).setAlpha(0.1).setDepth(DEPTH.cloudShadow);
      this.cloudShadows.push({ img: c, speed: 3 + this.rng.next() * 3 });
    }
    // weather
    this.rain = s.add.particles(0, 0, 'effects', {
      frame: 'rain', x: { min: -40, max: WORLD_WIDTH }, y: -10, lifespan: 1700, speedY: { min: 190, max: 250 },
      speedX: { min: 30, max: 50 }, alpha: { start: 0.9, end: 0.5 }, quantity: 3, frequency: 25, emitting: false
    }).setDepth(DEPTH.weather);
    this.flash = s.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0xffffff, 0).setOrigin(0).setDepth(DEPTH.weather + 1);
    this.flash.setBlendMode(Phaser.BlendModes.ADD);
  }

  _smoke(x, y, kind, extra = {}) {
    const e = this.scene.add.particles(x, y, 'effects', {
      frame: [`${kind}-0`, `${kind}-1`, `${kind}-2`],
      lifespan: 3200, speedY: { min: -16, max: -9 }, speedX: { min: 3, max: 9 },
      scale: { start: 0.8, end: 1.8 }, alpha: { start: kind === 'smoke' ? 0.85 : 0.7, end: 0 },
      rotate: { min: -10, max: 10 }, frequency: 400, ...extra
    });
    e.setDepth(DEPTH.smoke);
    this.emitters.push(e);
    return e;
  }

  setIndustry(level) {
    this.stackSmoke.frequency = Math.round(900 - (level / 100) * 700);
  }

  setReactor(active) {
    if (active && !this.reactorSteam.emitting) this.reactorSteam.start();
    if (!active && this.reactorSteam.emitting) this.reactorSteam.stop();
  }

  // ----------------------------------------------------------- hazards
  setHazards(list) {
    const wanted = new Set(list.map((h) => `${h.district}:${h.type}`));
    for (const [key, objs] of this.hazards) {
      if (!wanted.has(key)) {
        for (const o of objs) this._fadeOut(o);
        this.hazards.delete(key);
      }
    }
    for (const h of list) {
      const key = `${h.district}:${h.type}`;
      if (!this.hazards.has(key)) this.hazards.set(key, this._spawnHazard(h.district, h.type));
    }
  }

  _fadeOut(o) {
    if (o.stop) o.stop();
    this.scene.tweens.add({ targets: o, alpha: 0, duration: 700, onComplete: () => o.destroy() });
  }

  _spawnHazard(district, type) {
    const s = this.scene;
    const spots = HOTSPOTS[district];
    const [x, y] = spots[0];
    const objs = [];
    const pop = (o) => { o.setAlpha(0); s.tweens.add({ targets: o, alpha: 1, duration: 500 }); objs.push(o); return o; };
    switch (type) {
      case 'fire': {
        for (const [fx, fy] of spots.slice(0, 2)) {
          // hazards sit on building fronts, so they draw above the world objects
          pop(anchorBottom(s.add.sprite(fx, fy, 'effects', 'fire-0').play('fire')).setDepth(DEPTH.overlay + fy));
          const glow = pop(s.add.image(fx, fy - 6, 'effects', 'glow-red-32').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.overlay + fy + 0.5));
          s.tweens.add({ targets: glow, scale: { from: 0.9, to: 1.2 }, yoyo: true, repeat: -1, duration: 260 });
        }
        objs.push(this._smoke(x, y - 16, 'smoke', { frequency: 160 }));
        break;
      }
      case 'smoke':
        objs.push(this._smoke(x, y - 8, 'smoke', { frequency: 200 }));
        break;
      case 'toxic':
        objs.push(this._smoke(x, y - 6, 'toxic', { frequency: 220, speedX: { min: -8, max: 8 }, lifespan: 4200 }));
        break;
      case 'flood':
        for (const [fx, fy] of spots) {
          pop(s.add.sprite(fx + this.rng.int(-6, 6), fy + 6, 'effects', 'puddle-0').play('puddle').setDepth(DEPTH.decal));
          pop(anchorBottom(s.add.sprite(fx, fy + 4, 'effects', 'splash-0').play('splash')).setDepth(DEPTH.overlay + fy));
        }
        break;
      case 'glitch':
        for (const [fx, fy] of spots.slice(0, 2)) {
          const g = pop(s.add.sprite(fx, fy - 10, 'effects', 'glitch-0').play('glitch').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.markers - 1));
          s.tweens.add({ targets: g, x: fx + 3, yoyo: true, repeat: -1, duration: 90, ease: 'Stepped' });
        }
        break;
      case 'sparks':
        for (const [fx, fy] of spots.slice(0, 2)) {
          pop(s.add.sprite(fx, fy - 8, 'effects', 'spark-0').play('spark').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.markers - 1));
        }
        break;
      case 'crack': {
        const [rx, ry] = ROAD_SPOTS[district];
        pop(s.add.image(rx, ry, 'effects', 'crack-1').setDepth(DEPTH.decal));
        pop(s.add.image(rx + 14, ry + 6, 'effects', 'crack-2').setDepth(DEPTH.decal));
        pop(anchorBottom(s.add.image(rx - 8, ry + 8, 'city', 'barrier')).setDepth(depthFor(ry + 8)));
        pop(anchorBottom(s.add.image(rx + 22, ry + 9, 'city', 'cone')).setDepth(depthFor(ry + 9)));
        break;
      }
      case 'outage':
        pop(anchorBottom(s.add.sprite(x, y - 20, 'effects', 'beacon-red-0').play('beacon-red')).setDepth(DEPTH.markers - 2));
        break;
      default:
        throw new Error(`Unknown hazard type: ${type}`);
    }
    return objs;
  }

  // ----------------------------------------------------------- pins
  setPins(list) {
    const wanted = new Map(list.map((p) => [p.district, p.kind]));
    for (const [district, pin] of this.pins) {
      if (wanted.get(district) !== pin.kind) {
        this._fadeOut(pin.img);
        this.pins.delete(district);
      }
    }
    for (const [district, kind] of wanted) {
      if (this.pins.has(district)) continue;
      const d = DISTRICT_BY_ID[district];
      const img = this.scene.add.image(d.center.x, d.rect.y + 14, 'effects', PIN_FRAMES[kind]).setOrigin(0.5, 1).setDepth(DEPTH.markers);
      img.setAlpha(0);
      this.scene.tweens.add({ targets: img, alpha: 1, duration: 300 });
      if (!this.reducedMotion) this.scene.tweens.add({ targets: img, y: img.y - 4, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
      this.pins.set(district, { img, kind });
    }
  }

  // ----------------------------------------------------------- feedback bursts
  burst(district, kind, count = 8) {
    const d = DISTRICT_BY_ID[district];
    const [x, y] = HOTSPOTS[district][0];
    const e = this.scene.add.particles(x || d.center.x, (y || d.center.y) - 6, 'effects', {
      frame: BURST_FRAMES[kind], lifespan: 1400, speedY: { min: -38, max: -18 }, speedX: { min: -14, max: 14 },
      alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.8 }, emitting: false
    }).setDepth(DEPTH.fx);
    e.explode(count);
    this.scene.time.delayedCall(1600, () => e.destroy());
  }

  // ----------------------------------------------------------- weather
  setRain(on) {
    if (on && !this.rain.emitting) this.rain.start();
    if (!on && this.rain.emitting) this.rain.stop();
  }

  lightning() {
    const s = this.scene;
    const x = this.rng.float(160, WORLD_WIDTH - 60);
    const bolt = s.add.sprite(x, this.rng.float(60, 200), 'effects', 'lightning-0').play('lightning').setDepth(DEPTH.weather + 2).setBlendMode(Phaser.BlendModes.ADD);
    bolt.setScale(1.6);
    this.flash.setAlpha(this.reducedMotion ? 0.12 : 0.35);
    s.tweens.add({ targets: this.flash, alpha: 0, duration: 380 });
    s.time.delayedCall(220, () => bolt.destroy());
  }

  update(dt) {
    for (const c of this.cloudShadows) {
      c.img.x += c.speed * dt;
      if (c.img.x > WORLD_WIDTH + 120) {
        c.img.x = -120;
        c.img.y = this.rng.float(40, WORLD_HEIGHT - 60);
      }
    }
  }
}
