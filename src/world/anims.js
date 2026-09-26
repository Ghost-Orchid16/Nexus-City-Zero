// Every sprite animation in one registry, created once after loading.

const seq = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}-${i}`);

const ANIMS = [
  { key: 'clarifier', atlas: 'buildings', frames: seq('clarifier', 4), fps: 5 },
  { key: 'reservoir', atlas: 'buildings', frames: seq('reservoir-water', 3), fps: 3 },
  { key: 'fountain', atlas: 'city', frames: seq('fountain', 3), fps: 7 },
  { key: 'plaza-fountain', atlas: 'city', frames: seq('plaza-fountain', 3), fps: 7 },
  { key: 'radar', atlas: 'city', frames: seq('radar', 8), fps: 8 },
  { key: 'turbine', atlas: 'city', frames: seq('wind-turbine', 6), fps: 10 },
  { key: 'boat', atlas: 'city', frames: seq('boat', 2), fps: 1.5 },
  { key: 'flag', atlas: 'city', frames: seq('flag', 2), fps: 3 },
  { key: 'fire', atlas: 'effects', frames: seq('fire', 4), fps: 10 },
  { key: 'spark', atlas: 'effects', frames: seq('spark', 3), fps: 12 },
  { key: 'splash', atlas: 'effects', frames: seq('splash', 3), fps: 8 },
  { key: 'beacon-amber', atlas: 'effects', frames: seq('beacon-amber', 2), fps: 3 },
  { key: 'beacon-red', atlas: 'effects', frames: seq('beacon-red', 2), fps: 4 },
  { key: 'lightning', atlas: 'effects', frames: seq('lightning', 2), fps: 12 },
  { key: 'glitch', atlas: 'effects', frames: seq('glitch', 3), fps: 9 },
  { key: 'sparkle', atlas: 'effects', frames: [...seq('sparkle', 3), 'sparkle-1'], fps: 10 },
  { key: 'puddle', atlas: 'effects', frames: seq('puddle', 2), fps: 2 }
];

const EMERGENCY = ['ambulance', 'fire', 'police', 'repair'];
const VIEWS = ['side', 'front', 'back'];
const PEOPLE = ['a', 'b', 'c', 'd', 'e', 'f', 'worker', 'medic'];

export function registerAnims(scene) {
  const anims = scene.anims;
  const add = (key, atlas, frames, frameRate, repeat = -1) => {
    if (anims.exists(key)) return;
    anims.create({ key, frames: frames.map((frame) => ({ key: atlas, frame })), frameRate, repeat });
  };
  for (const a of ANIMS) add(a.key, a.atlas, a.frames, a.fps);
  // flowing water highlights come from a spritesheet (numeric frames)
  if (!anims.exists('water-flow')) {
    anims.create({ key: 'water-flow', frames: anims.generateFrameNumbers('water', { start: 0, end: 3 }), frameRate: 3, repeat: -1 });
  }
  for (const v of EMERGENCY) for (const view of VIEWS) add(`${v}-${view}`, 'city', [`${v}-${view}-0`, `${v}-${view}-1`], 6);
  for (const p of PEOPLE) {
    add(`walk-${p}-side`, 'people', seq(`person-${p}-side`, 4), 8);
    add(`walk-${p}-front`, 'people', seq(`person-${p}-front`, 2), 6);
    add(`walk-${p}-back`, 'people', seq(`person-${p}-back`, 2), 6);
  }
}

export const EMERGENCY_VEHICLES = EMERGENCY;
export const CITIZEN_KINDS = ['a', 'b', 'c', 'd', 'e', 'f'];
