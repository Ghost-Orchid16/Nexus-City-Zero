// The living city: builds every world object from the shared layout and turns simulation
// state into visible reactions (blackouts, dry reservoir, traffic jams, repair crews, …).
import Phaser from 'phaser';
import { STRUCTURES, PROPS, TREES, LAMPS, TILE } from '../data/city-layout.js';
import { WORLD_WIDTH, WORLD_HEIGHT, GAME_WIDTH, GAME_HEIGHT, CITY_VIEW, HUD } from '../config/layout.js';
import { DEPTH, depthFor, anchorBottom } from './depth.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { CityEffects } from './effects.js';
import { RNG } from '../core/rng.js';

/** Districts lose power in this order as energy falls (the hospital has backup generators). */
const BLACKOUT_ORDER = ['downtown', 'residential', 'industrial', 'transport', 'water', 'command', 'energy', 'medical'];

export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** How many districts are dark at a given energy level. */
export function darkDistrictCount(energy, shielded = false) {
  if (shielded) return 0;
  if (energy >= 55) return 0;
  if (energy >= 42) return 1;
  if (energy >= 30) return 2;
  if (energy >= 20) return 4;
  if (energy >= 10) return 6;
  return 7;
}

export class CityView {
  constructor(scene, { seed = 7, ambientLife = true } = {}) {
    this.scene = scene;
    this.rng = new RNG(`city-visuals:${seed}`);
    this.ambientLife = ambientLife;
    this.tintables = [];
    this.lights = [];
    this.lampGlows = [];
    this.byDistrict = new Map();
    this.state = null;
    this.powered = new Set(BLACKOUT_ORDER);
    this.night = 0;
    this.stability = 70;
  }

  build() {
    const s = this.scene;
    this.ground = s.add.image(0, 0, 'ground').setOrigin(0).setDepth(DEPTH.ground);
    this.water = s.add.sprite(0, 0, 'water', 0).setOrigin(0).setDepth(DEPTH.water).play('water-flow');
    this.tintables.push(this.ground, this.water);

    for (const st of STRUCTURES) this._buildStructure(st);
    for (const p of PROPS) this._buildProp(p);
    for (const t of TREES) {
      const img = anchorBottom(s.add.image(t.x, t.y, 'city', t.key)).setDepth(depthFor(t.y));
      this.tintables.push(img);
      if (t.key !== 'tree-bush') {
        const sh = s.add.image(t.x + 3, t.y - 1, 'city', 'shadow-s').setAlpha(0.22).setDepth(DEPTH.shadow);
        this.tintables.push(sh);
      }
    }
    for (const l of LAMPS) {
      const lamp = anchorBottom(s.add.image(l.x, l.y, 'city', 'streetlamp')).setDepth(depthFor(l.y));
      const glow = s.add.image(l.x - 1, l.y - 18, 'effects', 'glow-warm-32').setBlendMode(Phaser.BlendModes.ADD).setDepth(depthFor(l.y) + 0.2).setAlpha(0);
      const pool = s.add.image(l.x, l.y + 2, 'effects', 'glow-warm-64').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.shadow + 0.5).setAlpha(0).setScale(0.6, 0.3);
      this.tintables.push(lamp);
      this.lampGlows.push({ glow, pool });
    }
    this._buildTrain();

