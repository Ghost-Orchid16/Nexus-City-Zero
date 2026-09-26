// Special ability button: icon, name, charges, cooldown; pulses gold when ready. Key: E.
import Phaser from 'phaser';
import { UI, hex } from '../../config/palette.js';
import { CHARACTER_BY_ID } from '../../data/characters.js';
import { textStyle } from '../theme.js';
import { panel } from '../components.js';
import { bus } from '../../core/event-bus.js';

export class AbilityCard extends Phaser.GameObjects.Container {
  constructor(scene, sim, { x = 16, y = 870, w = 376, h = 194, onUse } = {}) {
    super(scene, x, y);
    this.sim = sim;
    this.onUse = onUse;
    const role = CHARACTER_BY_ID[sim.config.character];
    this.role = role;
    this.w = w;
    this.h = h;
    this.ring = panel(scene, -12, -12, w + 24, h + 24, 'select-gold').setVisible(false);
    this.bg = panel(scene, 0, 0, w, h, 'card');
    this.add([this.ring, this.bg]);
    this.add(scene.add.text(18, 22, 'SPECIAL ABILITY', textStyle({ size: 15, weight: '900', color: UI.violetDeep })).setOrigin(0, 0.5));
    this.add(scene.add.text(w - 18, 22, 'KEY [E]', textStyle({ size: 14, weight: '900', color: UI.inkSoft })).setOrigin(1, 0.5));
    this.badge = scene.add.image(66, 104, 'ui', `badge-${role.color}`).setScale(7);
    this.icon = scene.add.image(66, 102, 'icons', role.ability.icon).setScale(3);
    this.cool = scene.add.rectangle(66 - 52, 104 + 52, 104, 104, hex(UI.ink), 0.55).setOrigin(0, 1);
    this.add([this.badge, this.icon, this.cool]);
    this.name = scene.add.text(130, 62, role.ability.name.toUpperCase(), textStyle({ size: 21, weight: '900', wrap: w - 146, lineSpacing: -3 }));
    this.add(this.name);
    this.status = scene.add.text(130, 62 + this.name.height + 8, '', textStyle({ size: 18, weight: '900', color: UI.teal }));
    this.add(this.status);
    this.pips = [];
    for (let i = 0; i < role.ability.charges; i++) {
      const p = scene.add.image(138 + i * 30, h - 30, 'ui', 'badge-yellow').setScale(1.4);
      this.pips.push(p);
      this.add(p);
    }
    this.setSize(w, h);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on('pointerover', () => this.emit('hover', this));
    this.bg.on('pointerup', () => this.activate());
    this.ready = null;
    scene.add.existing(this);
  }

  update(time) {
    const st = this.sim.abilityState();
    if (st.ready !== this.ready) {
      this.ready = st.ready;
      this.ring.setVisible(st.ready);
      this.setAlpha(st.ready || st.charges > 0 ? 1 : 0.6);
    }
    if (st.ready) this.ring.setAlpha(0.55 + 0.45 * Math.sin(time / 240));
    const text = st.charges <= 0 ? 'USED' : st.ready ? 'READY · TAP TO USE' : `RECHARGING ${Math.ceil(st.wait)} s`;
    if (text !== this.lastText) {
      this.lastText = text;
      this.status.setText(text).setColor(st.ready ? UI.teal : st.charges <= 0 ? UI.inkSoft : UI.orangeDeep);
    }
    this.pips.forEach((p, i) => p.setFrame(i < st.charges ? 'badge-yellow' : 'badge-stone'));
    const f = st.charges <= 0 ? 1 : st.cooldown > 0 ? Math.min(1, st.wait / st.cooldown) : 0;
    this.cool.height = 104 * f;
  }

  activate() {
    if (!this.sim.canUseAbility()) {
      bus.emit('sfx', 'deny');
      this.scene.tweens.add({ targets: this, x: this.x + 6, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    this.onUse?.();
    this.scene.tweens.add({ targets: [this.badge, this.icon], scale: '*=1.25', duration: 160, yoyo: true });
  }

  setFocus() {}
}
