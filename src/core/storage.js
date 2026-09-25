/**
 * Persistence for the local profile (settings, achievements, scoreboard) in localStorage.
 *
 * - versioned and validated on every load (corrupt or tampered data never crashes the game)
 * - the previous good save is kept under a backup key and used if the main save is unreadable
 * - falls back to in-memory storage when localStorage is unavailable (private mode, kiosk
 *   lockdown), so the game always runs
 */
import { defaultProfile, migrateProfile } from './profile.js';

export const STORAGE_KEY = 'nexus-city-zero:profile';
export const BACKUP_KEY = 'nexus-city-zero:profile:backup';

class MemoryBackend {
  constructor() {
    this.map = new Map();
  }

  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }

  setItem(k, v) {
    this.map.set(k, String(v));
  }

  removeItem(k) {
    this.map.delete(k);
  }
}

export function detectBackend() {
  try {
    const ls = globalThis.localStorage;
    const probe = '__nexus_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { backend: ls, persistent: true };
  } catch {
    return { backend: new MemoryBackend(), persistent: false };
  }
}

export class ProfileStore {
  constructor(backend = null) {
    const detected = backend ? { backend, persistent: true } : detectBackend();
    this.backend = detected.backend;
    this.persistent = detected.persistent;
    this.profile = null;
  }

  read(key) {
    try {
      const raw = this.backend.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null;
    }
  }

  load() {
    const data = this.read(STORAGE_KEY) ?? this.read(BACKUP_KEY);
    this.profile = data ? migrateProfile(data) : defaultProfile();
    return this.profile;
  }

  get() {
    return this.profile ?? this.load();
  }

  save(profile = this.profile) {
    this.profile = profile;
    try {
      const previous = this.backend.getItem(STORAGE_KEY);
      if (previous && this.read(STORAGE_KEY)) this.backend.setItem(BACKUP_KEY, previous);
      this.backend.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch {
      return false; // quota or permissions: keep playing with the in-memory profile
    }
  }

  /** Update settings and persist immediately. */
  setSettings(patch) {
    const p = this.get();
    Object.assign(p.settings, patch);
    this.save(p);
    return p.settings;
  }
}

/** The app-wide store (created lazily so Node tests can construct their own). */
let shared = null;
export function profileStore() {
  if (!shared) shared = new ProfileStore();
  return shared;
}
