// Citizens walking sidewalk loops around each block. Crowd size follows safety/stability
// (people stay home when the city feels unsafe); medics and repair crews appear on demand.
import { BLOCKS, TILE } from '../data/city-layout.js';
import { depthFor, anchorBottom } from './depth.js';
import { CITIZEN_KINDS } from './anims.js';

function loopFor(blockId) {
  const [c0, r0, c1, r1] = BLOCKS[blockId];
  const x0 = c0 * TILE + 2;
  const y0 = r0 * TILE + 3;
  const x1 = (c1 + 1) * TILE - 2;
  const y1 = (r1 + 1) * TILE - 1;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

const LOOPS = Object.fromEntries(Object.keys(BLOCKS).map((id) => [id, loopFor(id)]));

class Walker {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.sprite = scene.add.sprite(0, 0, 'people', 'person-a-front-0').setVisible(false);
    this.active = false;
  }

  spawn(kind, blockId, tint, instant = false) {
    this.kind = kind;
    this.block = blockId;
    this.loop = LOOPS[blockId];
    this.dir = this.rng.chance(0.5) ? 1 : -1;
    this.seg = this.rng.int(0, 3);
    this.t = this.rng.next();
    this.speed = 5 + this.rng.next() * 4;
    this.pause = 0;
    this.active = true;
    this.leaving = false;
    this.sprite.setVisible(true).setAlpha(instant ? 1 : 0).setTint(tint);
    if (!instant) this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 600 });
    this._pose();
  }

  _points() {
    const a = this.loop[this.seg];
    const b = this.loop[(this.seg + (this.dir > 0 ? 1 : 3)) % 4];
    return [a, b];
  }

  _pose() {
    const [a, b] = this._points();
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const view = Math.abs(dx) > Math.abs(dy) ? 'side' : dy > 0 ? 'front' : 'back';
    const key = `walk-${this.kind}-${view}`;
    if (this.pause > 0) this.sprite.stop();
    else if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) this.sprite.play(key, true);
    this.sprite.setFlipX(view === 'side' && dx < 0);
    anchorBottom(this.sprite);
  }

  update(dt) {
    if (!this.active) return;
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) this._pose();
    } else {
      const [a, b] = this._points();
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.t += (this.speed * dt) / len;
      if (this.t >= 1) {
        this.t = 0;
        this.seg = (this.seg + (this.dir > 0 ? 1 : 3)) % 4;
        if (this.leaving) { this.despawn(); return; }
        if (this.rng.chance(0.15)) this.pause = 1 + this.rng.next() * 2.5;
        this._pose();
      }
    }
    const [a, b] = this._points();
    const x = a[0] + (b[0] - a[0]) * this.t;
    const y = a[1] + (b[1] - a[1]) * this.t;
    this.sprite.setPosition(Math.round(x), Math.round(y));
    this.sprite.setDepth(depthFor(y));
  }

  despawn() {
    this.active = false;
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 400, onComplete: () => { if (!this.active) this.sprite.setVisible(false); } });
  }
}

export class Pedestrians {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.pool = [];
    this.tint = 0xffffff;
    this.targets = { citizen: 24, medic: 0, worker: 0 };
    this.workerBlocks = ['industrial'];
    this.timer = 0;
  }

  configure({ safety = 70, stability = 70, health = 70, infrastructure = 70, repairs = 0, repairBlocks = [] }) {
    const mood = Math.min(safety, stability);
    this.targets.citizen = Math.round(6 + (mood / 100) * 26);
    this.targets.medic = health < 55 ? Math.min(5, Math.ceil((55 - health) / 10)) : 0;
    this.targets.worker = Math.min(6, repairs * 2 + (infrastructure < 50 ? Math.ceil((50 - infrastructure) / 10) : 0));
    this.workerBlocks = repairBlocks.length ? repairBlocks : ['industrial', 'energy', 'water'];
  }

  setTint(tint) {
    this.tint = tint;
    for (const w of this.pool) if (w.active) w.sprite.setTint(tint);
  }

  _count(kind) {
    let n = 0;
    for (const w of this.pool) {
      if (!w.active || w.leaving) continue;
      if (kind === 'citizen' ? CITIZEN_KINDS.includes(w.kind) : w.kind === kind) n++;
    }
    return n;
  }

  prewarm() {
    for (const kind of ['citizen', 'medic', 'worker']) {
      while (this._count(kind) < this.targets[kind] && this.pool.length < 50) this._spawn(kind, true);
    }
  }

  _spawn(kind, instant = false) {
    let w = this.pool.find((p) => !p.active && !p.sprite.visible);
    if (!w) {
      if (this.pool.length >= 50) return;
      w = new Walker(this.scene, this.rng);
      this.pool.push(w);
    }
    const blocks = Object.keys(BLOCKS);
    const block = kind === 'medic' ? 'medical' : kind === 'worker' ? this.rng.pick(this.workerBlocks) : this.rng.pick(blocks);
    w.spawn(kind === 'citizen' ? this.rng.pick(CITIZEN_KINDS) : kind, block, this.tint, instant);
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.25;
      for (const kind of ['citizen', 'medic', 'worker']) {
        const have = this._count(kind);
        if (have < this.targets[kind]) { this._spawn(kind); break; }
        if (have > this.targets[kind]) {
          const extra = this.pool.find((p) => p.active && !p.leaving && (kind === 'citizen' ? CITIZEN_KINDS.includes(p.kind) : p.kind === kind));
          if (extra) extra.leaving = true;
        }
      }
    }
    for (const w of this.pool) w.update(dt);
  }
}
