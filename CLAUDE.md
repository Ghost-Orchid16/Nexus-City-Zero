# NEXUS: CITY ZERO — project guide

2D browser crisis-management game for an IT exhibition (children and adults). The player is the
emergency commander of a city whose systems fail in cascades. Sessions last 3–5 minutes.

These decisions override the defaults in `.claude/skills/` (see `.claude/skills/README.md`).

## Stack

- **Phaser 4.2** (`phaser` in `package.json`), WebGL renderer, plain JavaScript ES modules.
- **Vite** for dev server and production build (`base: './'` so `dist/` runs from any folder).
- Phaser ships version-matched agent docs in `node_modules/phaser/skills/` and
  `node_modules/phaser/docs/`. Read those before using an unfamiliar Phaser 4 API; do not copy
  Phaser 3 snippets (masks are filters, `setTintFill` is gone, RenderTextures need `render()`).
- Fonts are bundled from `@fontsource` (Pixelify Sans for display, Nunito for body text), so the
  game works fully offline. No external APIs, no network at runtime.

## Rendering contract

- Reference resolution **1920×1080**, `Scale.FIT`, centered. Every layout is authored for this
  size and anchored to edges/center (`src/config/layout.js`).
- Pixel art is drawn at native size and displayed at **3×** (world camera zoom 3; UI sprites
  scaled 3). Config uses `render.smoothPixelArt: true` (crisp pixels, smooth edges, no flicker
  when the camera zooms). Do not mix in `pixelArt`/`roundPixels`.
- World: 640×360 native px, 16 px tiles, 3/4 top-down view, light from the upper left,
  bottom-center anchors, depth = baseline y.
- Text is code-native (Phaser Text) at 1:1 scale on integer positions. Never bake text into art.

## Architecture rules

- `src/sim/` is a **headless, deterministic simulation** (no Phaser imports). It owns all game
  rules and is driven by a seeded RNG (`src/core/rng.js`). Scenes only render its state and
  forward player intents. This is what makes What-If replays, the attract-mode demo, and the
  Monte Carlo balance tool possible — keep it pure.
- Content is **data-driven**: characters, scenarios, events, resources, dependencies,
  achievements and messages live in `src/data/`. Adding content must not require editing
  systems code. `tests/unit/data.test.js` validates every record.
- Systems talk through `src/core/event-bus.js` and the simulation's emitted events; the HUD is
  event-driven, not polled.
- Reset run state in scene `init()`, remove global listeners on `shutdown`.
- Persistence goes through `src/core/storage.js` (versioned schema, validation, backup key).

## Art pipeline

All art is original pixel art authored in code by the "art forge" in `tools/art/` and written to
`assets/` as PNG atlases + JSON. Palette: `src/config/palette.js` (shared by forge and game).
Style rules: `docs/ART-DIRECTION.md`. After changing art code run `npm run art` and inspect the
contact sheets in `tools/art/out/` before committing. Never hand-edit files in `assets/`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm run preview` | Production build in `dist/` / serve it |
| `npm run art` | Regenerate all art into `assets/` |
| `npm test` | Unit tests (simulation, data validation, storage) — Node test runner |
| `npm run test:e2e` | Playwright browser tests (boots the real game) |
| `npm run balance` | Monte Carlo balance report over characters × scenarios × bot policies |

## Quality bar

No placeholders, TODOs, dead buttons or fake statistics in shipped UI. Every number on the results
screen is computed from the run. Verify visual work by screenshot at 1920×1080, not by assumption.
