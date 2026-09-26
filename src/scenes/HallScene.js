import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/layout.js';
import { UI } from '../config/palette.js';
import { CHARACTER_BY_ID } from '../data/characters.js';
import { SCENARIO_BY_ID } from '../data/scenarios.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { BOARDS, BOARD_SIZE } from '../core/profile.js';
import { profileStore } from '../core/storage.js';
import { isExhibition, reducedMotion } from '../core/session.js';
import { IdleWatcher } from '../core/idle.js';
import { textStyle } from '../ui/theme.js';
import { Button, panel, transitionTo, fadeIn } from '../ui/components.js';
import { FocusGroup } from '../ui/focus.js';
import { Backdrop } from '../ui/backdrop.js';

const MEDALS = ['ui-crown', 'ui-medal', 'ui-medal', 'ui-star', 'ui-star'];

/** HALL OF COMMANDERS: local scoreboard (5 categories) and achievements. No accounts. */
export default class HallScene extends Phaser.Scene {
  constructor() {
    super('hall');
  }

  init() {
    this.board = BOARDS[0].id;
  }

  create() {
    fadeIn(this);
    this.profile = profileStore().get();
    this.backdrop = new Backdrop(this, { speed: reducedMotion() ? 0 : 0.5, tint: 0xfff0d0 });
    this.add.text(GAME_WIDTH / 2, 52, 'HALL OF COMMANDERS', textStyle({ size: 58, font: 'display', color: UI.yellow, stroke: UI.ink, strokeThickness: 10 })).setOrigin(0.5);
    const st = this.profile.stats;
    this.add.text(GAME_WIDTH / 2, 104, `Runs played ${st.runs} · Cities that survived ${st.completed} · Chaos victories ${st.chaosWins} · Decisions made ${st.decisions}`, textStyle({ size: 21, weight: '900', color: UI.white, stroke: UI.ink, strokeThickness: 6 })).setOrigin(0.5);

    this.focus = new FocusGroup(this, { onCancel: () => this.back() });
    // scoreboard
    panel(this, 40, 140, 1000, 820, 'card-white');
    this.tabs = BOARDS.map((b, i) => {
      const t = new Button(this, 150 + i * 198, 196, { text: b.short, width: 188, height: 72, color: 'blue', size: b.short.length > 11 ? 16 : 20, sfx: 'tick', onClick: () => this.showBoard(b.id) });
      this.focus.add(t);
      return t;
    });
    this.table = this.add.container(0, 0);
    this.showBoard(this.board);

    // achievements
    panel(this, 1060, 140, 820, 820, 'card-white');
    const unlocked = Object.keys(this.profile.achievements).length;
    this.add.text(1090, 184, 'ACHIEVEMENTS', textStyle({ size: 32, font: 'display', color: UI.violetDeep })).setOrigin(0, 0.5);
    this.add.text(1850, 184, `${unlocked} / ${ACHIEVEMENTS.length}`, textStyle({ size: 26, font: 'display' })).setOrigin(1, 0.5);
    ACHIEVEMENTS.forEach((a, i) => {
      const x = 1080 + (i % 2) * 395;
      const y = 226 + Math.floor(i / 2) * 104;
      const got = this.profile.achievements[a.id];
      panel(this, x, y, 385, 96, got ? 'card' : 'card-inset');
      this.add.image(x + 46, y + 48, 'ui', got ? `badge-${a.color}` : 'badge-stone').setScale(4);
      this.add.image(x + 46, y + 47, 'icons', got ? a.icon : a.secret ? 'ui-lock' : a.icon).setScale(2).setAlpha(got ? 1 : 0.6);
      const hidden = a.secret && !got;
      this.add.text(x + 88, y + 24, hidden ? 'SECRET ACHIEVEMENT' : a.name, textStyle({ size: 18, weight: '900', color: got ? UI.ink : UI.inkSoft })).setOrigin(0, 0.5);
      this.add.text(x + 88, y + 44, hidden ? 'Keep playing different ways to discover it.' : a.text, textStyle({ size: 14, weight: '700', color: UI.inkSoft, wrap: 285, lineSpacing: -2 }));
    });

    const back = new Button(this, 240, 1024, { text: 'BACK', width: 300, height: 76, color: 'stone', size: 28, sfx: 'back', onClick: () => this.back() });
    this.focus.add(back);
    this.focus.focus(0);
    if (isExhibition()) this.idle = new IdleWatcher(this, 60, () => this.back());
  }

  showBoard(id) {
    this.board = id;
    const b = BOARDS.find((x) => x.id === id);
    this.tabs.forEach((t, i) => t.bg.setFrame(BOARDS[i].id === id ? 'btn-orange' : 'btn-blue'));
    this.tabs.forEach((t, i) => { t.color = BOARDS[i].id === id ? 'orange' : 'blue'; });
    this.table.removeAll(true);
    const T = this.table;
    const list = this.profile.boards[id];
    T.add(this.add.text(70, 270, b.title, textStyle({ size: 30, font: 'display', color: UI.violetDeep })));
    const note = { survival: 'Best city survival in a single run.', citizens: 'Share of citizens protected (completed runs).', efficiency: 'Survival per budget spent (completed runs).', failures: 'Fewest systems hitting the failure line (completed runs).', chaos: 'Chaos Mode runs where the city survived.' }[id];
    T.add(this.add.text(70, 312, note, textStyle({ size: 18, weight: '800', color: UI.inkSoft })));
    if (!list.length) {
      T.add(this.add.text(540, 560, 'No commanders here yet.\nPlay a run to claim the first spot!', textStyle({ size: 26, weight: '900', color: UI.inkSoft, align: 'center' })).setOrigin(0.5));
      return;
    }
    for (let i = 0; i < BOARD_SIZE; i++) {
      const e = list[i];
      const y = 352 + i * 116;
      T.add(panel(this, 64, y, 952, 104, i === 0 ? 'card' : 'card-inset'));
      T.add(this.add.image(114, y + 52, 'icons', MEDALS[i]).setScale(2.4).setAlpha(e ? 1 : 0.3));
      T.add(this.add.text(160, y + 52, `${i + 1}`, textStyle({ size: 36, weight: '900', color: UI.inkSoft })).setOrigin(0, 0.5));
      if (!e) continue;
      const role = CHARACTER_BY_ID[e.character];
      T.add(this.add.image(236, y + 52, 'ui', `badge-${role.color}`).setScale(4.4));
      T.add(this.add.image(236, y + 54, 'portraits', role.portrait).setScale(1.3));
      T.add(this.add.text(290, y + 34, e.name, textStyle({ size: 24, weight: '900' })).setOrigin(0, 0.5));
      const scn = SCENARIO_BY_ID[e.scenario];
      T.add(this.add.image(302, y + 72, 'icons', scn.icon).setScale(1));
      T.add(this.add.text(322, y + 72, `${role.name} · ${scn.name}${e.date ? ` · ${e.date.slice(0, 10)}` : ''}`, textStyle({ size: 16, weight: '800', color: UI.inkSoft })).setOrigin(0, 0.5));
      T.add(this.add.text(990, y + 52, `${e.value}${b.unit}`, textStyle({ size: 42, weight: '900', color: i === 0 ? UI.orangeDeep : UI.ink })).setOrigin(1, 0.5));
    }
  }

  back() {
    transitionTo(this, 'title');
  }

  update(time, delta) {
    const dt = Math.min(0.1, delta / 1000);
    this.backdrop.update(dt);
    this.idle?.update(dt);
  }
}
