/**
 * Procedural audio (Web Audio API): every sound and every note of music is synthesized at run
 * time, so the game ships no audio files and works fully offline.
 *
 * Mix: master → compressor → speakers, with separate music / sfx / ambience buses whose
 * levels follow the settings (master, music, sfx, mute). Kept deliberately subtle: the game has
 * to live in a busy exhibition hall without dominating it.
 *
 * Listens to the app bus:  sfx(name) · music(track|null) · settings(settings)
 */
import { bus } from '../core/event-bus.js';

const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** One-shot sound recipes: each is a list of voices. */
const SFX = {
  click: [{ wave: 'square', f: [660, 880], d: 0.06, v: 0.12 }],
  hover: [{ wave: 'sine', f: [1320], d: 0.03, v: 0.04 }],
  tick: [{ noise: true, f: [3000], q: 4, d: 0.025, v: 0.08 }],
  toggle: [{ wave: 'square', f: [520, 780], d: 0.07, v: 0.1 }],
  select: [{ wave: 'triangle', f: [NOTE(72)], d: 0.09, v: 0.16 }, { wave: 'triangle', f: [NOTE(79)], d: 0.14, v: 0.16, at: 0.08 }],
  back: [{ wave: 'triangle', f: [NOTE(74), NOTE(67)], d: 0.12, v: 0.13 }],
  deny: [{ wave: 'square', f: [140, 120], d: 0.14, v: 0.1, lp: 900 }],
  dice: [0, 0.07, 0.15, 0.24].map((at) => ({ noise: true, f: [1800 + at * 2000], q: 6, d: 0.04, v: 0.12, at })),
  reveal: [72, 76, 79, 84].map((m, i) => ({ wave: 'triangle', f: [NOTE(m)], d: 0.16, v: 0.13, at: i * 0.06 })),
  alert: [{ wave: 'sine', f: [NOTE(76)], d: 0.22, v: 0.2 }, { wave: 'sine', f: [NOTE(72)], d: 0.3, v: 0.18, at: 0.16 }],
  alarm: [0, 0.18].map((at) => ({ wave: 'square', f: [NOTE(81)], d: 0.12, v: 0.1, lp: 2400, at })),
  opportunity: [72, 76, 79].map((m, i) => ({ wave: 'triangle', f: [NOTE(m)], d: 0.25, v: 0.13, at: i * 0.07 })),
  confirm: [{ wave: 'sine', f: [NOTE(60), NOTE(55)], d: 0.12, v: 0.2 }, { wave: 'triangle', f: [NOTE(76)], d: 0.2, v: 0.12, at: 0.06 }],
  success: [{ wave: 'triangle', f: [NOTE(72)], d: 0.16, v: 0.15 }, { wave: 'triangle', f: [NOTE(76)], d: 0.16, v: 0.15, at: 0.1 }, { wave: 'triangle', f: [NOTE(79)], d: 0.3, v: 0.15, at: 0.2 }],
  fail: [{ wave: 'sawtooth', f: [NOTE(62), NOTE(55)], d: 0.35, v: 0.1, lp: 1200 }],
  warning: [{ wave: 'triangle', f: [NOTE(69)], d: 0.18, v: 0.14, vib: 7 }],
  message: [{ wave: 'sine', f: [NOTE(84)], d: 0.07, v: 0.08 }, { wave: 'sine', f: [NOTE(88)], d: 0.08, v: 0.07, at: 0.06 }],
  cascade: [{ wave: 'sawtooth', f: [820, 180], d: 0.55, v: 0.12, lp: 1600 }, { noise: true, f: [500], q: 1, d: 0.5, v: 0.08 }],
  phase: [{ wave: 'sine', f: [90, 55], d: 0.6, v: 0.3 }, { wave: 'square', f: [NOTE(69), NOTE(81)], d: 0.5, v: 0.07, lp: 2000, at: 0.1 }],
  ability: [{ noise: true, f: [300, 3200], q: 2, d: 0.45, v: 0.14 }, ...[67, 71, 74, 79].map((m, i) => ({ wave: 'triangle', f: [NOTE(m)], d: 0.3, v: 0.11, at: 0.12 + i * 0.05 }))],
  start: [60, 64, 67, 72].map((m, i) => ({ wave: 'triangle', f: [NOTE(m)], d: 0.2, v: 0.13, at: i * 0.08 })),
  victory: [60, 64, 67, 72, 76, 79].map((m, i) => ({ wave: 'triangle', f: [NOTE(m)], d: i === 5 ? 0.7 : 0.18, v: 0.15, at: i * 0.11 })),
  collapse: [{ wave: 'sawtooth', f: [220, 55], d: 1.2, v: 0.14, lp: 900 }, { noise: true, f: [200], q: 1, d: 1.2, v: 0.1 }],
  achievement: [{ wave: 'triangle', f: [NOTE(84)], d: 0.12, v: 0.12 }, { wave: 'triangle', f: [NOTE(88)], d: 0.12, v: 0.12, at: 0.08 }, { wave: 'triangle', f: [NOTE(91)], d: 0.4, v: 0.12, at: 0.16 }]
};

