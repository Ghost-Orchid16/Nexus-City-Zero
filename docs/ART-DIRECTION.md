# NEXUS: CITY ZERO — art direction brief

"A modern indie game built with the soul of an older 2D game." Bright, warm, slightly retro,
playful but serious. Never dark cyberpunk, never a black terminal, never a corporate dashboard.

## Game frame

- **Player fantasy:** emergency commander keeping a living city alive through cascading crises.
- **Core verbs:** read the city, choose a response, watch the consequences ripple.
- **Engine / renderer:** Phaser 4.2, WebGL, `render.smoothPixelArt: true`.
- **Platforms:** exhibition laptop + large external monitor (1080p or 4K), mouse, touch or keyboard.
- **Camera / view:** 3/4 top-down (ground seen from above, objects show roof + front facade).
- **Native viewport:** 1920×1080 reference, `Scale.FIT`. World art is drawn at native size and shown at 3×
  (world camera zoom 3, focus zoom 4). UI sprites are scaled 3×; text is code-native at 1:1.
- **Typical on-screen size:** houses ~80–100 px, hospital ~190 px, cars ~50 px, citizens ~40 px tall.

## Visual system

- **Shape language:** chunky rounded boxes, storybook front-gable houses, clear silhouettes; friendly
  roundness for civic buildings, angular hazard shapes (triangles, bolts, cracks) for danger.
- **Silhouettes:** every building keeps a readable roof line + facade; props never merge into roofs;
  vehicles and people carry a 1 px ink outline so they read over any ground.
- **Value structure:** 5-step hue-shifted ramps (index 0 darkest → 4 lightest). Light from the upper
  left: lit left/top edges, shaded right/bottom edges, cast shadows fall to the lower right.
- **Palette roles** (`src/config/palette.js`):
  - Ink/outline: plum `#261a3a` (never pure black).
  - Environment: green/lime foliage, cream/sand/brown built surfaces, stone paving, asphalt `#4c4e6a`.
  - Water: `water` ramp with foam `#9be3fb` shorelines.
  - Identity accents: teal, cyan, sky, orange, yellow, coral, violet, magenta.
  - Emergency: red ramp only for critical states, alerts and hazards.
  - Night: warm `glow` ramp for windows and lamps (additive), violet dusk ambience.
- **System colors:** energy yellow, water blue, health coral, transport orange, infrastructure brown,
  safety violet, communication cyan, supplies green, budget magenta. Always paired with an icon so
  state never depends on color alone.
- **Materials:** glass = structured diagonal sky reflections (never random noise); brick = coursing
  lines; foliage = leaf clusters shaded by a light vector; water = depth bands with dithered edges.
- **Edges:** hard pixel clusters; ordered (Bayer) dithering only for gradients (sky, water depth).
- **Detail density:** concentrated on facades and roofs; ground stays calm (flat fills + sparse clusters).
- **Motion:** gentle and readable — water drifts, turbines turn, radar sweeps, clarifiers rotate, traffic
  flows; emergencies flash two-frame light bars. Feedback eases in/out and returns to rest.
- **Exclusions:** photorealism, 3D renders, flat corporate icons, neon-on-black, green terminal text,
  copied artwork from any reference.

## Technical contract

- **Tiles:** 16×16 world tiles; the whole ground is pre-rendered (`assets/city/ground.png`, 720×400).
- **Anchors:** world sprites bottom-center on an integer pixel column (`anchorBottom()`); depth = baseline y.
- **Alpha:** transparent PNG, no premultiplied halos; glows are the only soft-alpha sprites.
- **Filtering:** smooth-pixel-art sampling; CSS uses `pixelated` at exact integer device scales.
- **Atlases:** JSON-hash atlases per family (`assets/*/*.json`), 2 px padding, power-of-two sheets.
- **Budget:** entire art set ≈ 0.3 MB; largest texture 1024×256.
- **Naming:** `family-variant[-state][-frame]`, e.g. `ambulance-side-1`, `house-a-lights`.

## Visual target (approved)

- Seed/style board: `tools/art/styleboard.mjs` → `tools/art/out/styleboard.png` (hospital, glass tower,
  storybook houses, factory, trees, full vehicle set on real ground at 3×).
- In-engine captures: the city at golden hour and in a dusk crisis (fires, flood, blackout, rain) were
  reviewed at 1920×1080 before the full catalog was produced.
- Do: flat calm ground, clustered texture, one light direction, plum outlines, bright accents.
- Don't: per-pixel noise on large areas, dithered shadows, random-checker glass, pure black outlines.
- Direction delegated to the build; recorded 2026-09-25.

## Provenance

All images are original, authored in code by the art forge (`tools/art/`), regenerated with
`npm run art`, and listed with provenance in `assets/asset-manifest.json`. Fonts are Pixelify Sans
and Nunito (SIL Open Font License), bundled from `@fontsource`.
