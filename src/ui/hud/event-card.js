// The crisis card: what happened, where, what it already cost, and 2–4 responses with their
// exact effects, cost and risk. The response timer shows what ignoring the crisis will cost.
import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config/layout.js';
import { UI, hex } from '../../config/palette.js';
import { RESOURCE_BY_ID } from '../../data/resources.js';
import { CHARACTER_BY_ID } from '../../data/characters.js';
import { DISTRICT_BY_ID } from '../../data/city-layout.js';
import { VIGNETTE_INDEX } from '../../assets.js';
import { textStyle } from '../theme.js';
import { panel, resizePanel, effectChip, Bar } from '../components.js';
import { tag, signed } from '../widgets.js';
import { bus } from '../../core/event-bus.js';

export const CARD = { x: 1384, y: 116, w: 520, maxH: 948 };

const KIND_HEADER = {
  recovery: { color: 'green', label: 'OPPORTUNITY' },
  cascade: { color: 'red', label: 'CASCADE CRISIS' },
  followup: { color: 'coral', label: 'CONSEQUENCE' }
};
const SEVERITY = { 1: { color: 'yellow', label: 'MINOR CRISIS' }, 2: { color: 'orange', label: 'CRISIS' }, 3: { color: 'red', label: 'MAJOR CRISIS' } };
const CATEGORY_ICON = { cyber: 'scn-cyber', industrial: 'scn-industrial', weather: 'scn-weather', recovery: 'ui-star' };
export const DISTRICT_COLOR = { water: 'blue', residential: 'coral', downtown: 'violet', medical: 'red', energy: 'yellow', command: 'teal', transport: 'orange', industrial: 'orange' };

function categoryIcon(category) {
  return CATEGORY_ICON[category] || RESOURCE_BY_ID[category]?.icon || 'ui-warning';
}

/** Small chip with an icon and free text (lingering effects, underfunded notes). */
function textChip(scene, x, y, iconFrame, text, frame = 'chip-neutral') {
  const c = scene.add.container(x, y);
  const ic = scene.add.image(0, 0, 'icons', iconFrame).setScale(2);
  const t = scene.add.text(0, 0, text, textStyle({ size: 18, weight: '900' })).setOrigin(0, 0.5);
  const w = ic.displayWidth + t.width + 26;
  c.add(panel(scene, 0, -19, w, 38, frame));
  ic.setPosition(10 + ic.displayWidth / 2, -1);
  t.setX(ic.displayWidth + 16);
  c.add([ic, t]);
  c.width = w;
  return c;
}

/** Row of effect chips; returns the container (width in .width). */
export function chipRow(scene, x, y, effects, { cost = 0, costLabel = null, lingering = [], size = 20, maxWidth = 440 } = {}) {
  const row = scene.add.container(x, y);
  let cx = 0;
  const push = (chip) => {
    if (cx + chip.width > maxWidth && cx > 0) {
      chip.destroy();
      return;
    }
    chip.x = cx;
    row.add(chip);
    cx += chip.width + 6;
  };
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'budget' || !v) continue;
    push(effectChip(scene, 0, 0, RESOURCE_BY_ID[k].icon, v, { size }));
  }
  if (effects.budget) push(effectChip(scene, 0, 0, 'res-budget', effects.budget, { size }));
  if (costLabel) push(textChip(scene, 0, 0, 'res-budget', costLabel, 'chip-cost'));
  else if (cost > 0) push(effectChip(scene, 0, 0, 'res-budget', cost, { size, cost: true }));
  for (const l of lingering) {
    const total = Math.round(l.rate * Math.min(l.duration, 180));
    if (total) push(textChip(scene, 0, 0, RESOURCE_BY_ID[l.system].icon, `${signed(total)} over ${l.duration > 180 ? 'time' : `${l.duration}s`}`, total > 0 ? 'chip-good' : 'chip-bad'));
  }
  row.width = cx - 6;
  return row;
}