/** Generative loops: chord progression (MIDI roots) + tempo + voice colors. */
const TRACKS = {
  title: { bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], lead: 'triangle', bass: true, level: 0.8 },
  game: { bpm: 100, chords: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], lead: 'triangle', bass: true, pulse: true, level: 0.7 },
  final: { bpm: 128, chords: [[57, 60, 64], [58, 62, 65], [57, 60, 64], [56, 59, 64]], lead: 'square', bass: true, pulse: true, level: 0.65 },
  results: { bpm: 76, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], lead: 'triangle', bass: true, level: 0.8 },
  'results-low': { bpm: 66, chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], lead: 'sine', bass: true, level: 0.7 }
};

export class SoundEngine {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.ctx = null;
    this.track = null;
    this.wanted = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  /** Browsers only allow audio after a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.connect(this.comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    for (const b of [this.sfxBus, this.musicBus, this.ambBus]) b.connect(this.master);
    this.noiseBuffer = this.makeNoise();
    this.applySettings(this.getSettings());
    if (this.wanted) this.music(this.wanted);
  }

  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    return buf;
  }

  applySettings(s) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const on = s.muted ? 0 : 1;
    this.master.gain.setTargetAtTime(on * s.master * 0.9, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.32, t, 0.2);
    this.ambBus.gain.setTargetAtTime(s.sfx * 0.18, t, 0.2);
  }

  voice({ wave = 'sine', noise = false, f, d, v, at = 0, lp = null, q = 1, vib = 0 }, bus = this.sfxBus, when = null) {
    const ctx = this.ctx;
    const t0 = (when ?? ctx.currentTime) + at;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + Math.min(0.012, d / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    let src;
    let out = g;
    if (noise) {
      src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(f[0], t0);
      if (f[1]) bp.frequency.exponentialRampToValueAtTime(f[1], t0 + d);
      src.connect(bp).connect(g);
    } else {
      src = ctx.createOscillator();
      src.type = wave;
      src.frequency.setValueAtTime(f[0], t0);
      if (f[1]) src.frequency.exponentialRampToValueAtTime(f[1], t0 + d);
      if (vib) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = vib;
        lg.gain.value = f[0] * 0.02;
        lfo.connect(lg).connect(src.frequency);
        lfo.start(t0);
        lfo.stop(t0 + d + 0.05);
      }
      if (lp) {
        const f2 = ctx.createBiquadFilter();
        f2.type = 'lowpass';
        f2.frequency.value = lp;
        src.connect(f2).connect(g);
      } else {
        src.connect(g);
      }
    }
    out.connect(bus);
    src.start(t0);
    src.stop(t0 + d + 0.05);
  }

  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const recipe = SFX[name];
    if (!recipe) return;
    const now = this.ctx.currentTime;
    // never stack the same sound more than once per 40 ms
    if (this.last?.[name] && now - this.last[name] < 0.04) return;
    this.last = this.last || {};
    this.last[name] = now;
    for (const v of recipe) this.voice(v);
  }

  // ------------------------------------------------------------------ music
  music(track) {
    this.wanted = track;
    if (!this.ctx) return;
    if (track === this.track) return;
    this.track = track;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = null;
    this.ambience(track === 'game' || track === 'final');
    if (!track || !TRACKS[track]) return;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  schedule() {
    const tr = TRACKS[this.track];
    if (!tr || !this.ctx) return;
    const stepDur = 60 / tr.bpm / 2; // eighth notes
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const bar = Math.floor(this.step / 8) % tr.chords.length;
      const chord = tr.chords[bar];
      const i = this.step % 8;
      // arpeggio (soft pluck)
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
      const note = chord[pattern[i]] + 12;
      this.voice({ wave: tr.lead, f: [NOTE(note)], d: stepDur * 1.6, v: 0.05 * tr.level, lp: 1800 }, this.musicBus, this.nextTime);
      if (tr.bass && (i === 0 || i === 4)) this.voice({ wave: 'sine', f: [NOTE(chord[0] - 12)], d: stepDur * 3.5, v: 0.12 * tr.level }, this.musicBus, this.nextTime);
      if (tr.pulse && i % 2 === 1) this.voice({ noise: true, f: [5200], q: 8, d: 0.03, v: 0.025 * tr.level }, this.musicBus, this.nextTime);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  /** Soft city hum under gameplay. */
  ambience(on) {
    if (!this.ctx) return;
    if (on && !this.amb) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.5, this.ctx.currentTime, 1.5);
      src.connect(lp).connect(g).connect(this.ambBus);
      src.start();
      this.amb = { src, g };
    } else if (!on && this.amb) {
      const { src, g } = this.amb;
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.5);
      src.stop(this.ctx.currentTime + 2);
      this.amb = null;
    }
  }
}

/** Wire the engine to the app bus and unlock it on the first gesture. */
export function installAudio(getSettings) {
  const engine = new SoundEngine(getSettings);
  const unlock = () => engine.unlock();
  globalThis.addEventListener?.('pointerdown', unlock);
  globalThis.addEventListener?.('keydown', unlock);
  bus.on('sfx', (name) => engine.sfx(name));
  bus.on('music', (track) => engine.music(track));
  bus.on('settings', (s) => engine.applySettings(s));
  return engine;
}
