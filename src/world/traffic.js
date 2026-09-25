// City traffic: vehicles follow a road graph derived from the layout, drive on the right,
// queue behind each other, and switch sprites (side/front/back) with their heading.
import { TILE, ROADS } from '../data/city-layout.js';
import { depthFor, anchorBottom } from './depth.js';

const ROW_Y = { 3: 3 * TILE + 8, 12: 13 * TILE, 21: 21 * TILE + 8 };
const CAR_COLORS = ['coral', 'sky', 'teal', 'violet', 'lime', 'cream', 'magenta', 'orange'];

function laneFor(a, b) {
  if (a.y === b.y) {
    const east = b.x > a.x;
    if (a.row === 12) return { y: east ? 216 : 201 };
    return { y: a.y + (east ? 3 : -3) };
  }
  const south = b.y > a.y;
  return { x: a.col * TILE + (south ? 5 : 11) };
}

export function buildRoadNetwork() {
  const nodes = new Map();
  const add = (id, x, y, col, row) => nodes.set(id, { id, x, y, col, row, links: [] });
  const cols = ROADS.vertical.map((v) => v.col);
  for (const c of cols) for (const r of [3, 12, 21]) add(`${c}:${r}`, c * TILE + 8, ROW_Y[r], c, r);
  add('W', -30, ROW_Y[12], -2, 12);
  add('E', 750, ROW_Y[12], 47, 12);
  const link = (a, b) => {
    nodes.get(a).links.push(b);
    nodes.get(b).links.push(a);
  };
  for (const r of [3, 12, 21]) for (let i = 0; i + 1 < cols.length; i++) link(`${cols[i]}:${r}`, `${cols[i + 1]}:${r}`);
  for (const c of cols) { link(`${c}:3`, `${c}:12`); link(`${c}:12`, `${c}:21`); }
  link('W', `${cols[0]}:12`);
  link(`${cols.at(-1)}:12`, 'E');
  return nodes;
}

const KINDS = {
  car: { speed: 24, frame: () => null },
  taxi: { speed: 26 },
  bus: { speed: 17 },
  truck: { speed: 18 },
  ambulance: { speed: 36, emergency: true },
  police: { speed: 34, emergency: true },
  fire: { speed: 30, emergency: true },
  repair: { speed: 24, emergency: true }
};

class Vehicle {
  constructor(scene, net, rng) {
    this.scene = scene;
    this.net = net;
    this.rng = rng;
    this.sprite = scene.add.sprite(0, 0, 'city', 'car-coral-side');
    this.sprite.setVisible(false);
    this.active = false;
  }

  spawn(kind, startId, tint, progress = 0) {
    this.kind = kind;
    this.color = kind === 'car' ? this.rng.pick(CAR_COLORS) : null;
    this.speed = KINDS[kind].speed * (0.85 + this.rng.next() * 0.3);
    this.emergency = !!KINDS[kind].emergency;
    const start = this.net.get(startId);
    this.from = start;
    this.to = this.net.get(this.rng.pick(start.links));
    const lane = laneFor(this.from, this.to);
    this.x = lane.x ?? this.from.x;
    this.y = lane.y ?? this.from.y;
    this.leaving = false;
    this.active = true;
    this.stopped = 0;
    if (progress > 0) {
      const t = this._target();
      this.x += (t.x - this.x) * progress;
      this.y += (t.y - this.y) * progress;
    }
    this.sprite.setVisible(true).setAlpha(progress > 0 ? 1 : 0);
    this.sprite.setTint(tint);
    if (progress === 0) this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 500 });
    this._setView();
    this._place();
  }

  get heading() {
    if (this.from.y === this.to.y) return this.to.x > this.from.x ? 'E' : 'W';
    return this.to.y > this.from.y ? 'S' : 'N';
  }

  _setView() {
    const h = this.heading;
    const view = h === 'E' || h === 'W' ? 'side' : h === 'S' ? 'front' : 'back';
    const base = this.kind === 'car' ? `car-${this.color}-${view}` : `${this.kind}-${view}`;
    if (this.emergency) {
      this.sprite.play(`${this.kind}-${view}`, true);
    } else {
      this.sprite.stop();
      this.sprite.setFrame(base);
    }
    this.sprite.setFlipX(h === 'W');
    anchorBottom(this.sprite);
    this.view = view;
  }

  _place() {
    const halfH = this.view === 'side' ? 4 : 6;
    this.sprite.setPosition(Math.round(this.x), Math.round(this.y + halfH));
    this.sprite.setDepth(depthFor(this.y + halfH));
  }

  /** Target point on the current edge (lane-adjusted end node). */
  _target() {
    const lane = laneFor(this.from, this.to);
    return { x: lane.x ?? this.to.x, y: lane.y ?? this.to.y };
  }

  update(dt, speedFactor, others) {
    if (!this.active) return;
    const t = this._target();
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy);
    // queue behind the vehicle ahead on the same edge
    let blocked = false;
    for (const o of others) {
      if (o === this || !o.active || o.from !== this.from || o.to !== this.to) continue;
      const ahead = (o.x - this.x) * Math.sign(dx || 0) + (o.y - this.y) * Math.sign(dy || 0);
      if (ahead > 0 && ahead < (this.kind === 'bus' || o.kind === 'bus' ? 30 : 21)) { blocked = true; break; }
    }
    const step = blocked ? 0 : this.speed * speedFactor * dt;
    if (dist <= step || dist < 0.5) {
      this.x = t.x;
      this.y = t.y;
      this._advance();
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
    this._place();
  }

  _advance() {
    const node = this.to;
    if (node.id === 'W' || node.id === 'E' || this.leaving) {
      this.despawn();
      return;
    }
    const options = node.links.filter((id) => id !== this.from.id);
    const straight = options.find((id) => {
      const n = this.net.get(id);
      return (n.x - node.x) * (node.x - this.from.x) + (n.y - node.y) * (node.y - this.from.y) > 0;
    });
    const nextId = straight && this.rng.chance(0.55) ? straight : this.rng.pick(options.length ? options : node.links);
    this.from = node;
    this.to = this.net.get(nextId);
    this._setView();
  }

  despawn() {
    this.active = false;
    this.scene.tweens.add({
      targets: this.sprite, alpha: 0, duration: 400,
      onComplete: () => { if (!this.active) this.sprite.setVisible(false); }
    });
  }
}