    this.effects = new CityEffects(s, this.rng.fork('fx'));
    this.effects.build();
    if (this.ambientLife) {
      this.traffic = new Traffic(s, this.rng.fork('traffic'));
      this.people = new Pedestrians(s, this.rng.fork('people'));
    }
    this.setView();
    return this;
  }

  _register(district, obj) {
    if (!this.byDistrict.has(district)) this.byDistrict.set(district, []);
    this.byDistrict.get(district).push(obj);
  }

  _buildStructure(st) {
    const s = this.scene;
    const depth = depthFor(st.y);
    if (st.key === 'reservoir') {
      const basin = anchorBottom(s.add.image(st.x, st.y, 'buildings', 'reservoir')).setDepth(DEPTH.decal + 0.5);
      const left = basin.x - basin.displayOriginX;
      const top = basin.y - basin.displayOriginY;
      this.reservoirWater = s.add.sprite(left + 4, top + 6, 'buildings', 'reservoir-water-0').setOrigin(0).setDepth(DEPTH.decal + 0.6).play('reservoir');
      this.tintables.push(basin, this.reservoirWater);
      return;
    }
    if (st.key === 'reactor') {
      this.reactorIdle = anchorBottom(s.add.image(st.x, st.y, 'buildings', 'reactor')).setDepth(depth);
      this.reactorActive = anchorBottom(s.add.image(st.x, st.y, 'buildings', 'reactor-active')).setDepth(depth).setVisible(false);
      this.reactorLights = anchorBottom(s.add.image(st.x, st.y, 'buildings', 'reactor-active-lights')).setDepth(depth + 0.1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.reactorGlow = s.add.image(st.x + 10, st.y - 44, 'effects', 'glow-teal-64').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.smoke - 1).setAlpha(0).setScale(1.2);
      this.tintables.push(this.reactorIdle, this.reactorActive);
      this._shadow(st.x, st.y, this.reactorIdle.width);
      return;
    }
    const frameKey = st.anim ? `${st.key}-0` : st.key;
    const obj = anchorBottom(st.anim ? s.add.sprite(st.x, st.y, 'buildings', frameKey).play(st.anim) : s.add.image(st.x, st.y, 'buildings', frameKey));
    obj.setDepth(st.anim === 'clarifier' ? DEPTH.decal + 0.5 : depth);
    this.tintables.push(obj);
    this._register(st.district, obj);
    if (st.anim === 'clarifier') (this.clarifiers ||= []).push(obj);
    if (!st.anim) this._shadow(st.x, st.y, obj.width);
    if (st.lights) {
      const lights = anchorBottom(s.add.image(st.x, st.y, 'buildings', `${st.key}-lights`)).setDepth(depth + 0.1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.3);
      this.lights.push({ img: lights, district: st.district, target: 0.3 });
    }
  }

  _shadow(x, y, w) {
    const sh = this.scene.add.image(x + 4, y - 1, 'city', 'shadow-l').setOrigin(0.5, 0.5).setAlpha(0.2).setDepth(DEPTH.shadow);
    sh.setScale(Math.max(0.4, (w + 6) / 48), 0.7);
    this.tintables.push(sh);
  }

  _buildProp(p) {
    const s = this.scene;
    let obj;
    if (p.anim) {
      const first = { fountain: 'fountain-0', turbine: 'wind-turbine-0', radar: 'radar-0', boat: 'boat-0' }[p.anim] || `${p.key}-0`;
      obj = anchorBottom(s.add.sprite(p.x, p.y, 'city', first).play({ key: p.anim === 'fountain' && p.key === 'plaza-fountain' ? 'plaza-fountain' : p.anim, startFrame: this.rng.int(0, 1) }));
    } else {
      obj = anchorBottom(s.add.image(p.x, p.y, 'city', p.key));
    }
    const flat = ['pond', 'helipad-pad', 'solar-array', 'playground'].includes(p.key);
    obj.setDepth(flat ? DEPTH.decal + 0.4 : depthFor(p.y));
    this.tintables.push(obj);
    if (p.key === 'wind-turbine') (this.turbines ||= []).push(obj);
    if (p.anim === 'fountain') (this.fountains ||= []).push(obj);
    if (p.key === 'radar') this.radar = obj;
    if (p.key === 'boat') s.tweens.add({ targets: obj, x: p.x + 14, yoyo: true, repeat: -1, duration: 6000 + this.rng.int(0, 3000), ease: 'Sine.easeInOut' });
    if (p.key === 'mast') {
      const l = anchorBottom(s.add.image(p.x, p.y, 'city', 'mast-lights')).setBlendMode(Phaser.BlendModes.ADD).setDepth(depthFor(p.y) + 0.1);
      this.mastLights = l;
      s.tweens.add({ targets: l, alpha: { from: 1, to: 0.15 }, yoyo: true, repeat: -1, duration: 600 });
    }
    // flags beside the command center
    if (p.key === 'helipad-pad') {
      for (const [fx, fy] of [[380, 312], [388, 316]]) {
        const f = anchorBottom(s.add.sprite(fx, fy, 'city', 'flag-0').play({ key: 'flag', startFrame: fx % 2 })).setDepth(depthFor(fy));
        this.tintables.push(f);
      }
    }
  }

  _buildTrain() {
    const s = this.scene;
    this.train = s.add.container(-160, 22 * TILE + 13).setDepth(depthFor(22 * TILE + 13));
    const parts = ['train-loco', 'train-car', 'train-car', 'train-car'];
    parts.forEach((key, i) => {
      const img = s.add.image(-i * 31, 0, 'city', key).setOrigin(1, 1);
      this.train.add(img);
      this.tintables.push(img);
    });
    this.trainTimer = 4;
    this.trainRunning = false;
  }

  _runTrain(speedFactor) {
    this.trainRunning = true;
    this.train.x = -40;
    this.scene.tweens.add({
      targets: this.train, x: WORLD_WIDTH + 140, duration: 16000 / Math.max(0.35, speedFactor), ease: 'Linear',
      onComplete: () => { this.trainRunning = false; this.trainTimer = 14 + this.rng.int(0, 10); }
    });
  }

  // ---------------------------------------------------------------- camera
  /** Place world point P at screen point S with zoom z (camera scroll is center-based). */
  cameraFor(px, py, sx, sy, z) {
    return { scrollX: px - GAME_WIDTH / 2 - (sx - GAME_WIDTH / 2) / z, scrollY: py - GAME_HEIGHT / 2 - (sy - GAME_HEIGHT / 2) / z, zoom: z };
  }

  /** Clamp a camera target so the view never leaves the world. */
  _clampCam(t) {
    const viewW = GAME_WIDTH / t.zoom;
    const viewH = GAME_HEIGHT / t.zoom;
    const left = t.scrollX + GAME_WIDTH / 2 - viewW / 2;
    const top = t.scrollY + GAME_HEIGHT / 2 - viewH / 2;
    const cl = Phaser.Math.Clamp(left, 0, WORLD_WIDTH - viewW);
    const ct = Phaser.Math.Clamp(top, 0, WORLD_HEIGHT - viewH);
    return { scrollX: t.scrollX + (cl - left), scrollY: t.scrollY + (ct - top), zoom: t.zoom };
  }

  defaultCam() {
    const freeX = (HUD.leftPanelWidth + GAME_WIDTH) / 2;
    const freeY = (HUD.topBarHeight + GAME_HEIGHT) / 2;
    return this._clampCam(this.cameraFor(418, 204, freeX, freeY, CITY_VIEW.zoom));
  }

  setView(target = this.defaultCam()) {
    const cam = this.scene.cameras.main;
    cam.setZoom(target.zoom);
    cam.setScroll(target.scrollX, target.scrollY);
  }

  /** Smoothly frame a world point at a screen anchor (used when events strike a district). */
  focus(px, py, { zoom = CITY_VIEW.focusZoom, screenX, screenY = (HUD.topBarHeight + GAME_HEIGHT) / 2, duration = 900 } = {}) {
    const sx = screenX ?? (HUD.leftPanelWidth + GAME_WIDTH - HUD.eventCardWidth) / 2;
    const t = this._clampCam(this.cameraFor(px, py, sx, screenY, zoom));
    this._tweenCam(t, duration);
  }

  resetView(duration = 900) {
    this._tweenCam(this.defaultCam(), duration);
  }

  _tweenCam(t, duration) {
    const cam = this.scene.cameras.main;
    this.scene.tweens.killTweensOf(cam);
    this.scene.tweens.add({ targets: cam, scrollX: t.scrollX, scrollY: t.scrollY, zoom: t.zoom, duration, ease: 'Sine.easeInOut' });
  }

  // ---------------------------------------------------------------- state → visuals
  /**
   * @param {object} v
   * @param {Record<string, number>} v.levels 0..100 per system
   * @param {number} v.stability 0..100
   * @param {number} v.night 0..1
   */
  applyState(v) {
    const L = v.levels;
    this.state = v;
    this.stability = v.stability;
    // ---- ambient light (golden hour → dusk), cooler and dimmer as the night advances
    this.night = v.night;
    // Stays bright for most of the run; only the final minutes become a violet dusk.
    const dusk = lerpColor(0xffffff, 0x6e66b8, Math.pow(Math.min(1, v.night), 1.3) * 0.72);
    const crisis = v.stability < 35 ? lerpColor(dusk, 0xffa090, ((35 - v.stability) / 35) * 0.25) : dusk;
    if (crisis !== this.ambient) {
      this.ambient = crisis;
      for (const o of this.tintables) o.setTint(crisis);
      this.traffic?.setTint(crisis);
      this.people?.setTint(crisis);
    }
    // ---- power: districts go dark in priority order
    const dark = darkDistrictCount(L.energy, v.gridShield);
    const unpowered = new Set(BLACKOUT_ORDER.slice(0, dark));
    const lightStrength = 0.22 + 0.78 * Math.min(1, v.night * 1.15);
    for (const l of this.lights) {
      const target = unpowered.has(l.district) ? 0 : lightStrength;
      if (Math.abs(target - l.target) > 0.01) {
        const wasOn = l.target > 0.05;
        l.target = target;
        this.scene.tweens.killTweensOf(l.img);
        if (wasOn && target === 0) {
          // brownout flicker before the lights die
          this.scene.tweens.chain({ targets: l.img, tweens: [
            { alpha: 0.05, duration: 90 }, { alpha: 0.6, duration: 70 }, { alpha: 0.1, duration: 110 }, { alpha: 0, duration: 200 }
          ] });
        } else {
          this.scene.tweens.add({ targets: l.img, alpha: target, duration: 600 });
        }
      }
    }
    const lampsOn = L.energy >= 30 || v.gridShield;
    for (const lg of this.lampGlows) {
      const a = lampsOn ? Math.min(1, v.night * 1.4) : 0;
      lg.glow.setAlpha(a * 0.9);
      lg.pool.setAlpha(a * 0.35);
    }
    this.powered = new Set(BLACKOUT_ORDER.filter((d) => !unpowered.has(d)));
    for (const t of this.turbines || []) t.anims.timeScale = 0.4 + (L.energy / 100) * 1.2;
    // ---- water: clarifiers stop, fountains dry up, reservoir drains
    const waterOk = L.water >= 30;
    for (const c of this.clarifiers || []) waterOk ? c.anims.resume() : c.anims.pause();
    for (const f of this.fountains || []) f.setVisible(L.water >= 40);
    if (this.reservoirWater) {
      const vis = Math.max(1, Math.round(15 * Math.max(0.05, L.water / 100)));
      this.reservoirWater.setCrop(0, 15 - vis, 64, vis);
    }
    // ---- communication: radar and mast
    if (this.radar) L.communication >= 30 ? this.radar.anims.resume() : this.radar.anims.pause();
    if (this.mastLights) this.mastLights.setVisible(L.communication >= 20);
    // ---- reactor
    const reactorOn = !!v.reactorActive;
    if (this.reactorActive.visible !== reactorOn) {
      this.reactorActive.setVisible(reactorOn);
      this.reactorLights.setVisible(reactorOn);
      this.reactorIdle.setVisible(!reactorOn);
      this.scene.tweens.add({ targets: this.reactorGlow, alpha: reactorOn ? 0.55 : 0, duration: 1200 });
      this.effects.setReactor(reactorOn);
    }
    this.effects.setIndustry(L.supplies);
    // ---- hazards & pins derived from levels (so every weak system is visible) + event hazards
    const auto = [];
    const pins = [];
    if (L.energy < 35 && !v.gridShield) auto.push({ district: 'energy', type: 'outage' });
    if (L.infrastructure < 45) auto.push({ district: 'transport', type: 'crack' });
    if (L.infrastructure < 30) auto.push({ district: 'residential', type: 'crack' });
    if (L.communication < 30) auto.push({ district: 'command', type: 'glitch' });
    if (L.health < 40) pins.push({ district: 'medical', kind: L.health < 25 ? 'critical' : 'health' });
    if (L.water < 35) pins.push({ district: 'water', kind: L.water < 20 ? 'critical' : 'warning' });
    if (L.energy < 35) pins.push({ district: 'energy', kind: 'power' });
    if (L.transport < 35) pins.push({ district: 'transport', kind: L.transport < 20 ? 'critical' : 'warning' });
    if (L.safety < 35) pins.push({ district: 'residential', kind: L.safety < 20 ? 'critical' : 'warning' });
    if (L.supplies < 30) pins.push({ district: 'industrial', kind: 'warning' });
    for (const p of v.pins || []) if (!pins.some((q) => q.district === p.district)) pins.push(p);
    const hazards = [...auto];
    for (const h of v.hazards || []) if (!hazards.some((q) => q.district === h.district && q.type === h.type)) hazards.push(h);
    this.effects.setHazards(hazards);
    this.effects.setPins(pins);
    this.effects.setRain(!!v.weather?.rain);
    this.transportLevel = L.transport;
    // ---- life on the streets
    const repairBlocks = hazards.filter((h) => h.type === 'crack' || h.type === 'fire').map((h) => h.district);
    this.traffic?.configure({ ...L, stability: v.stability, fires: hazards.filter((h) => h.type === 'fire').length, repairs: v.repairCrews || 0 });
    this.people?.configure({ ...L, stability: v.stability, repairs: v.repairCrews || 0, repairBlocks });
    if (!this._prewarmed) {
      this._prewarmed = true;
      this.traffic?.prewarm();
      this.people?.prewarm();
    }
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.traffic?.update(dt);
    this.people?.update(dt);
    this.effects.update(dt);
    if (!this.trainRunning) {
      this.trainTimer -= dt;
      if (this.trainTimer <= 0 && (this.transportLevel ?? 70) >= 30) this._runTrain(((this.transportLevel ?? 70) / 100) + 0.3);
    }
    if (this.state?.weather?.storm) {
      this.stormTimer = (this.stormTimer ?? 3) - dt;
      if (this.stormTimer <= 0) { this.effects.lightning(); this.stormTimer = 4 + this.rng.next() * 5; }
    }
  }
}
