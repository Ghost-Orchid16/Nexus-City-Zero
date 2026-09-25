/**
 * Seeded, serializable PRNG (sfc32). One instance is threaded through every simulation decision
 * so a run is reproducible from its seed; `fork(label)` derives independent streams (e.g. for
 * visuals) that never disturb the simulation's sequence.
 */

function hashString(str) {
  // xmur3 string hash → 32-bit seed material
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export class RNG {
  /** @param {number|string} seed */
  constructor(seed = Date.now()) {
    this.seed = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed))();
    const next = hashString(`nexus:${this.seed}`);
    this.s = [next(), next(), next(), next()];
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Uniform float in [0, 1). */
  next() {
    let [a, b, c, d] = this.s;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) >>> 0;
    this.s = [a >>> 0, b >>> 0, c >>> 0, d];
    return t / 4294967296;
  }

  float(min = 0, max = 1) {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Weighted pick: items with weightOf(item) <= 0 are never chosen. Returns null if none. */
  weighted(items, weightOf = (i) => i.weight) {
    let total = 0;
    for (const it of items) total += Math.max(0, weightOf(it));
    if (total <= 0) return null;
    let roll = this.next() * total;
    for (const it of items) {
      const w = Math.max(0, weightOf(it));
      if (w <= 0) continue;
      roll -= w;
      if (roll < 0) return it;
    }
    return items.filter((i) => weightOf(i) > 0).at(-1);
  }

  shuffle(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Independent stream derived from this seed and a label (does not advance this stream). */
  fork(label) {
    return new RNG(`${this.seed}:${label}`);
  }

  getState() {
    return { seed: this.seed, s: [...this.s] };
  }

  setState(state) {
    this.seed = state.seed;
    this.s = [...state.s];
    return this;
  }

  static fromState(state) {
    return new RNG(state.seed).setState(state);
  }
}

/** A fresh 32-bit seed from the environment (used only to start new runs). */
export function freshSeed() {
  if (globalThis.crypto?.getRandomValues) return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  return (Math.random() * 4294967296) >>> 0;
}