export class Traffic {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.net = buildRoadNetwork();
    this.nodeIds = [...this.net.keys()].filter((id) => id !== 'W' && id !== 'E');
    this.pool = [];
    this.targets = { car: 14, taxi: 2, bus: 2, truck: 2, ambulance: 0, police: 0, fire: 0, repair: 0 };
    this.speedFactor = 1;
    this.tint = 0xffffff;
    this.spawnTimer = 0;
  }

  /** Map city state to traffic mix and flow. Levels are 0..100. */
  configure({ transport = 70, health = 70, safety = 70, infrastructure = 70, supplies = 70, stability = 70, fires = 0, repairs = 0 }) {
    const jam = transport < 40;
    this.speedFactor = transport < 25 ? 0.3 : jam ? 0.5 : 0.75 + (transport / 100) * 0.35;
    this.targets.car = Math.round(10 + (jam ? 10 : 0) + (stability / 100) * 6);
    this.targets.taxi = transport > 30 ? 2 : 1;
    this.targets.bus = transport > 25 ? 2 : 0;
    this.targets.truck = supplies < 55 ? 4 : 2;
    this.targets.ambulance = health < 60 ? Math.min(4, Math.ceil((60 - health) / 12)) : 0;
    this.targets.police = safety < 60 ? Math.min(3, Math.ceil((60 - safety) / 15)) : 0;
    this.targets.fire = Math.min(3, fires);
    this.targets.repair = Math.min(4, repairs + (infrastructure < 50 ? Math.ceil((50 - infrastructure) / 15) : 0));
  }

  setTint(tint) {
    this.tint = tint;
    for (const v of this.pool) if (v.active) v.sprite.setTint(tint);
  }

  countOf(kind) {
    let n = 0;
    for (const v of this.pool) if (v.active && !v.leaving && v.kind === kind) n++;
    return n;
  }

  /** Fill the streets immediately (vehicles start mid-road, already visible). */
  prewarm() {
    for (const kind of Object.keys(this.targets)) {
      while (this.countOf(kind) < this.targets[kind] && this.pool.length < 60) this._spawnOne(kind, 0.05 + this.rng.next() * 0.9);
    }
  }

  _spawnOne(kind, progress = 0) {
    let v = this.pool.find((p) => !p.active && !p.sprite.visible);
    if (!v) {
      if (this.pool.length >= 60) return;
      v = new Vehicle(this.scene, this.net, this.rng);
      this.pool.push(v);
    }
    const start = kind === 'car' && progress === 0 && this.rng.chance(0.3) ? this.rng.pick(['W', 'E']) : this.rng.pick(this.nodeIds);
    v.spawn(kind, start, this.tint, progress);
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.35;
      for (const kind of Object.keys(this.targets)) {
        const have = this.countOf(kind);
        if (have < this.targets[kind]) { this._spawnOne(kind); break; }
        if (have > this.targets[kind]) {
          const extra = this.pool.find((p) => p.active && !p.leaving && p.kind === kind);
          if (extra) extra.leaving = true;
        }
      }
    }
    for (const v of this.pool) v.update(dt, v.emergency ? Math.max(0.7, this.speedFactor) : this.speedFactor, this.pool);
  }
}
