# NEXUS: CITY ZERO

**15 minutes until city collapse.** You are the emergency commander of NEXUS, a bright pixel-art
city whose systems are failing one after another. Pick a role, pick a crisis, and make fast
decisions with real trade-offs while power, water, health, transport and everything else
drag each other down. Every choice has a price, failures spread, and when the countdown ends
the game tells you how many citizens you protected and what kind of commander you were.

A 2D browser game built with Phaser 4 for an IT exhibition: one visitor, 3–5 minutes, no
login, playable by children and adults with a mouse, touch or keyboard. After the page has
loaded, the game runs fully offline. It makes no network calls and uses no external AI service.

## Quick start

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build (static files, runs from any folder or web server):

```bash
npm run build        # writes dist/
npm run preview      # serves dist/ at http://localhost:4173
```

## Running it at an exhibition

Open the game with `?exhibition` (for example `http://localhost:4173/?exhibition`) or switch on
**Settings → EXHIBITION MODE**. Exhibition Mode changes:

| Where | What happens |
|---|---|
| Title screen | After 45 s without input, an attract-mode demo plays a real run with the autopilot. Any key, click or touch returns to the title. |
| Tutorial | Four short spotlight steps that advance on their own (5 s each), shown once per visitor. |
| Random reveals | RANDOM CHARACTER, CHAOS MODE, RANDOMIZE EVERYTHING and RANDOM RUN continue on their own. |
| Menus | Character, crisis and Hall of Commanders screens return to the title after 60 s idle. |
| Report | The report and timeline return to the title after 75 s idle. **RESET** does it at once. |

The **Hall of Commanders** scoreboard and achievements are saved in the browser's
`localStorage` on that machine. Commanders get fictional names (e.g. *CMDR. CLOVER WALRUS*,
re-rollable on the report). There are no accounts or personal data. To start an event with an empty
board: **Settings → CLEAR SCOREBOARD**.

Kiosk tips:

- Serve `dist/` locally (`npm run preview` or any static server) and open it in a browser
  kiosk window, e.g. `chromium --kiosk "http://localhost:4173/?exhibition"`.
- The game is authored for 1920×1080 and scales to any screen. On a 4K display it scales by
  exactly 2× and stays pixel-sharp. Other aspect ratios are letterboxed, never stretched.
- Browsers only start audio after the first click or key press, so the game is silent until a
  visitor touches it. Volume, mute and **REDUCED MOTION** (calmer animations, no camera sweeps)
  are in Settings; reduced motion also follows the operating-system setting.

## Controls

| Action | Mouse / touch | Keyboard |
|---|---|---|
| Navigate menus | Click / tap | Arrow keys, Enter or Space, Esc = back |
| Answer a crisis | Click a response | `1`–`4`, or ↑/↓ then Enter |
| Special ability | Click the ability card | `E` |
| Pause | Pause button | `Esc` or `P` |

## How a run works

1. **Start**: PLAY, 🎲 RANDOMIZE EVERYTHING, Hall of Commanders or Settings.
2. **Character**: seven roles with real strengths, a weakness and one special ability each (or
   🎲 RANDOM CHARACTER).
3. **Crisis theme**: nine themed crises, each with its own starting city and a special rule, plus
   🎲 CHAOS MODE (two crises at once and a surprise twist) and SURPRISE CONDITIONS.
4. **Short tutorial**: four steps on the live HUD. It can be skipped.
5. **City simulation**: a 15:00 countdown compressed into about four minutes. Crises arrive as
   cards with 2–4 responses. Nothing is free, and nothing is obviously right.
6. **Cascades**: a system below its danger line drains the systems that depend on it, and they
   show it on the map.
7. **Adaptive difficulty**: the crisis level (1–5) follows how you are doing. The numbers on the
   cards always show the current values.
8. **Final minute**: CRITICAL WINDOW (60 s), SYSTEM CASCADE IMMINENT (30 s), CITY STABILITY CRITICAL
   (10 s).
9. **Final city report**: survival %, every system, citizens protected, resources, decisions,
   cascades and your **play style**, measured from your decisions.
10. **Decision timeline + What-If**: every decision on the clock. Replay any of them with a
    different response in a sandbox simulation and see the simulated difference. Your real
    score never changes.
11. **Play again**: same setup with a new event order, a random run, or reset for the next visitor.

The full rules (systems, dependencies, roles, themes, the adaptive engine, strategy analysis,
scoring and balance data) are in [docs/GAME-DESIGN.md](docs/GAME-DESIGN.md).

## Development

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm run preview` | Production build in `dist/` / serve it |
| `npm test` | Unit tests: simulation, cascades, What-If, strategy analysis, scoring, profile, data validation |
| `npm run test:e2e` | Playwright tests that boot the real game in Chromium (mouse, keyboard, full run, exhibition mode, scaling) |
| `npm run balance` | Monte Carlo balance report: every role × crisis theme × bot strategy, with invariant checks |
| `npm run styles` | Checks that deliberately biased bot players are recognized as their play style |
| `npm run art` | Regenerates all pixel art into `assets/` (the art is authored in code) |

Useful URL flags in development:

- `?exhibition`: Exhibition Mode (see above).
- `?test`: exposes `window.__NEXUS__` debug hooks. With `&start=game&role=engineer&theme=water&seed=demo`
  it starts that exact run (`start` can also be `character`, `scenario` or `hall`).

### Project layout

```
src/
  sim/        headless, deterministic simulation (no Phaser): rules, cascades, event director,
              adaptive engine, command-AI messages, strategy analysis, scoring, What-If, autopilot
  data/       all content as plain data: roles, crisis themes, 66 crisis events, systems and
              their dependencies, city layout, achievements, commander names
  scenes/     Phaser scenes: Boot, Preload, Title, Character, Scenario, Game, Hud, Results,
              Timeline, Hall, Settings
  world/      the living city: tile map, buildings, traffic, pedestrians, lights, effects
  ui/         UI kit (panels, buttons, bars, focus navigation), HUD widgets, cards, charts
  audio/      procedural Web Audio sound effects, ambience and music (no audio files)
  core/       seeded RNG, event bus, session, versioned localStorage profile, idle watcher
assets/       generated pixel-art atlases (do not edit by hand; run `npm run art`)
tools/        art forge, balance and play-style tools, screenshot QA script
tests/        unit tests (Node test runner) and end-to-end tests (Playwright)
```

The simulation is pure JavaScript driven by a seeded random generator, so the same seed and the
same decisions always produce the same run. That makes the What-If replays, the attract-mode demo,
the balance tool and the unit tests possible. Content is data: adding a crisis, a role or an
achievement means adding an entry in `src/data/`, and `tests/unit/data.test.js` validates it.

## Credits

- Engine: [Phaser 4](https://phaser.io) (MIT).
- Fonts: Pixelify Sans and Nunito (SIL Open Font License), bundled through `@fontsource`.
- All pixel art, music and sound effects are original and generated in code in this repository.