/** Animated hazard layer drawn over a district illustration. */
function hazardLayer(scene, type, x, y, w, h) {
  const layer = scene.add.container(0, 0);
  const at = (fx, fy) => [x + w * fx, y + h * fy];
  const loopPuff = (frame, fx, fy, delay) => {
    const [px, py] = at(fx, fy);
    const puff = scene.add.image(px, py, 'effects', frame).setScale(3).setAlpha(0);
    layer.add(puff);
    scene.tweens.add({ targets: puff, y: py - 70, alpha: { from: 0.9, to: 0 }, scale: { from: 2.5, to: 4 }, duration: 2200, delay, repeat: -1 });
  };
  switch (type) {
    case 'fire':
      for (const [fx, fy] of [[0.28, 0.62], [0.5, 0.55], [0.7, 0.66]]) layer.add(scene.add.sprite(...at(fx, fy), 'effects', 'fire-0').setScale(3).play('fire'));
      for (let i = 0; i < 3; i++) loopPuff(`smoke-${i}`, 0.3 + i * 0.2, 0.35, i * 700);
      break;
    case 'smoke':
      for (let i = 0; i < 4; i++) loopPuff(`smoke-${i % 3}`, 0.25 + i * 0.17, 0.5, i * 550);
      break;
    case 'toxic':
      layer.add(scene.add.rectangle(x, y, w, h, hex('#5cbf4a'), 0.16).setOrigin(0));
      for (let i = 0; i < 5; i++) loopPuff(`toxic-${i % 3}`, 0.15 + i * 0.17, 0.6, i * 450);
      break;
    case 'sparks':
      for (const [fx, fy] of [[0.3, 0.45], [0.55, 0.35], [0.78, 0.5]]) layer.add(scene.add.sprite(...at(fx, fy), 'effects', 'spark-0').setScale(3).play('spark'));
      break;
    case 'glitch':
      for (const [fx, fy] of [[0.25, 0.4], [0.5, 0.55], [0.75, 0.35]]) layer.add(scene.add.sprite(...at(fx, fy), 'effects', 'glitch-0').setScale(3).play('glitch'));
      break;
    case 'flood': {
      const water = scene.add.rectangle(x, y + h * 0.78, w, h * 0.22, hex('#48b3ea'), 0.6).setOrigin(0);
      layer.add(water);
      scene.tweens.add({ targets: water, y: y + h * 0.74, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      for (const fx of [0.2, 0.5, 0.8]) layer.add(scene.add.sprite(...at(fx, 0.8), 'effects', 'splash-0').setScale(3).play('splash'));
      break;
    }
    case 'crack':
      [['crack-1', 0.22, 0.86], ['crack-2', 0.52, 0.9], ['crack-3', 0.8, 0.84]].forEach(([f, fx, fy]) => layer.add(scene.add.image(...at(fx, fy), 'effects', f).setScale(3)));
      break;
    case 'outage':
      layer.add(scene.add.rectangle(x, y, w, h, hex(UI.ink), 0.38).setOrigin(0));
      for (const fx of [0.3, 0.7]) layer.add(scene.add.sprite(...at(fx, 0.3), 'effects', 'beacon-red-0').setScale(3).play('beacon-red'));
      break;
    default:
      break;
  }
  return layer;
}

class ChoiceButton extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, choice, number, { sim, onChoose, onHover, onOut }) {
    super(scene, x, y);
    this.choice = choice;
    this.onChoose = onChoose;
    this.onHoverCb = onHover;
    this.onOut = onOut;
    this.w = w;
    this.h = h;
    this.ring = panel(scene, -10, -10, w + 20, h + 20, 'select-gold').setVisible(false);
    this.bg = panel(scene, 0, 0, w, h, choice.locked ? 'card-inset' : 'card');
    this.add([this.ring, this.bg]);
    this.add(scene.add.image(34, h / 2, 'ui', choice.locked ? 'badge-stone' : 'badge-violet').setScale(3));
    if (choice.locked) this.add(scene.add.image(34, h / 2, 'icons', 'ui-lock').setScale(2));
    else this.add(scene.add.text(34, h / 2 - 2, String(number), textStyle({ size: 28, font: 'display', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0.5));

    // tags: role-only, risk, underfunded, locked
    const tags = [];
    if (choice.role) tags.push(tag(scene, 0, 0, `${CHARACTER_BY_ID[choice.role].name.toUpperCase()} ONLY`, { color: CHARACTER_BY_ID[choice.role].color, size: 13, height: 26, pad: 8, iconFrame: null }));
    if (choice.locked) tags.push(tag(scene, 0, 0, `NEED ${choice.cost} BUDGET`, { color: 'red', size: 13, height: 26, pad: 8 }));
    else if (choice.underfunded) tags.push(tag(scene, 0, 0, 'UNDERFUNDED · 50%', { color: 'red', size: 13, height: 26, pad: 8 }));
    if (choice.risk > 0) {
      const next = (choice.followUpTitle || '').split(' ').slice(0, 2).join(' ');
      const text = sim.perk('seeRisk') ? `${Math.round(choice.risk * 100)}% RISK: ${next}` : 'RISKY';
      tags.push(tag(scene, 0, 0, text.toUpperCase(), { color: 'orange', size: 13, height: 26, pad: 8 }));
    } else if (choice.tags.includes('bold')) {
      tags.push(tag(scene, 0, 0, 'BOLD', { color: 'orange', size: 13, height: 26, pad: 8 }));
    }
    // tags are stickers on the button's top edge; the label wraps before it runs under them
    const tagsW = tags.reduce((sum, t) => sum + t.width + 6, 0);
    this.label = scene.add.text(70, 14, choice.label, textStyle({ size: 22, weight: '900', color: choice.locked ? UI.inkSoft : UI.ink, wrap: w - 90 }));
    if (tagsW && 70 + this.label.width > w - 12 - tagsW) this.label.setWordWrapWidth(Math.max(180, w - 90 - tagsW), true);
    let tx = w - 10;
    for (const t of tags) {
      t.x = tx - t.width;
      t.y = 0;
      tx -= t.width + 6;
    }
    this.add(this.label);
    this.add(chipRow(scene, 70, h - 24, choice.effects, {
      cost: choice.cost,
      costLabel: choice.underfunded ? `ALL (${Math.floor(sim.budget)})` : null,
      lingering: choice.lingering,
      size: 20,
      maxWidth: w - 84
    }));
    for (const t of tags) this.add(t);
    if (choice.locked) this.setAlpha(0.55);

    this.setSize(w, h);
    this.bg.setInteractive({ useHandCursor: !choice.locked });
    this.bg.on('pointerover', () => this.hover(true));
    this.bg.on('pointerout', () => this.hover(false));
    this.bg.on('pointerdown', () => { this.pressed = true; });
    this.bg.on('pointerup', () => { if (this.pressed) this.activate(); this.pressed = false; });
    scene.add.existing(this);
  }

  hover(on) {
    if (this.choice.locked) return;
    this.bg.setFrame(on ? 'card-white' : 'card');
    this.scene.tweens.add({ targets: this, x: this.baseX + (on ? -6 : 0), duration: 110 });
    if (on) {
      bus.emit('sfx', 'hover');
      this.onHoverCb?.(this);
    } else {
      this.onOut?.(this);
    }
  }

  setFocus(on) {
    this.ring.setVisible(on);
    if (on) this.onHoverCb?.(this);
  }

  activate() {
    if (this.choice.locked) {
      bus.emit('sfx', 'deny');
      this.scene.tweens.add({ targets: this, x: this.baseX + 8, duration: 50, yoyo: true, repeat: 2 });
      return;
    }
    this.onChoose?.(this.choice);
  }
}

export class EventCard {
  constructor(scene, sim, { onChoose, onPreview }) {
    this.scene = scene;
    this.sim = sim;
    this.onChoose = onChoose;
    this.onPreview = onPreview;
    this.container = null;
    this.ev = null;
    this.buttons = [];
    this.focusIndex = -1;
  }

  get open() {
    return !!this.ev;
  }

  show(ev) {
    this.destroy();
    this.ev = ev;
    const s = this.scene;
    const w = CARD.w;
    const c = s.add.container(GAME_WIDTH + 20, CARD.y).setDepth(20);
    this.container = c;
    const def = ev.def;
    const head = KIND_HEADER[def.kind] || SEVERITY[def.severity];
    const nChoices = ev.choices.length;
    const vh = nChoices >= 4 ? 138 : 186;
    const choiceH = nChoices >= 4 ? 100 : 106;

    const bg = panel(s, 0, 0, w, 200, 'card-white');
    c.add(bg);
    // header
    c.add(panel(s, 0, 0, w, 58, `band-${head.color}`));
    c.add(s.add.image(32, 29, 'icons', categoryIcon(def.category)).setScale(categoryIcon(def.category).startsWith('scn') ? 1.5 : 2));
    const light = head.color === 'yellow' || head.color === 'green' || head.color === 'coral';
    c.add(s.add.text(60, 29, head.label, textStyle({ size: 24, font: 'display', color: light ? UI.ink : UI.white, stroke: light ? null : UI.ink, strokeThickness: light ? 0 : 6 })).setOrigin(0, 0.5));
    const badges = [];
    if (ev.surge) badges.push(tag(s, 0, 29, 'SURGE', { color: 'red', size: 14, height: 28, pad: 8 }));
    if (ev.softened) badges.push(tag(s, 0, 29, 'SOFTENED', { color: 'cyan', size: 14, height: 28, pad: 8 }));
    let bx = w - 12;
    for (const b of badges) {
      b.x = bx - b.width;
      bx -= b.width + 6;
      c.add(b);
    }

    // district illustration + hazard
    let y = 58;
    const cropRows = Math.round(vh / 3);
    const cropY = Math.max(0, 86 - cropRows);
    const vig = s.add.image(10, y + 8 - cropY * 3, 'vignettes', VIGNETTE_INDEX[def.district] ?? 0).setOrigin(0).setScale(3);
    vig.setCrop(0, cropY, 160, cropRows);
    c.add(vig);
    if (def.hazard) c.add(hazardLayer(s, def.hazard, 10, y + 8, 480, vh));
    const dtag = tag(s, 20, y + vh - 18, DISTRICT_BY_ID[def.district].name.toUpperCase(), { color: DISTRICT_COLOR[def.district] || 'violet', size: 15, height: 30, pad: 10, iconFrame: 'ui-flag' });
    c.add(dtag);
    y += vh + 20;

    // title + text
    const title = s.add.text(20, y, def.title.toUpperCase(), textStyle({ size: 31, font: 'display', color: UI.violetDeep, wrap: w - 40, lineSpacing: -4 }));
    c.add(title);
    y += title.height + 6;
    const text = s.add.text(20, y, def.text, textStyle({ size: 20, weight: '700', wrap: w - 40, lineSpacing: -1 }));
    c.add(text);
    y += text.height + 12;

    // impact already felt
    const applied = Object.fromEntries(Object.entries(ev.impactApplied || {}).map(([k, v]) => [k, Math.round(v)]).filter(([, v]) => v));
    if (Object.keys(applied).length) {
      c.add(s.add.text(20, y + 19, 'IMPACT', textStyle({ size: 16, weight: '900', color: UI.red })).setOrigin(0, 0.5));
      c.add(chipRow(s, 92, y + 19, applied, { size: 18 }));
      y += 48;
    }

    // responses
    this.buttons = ev.choices.map((choice, i) => {
      const b = new ChoiceButton(s, 20, y + i * (choiceH + 10), w - 40, choiceH, choice, i + 1, {
        sim: this.sim,
        onChoose: (ch) => this.onChoose(ch.id),
        onHover: (btn) => { this.focus(this.buttons.indexOf(btn), false); this.onPreview(btn.choice); },
        onOut: () => this.onPreview(this.focusIndex >= 0 ? this.buttons[this.focusIndex]?.choice : null)
      });
      b.baseX = 20;
      c.add(b);
      return b;
    });
    y += nChoices * (choiceH + 10) + 4;

    // response timer + what ignoring costs
    c.add(s.add.text(20, y + 16, 'RESPOND IN', textStyle({ size: 17, weight: '900', color: UI.inkSoft })).setOrigin(0, 0.5));
    this.timerBar = new Bar(s, 136, y + 3, { width: 290, height: 27, fill: 'teal' });
    c.add(this.timerBar);
    this.timerText = s.add.text(w - 20, y + 16, '', textStyle({ size: 26, weight: '900' })).setOrigin(1, 0.5);
    c.add(this.timerText);
    y += 42;
    if (Object.keys(ev.ignore).length) {
      c.add(s.add.text(20, y + 18, 'NO RESPONSE', textStyle({ size: 15, weight: '900', color: UI.red })).setOrigin(0, 0.5));
      c.add(chipRow(s, 136, y + 18, ev.ignore, { size: 17, maxWidth: w - 156 }));
      y += 44;
    }
    const height = Math.min(CARD.maxH, y + 12);
    resizePanel(bg, w, height);
    this.height = height;

    s.tweens.add({ targets: c, x: CARD.x, duration: 360, ease: 'Back.easeOut' });
    this.focusIndex = -1;
    this.update();
  }

  focus(i, preview = true) {
    if (!this.buttons.length) return;
    const n = this.buttons.length;
    i = ((i % n) + n) % n;
    this.buttons[this.focusIndex]?.setFocus(false);
    this.focusIndex = i;
    this.buttons[i].setFocus(true);
    if (preview) this.onPreview(this.buttons[i].choice);
  }

  /** Keyboard: 1–4 choose directly, ↑/↓ move, Enter confirms. Returns true if handled. */
  handleKey(e) {
    if (!this.ev) return false;
    const n = Number(e.key);
    if (n >= 1 && n <= this.buttons.length) {
      this.buttons[n - 1].activate();
      return true;
    }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      this.focus(this.focusIndex < 0 ? 0 : this.focusIndex + (e.code === 'ArrowDown' ? 1 : -1));
      return true;
    }
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && this.focusIndex >= 0) {
      this.buttons[this.focusIndex].activate();
      return true;
    }
    return false;
  }

  /** Budget or a boost changed the numbers while the card is open. */
  refresh(ev) {
    const keep = this.focusIndex;
    const x = this.container?.x;
    this.show(ev);
    this.scene.tweens.killTweensOf(this.container);
    this.container.x = x ?? CARD.x;
    if (keep >= 0) this.focus(keep, false);
  }

  update() {
    const ev = this.ev;
    if (!ev || !this.timerBar) return;
    const f = ev.remaining / ev.window;
    this.timerBar.setValue(f, false);
    this.timerBar.setFillFrame(f > 0.5 ? 'teal' : f > 0.25 ? 'energy' : 'red');
    const secs = Math.ceil(ev.remaining);
    if (secs !== this.lastSecs) {
      this.lastSecs = secs;
      this.timerText.setText(`${secs} s`);
      this.timerText.setColor(f > 0.25 ? UI.ink : UI.red);
      if (f <= 0.25 && secs > 0) bus.emit('sfx', 'tick');
    }
  }

  /** Close with feedback on the chosen response. */
  resolve(decision) {
    const c = this.container;
    if (!c) return;
    const chosen = this.buttons.find((b) => b.choice.id === decision.choiceId);
    for (const b of this.buttons) if (b !== chosen) this.scene.tweens.add({ targets: b, alpha: 0.25, duration: 200 });
    if (chosen) this.scene.tweens.add({ targets: chosen, scale: 1.04, duration: 140, yoyo: true });
    this.ev = null;
    this.buttons = [];
    this.scene.tweens.add({ targets: c, x: GAME_WIDTH + 20, duration: 320, delay: decision.ignored ? 150 : 520, ease: 'Back.easeIn', onComplete: () => c.destroy() });
    this.container = null;
    this.timerBar = null;
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.ev = null;
    this.buttons = [];
    this.timerBar = null;
    this.lastSecs = null;
  }
}
