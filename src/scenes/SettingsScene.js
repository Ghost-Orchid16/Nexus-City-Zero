import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/layout.js';
import { UI, hex } from '../config/palette.js';
import { profileStore } from '../core/storage.js';
import { resetScoreboard } from '../core/profile.js';
import { bus } from '../core/event-bus.js';
import { textStyle } from '../ui/theme.js';
import { Button, panel } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Toggle, Slider } from '../ui/widgets.js';

/** Settings overlay (launched over the title screen or the pause menu). Saved immediately. */
export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('settings');
  }

  init(data) {
    this.from = data?.from || null;
  }

  create() {
    if (this.from) this.scene.pause(this.from);
    const store = profileStore();
    const s = store.get().settings;
    const set = (patch) => {
      store.setSettings(patch);
      bus.emit('settings', store.get().settings);
    };
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, hex(UI.ink), 0.7).setOrigin(0).setInteractive();
    const w = 720;
    const h = 900;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    panel(this, x, y, w, h, 'card-white');
    panel(this, x, y, w, 86, 'band-blue');
    this.add.image(x + 44, y + 43, 'icons', 'ui-gear').setScale(3);
    this.add.text(x + 84, y + 43, 'SETTINGS', textStyle({ size: 44, font: 'display', color: UI.ink })).setOrigin(0, 0.5);
    this.focus = new FocusGroup(this, { onCancel: () => this.close() });
    const cx = GAME_WIDTH / 2;
    const rows = [
      new Slider(this, cx, y + 150, { text: 'MASTER VOLUME', value: s.master, width: 640, onChange: (v) => set({ master: v }) }),
      new Slider(this, cx, y + 240, { text: 'MUSIC', value: s.music, width: 640, onChange: (v) => set({ music: v }) }),
      new Slider(this, cx, y + 330, { text: 'SOUND EFFECTS', value: s.sfx, width: 640, onChange: (v) => set({ sfx: v }) }),
      new Toggle(this, cx, y + 420, { text: 'MUTE ALL SOUND', value: s.muted, width: 640, onChange: (v) => set({ muted: v }) }),
      new Toggle(this, cx, y + 510, { text: 'REDUCED MOTION', hint: 'calmer animations, no camera sweeps', value: s.reducedMotion, width: 640, onChange: (v) => set({ reducedMotion: v }) }),
      new Toggle(this, cx, y + 600, { text: 'SHOW TUTORIAL', hint: 'quick walkthrough before a run', value: s.tutorial, width: 640, onChange: (v) => set({ tutorial: v }) }),
      new Toggle(this, cx, y + 690, { text: 'EXHIBITION MODE', hint: 'fast tutorial, auto-reset when idle, attract demo', value: s.exhibition, width: 640, onChange: (v) => set({ exhibition: v }) })
    ];
    for (const r of rows) this.focus.add(r);
    const clear = new Button(this, cx - 170, y + h - 70, { text: 'CLEAR SCOREBOARD', width: 340, height: 72, color: 'red', size: 22, sfx: 'click', onClick: () => this.confirmClear(clear) });
    const done = new Button(this, cx + 190, y + h - 70, { text: 'DONE', width: 280, height: 72, color: 'teal', iconFrame: 'ui-check', size: 28, onClick: () => this.close() });
    this.focus.add(clear);
    this.focus.add(done);
    this.focus.focus(0);
  }

  confirmClear(btn) {
    if (!this.armed) {
      this.armed = true;
      btn.setText('TAP AGAIN TO CLEAR');
      this.time.delayedCall(3000, () => {
        if (btn.active) {
          this.armed = false;
          btn.setText('CLEAR SCOREBOARD');
        }
      });
      return;
    }
    const store = profileStore();
    resetScoreboard(store.get());
    store.save();
    this.armed = false;
    btn.setText('SCOREBOARD CLEARED').setDisabled(true);
    bus.emit('sfx', 'confirm');
  }

  close() {
    bus.emit('sfx', 'back');
    if (this.from) this.scene.resume(this.from);
    this.scene.stop();
  }
}
