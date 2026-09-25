# NEXUS: CITY ZERO — project-local Claude Code skills

Game-development skills vendored from four public MIT-licensed repositories.
Claude Code discovers each one at `.claude/skills/<skill-name>/SKILL.md`, and the folder
name is the slash command (for example `/threejs-game-director`). Skills must sit
one level deep, so the layout is flat and this file does the grouping.

Skill folders are copied verbatim from upstream. The only additions are the
supporting files noted under "Local additions" below.

## Skills by area

### Browser game engineering: Three.js (majidmanzarpour/threejs-game-skills, all 9)
| Skill | Use for |
|---|---|
| `threejs-game-director` | Entry point for building, upgrading, and finishing a Three.js game. Routes to the siblings below. |
| `threejs-gameplay-systems` | Core loop, entities, input, camera, collision/physics, scoring, game feel. Includes a Vite + TypeScript scaffold. |
| `threejs-game-ui-designer` | HUDs, menus, overlays, touch UI, responsive layout. |
| `threejs-aaa-graphics-builder` | Art direction, materials, shaders, VFX, lighting, LOD/instancing, visual scorecard. |
| `threejs-debug-profiler` | Blank canvases, runtime bugs, draw calls, memory, shader cost. |
| `threejs-qa-release` | Playtest QA, bot playtests, visual regression, production build checks. |
| `threejs-3d-generator` | Optional. Generated 3D models via Tripo (`TRIPO_API_KEY`). |
| `threejs-image-generator` | Optional. Generated 2D art via Gemini (`GEMINI_API_KEY`). |
| `threejs-audio-generator` | Optional. Generated audio via ElevenLabs (`ELEVENLABS_API_KEY`). |

The three generators are inert without their keys. The director falls back to procedural assets.

### Browser game engineering: engine-agnostic and 2D (PlayableIntelligence/game-creator)
| Skill | Use for |
|---|---|
| `game-architecture` | EventBus, centralized state, constants, restart safety, delta time, pooling, disposal. |
| `threejs-perf` | Instancing for hundreds of static or moving objects (buildings, vehicles, crowds) and draw-call budgets. |
| `phaser` | 2D option: Phaser 3 scene-based architecture, if NEXUS goes 2D. |
| `game-qa` | Playwright testing for any browser game: deterministic clock control, gameplay invariants, visual regression, mobile. |

### Game design: systems, difficulty, and balance (AlterLab-IEU/AlterLab_GameForge)
| Skill | Use for |
|---|---|
| `game-designer` | Mechanics, progression, dynamic difficulty adjustment (DDA), reward psychology, WFC procedural generation. |
| `game-balance-check` | Economy and difficulty validation: Flow channel, rubber-banding, Monte Carlo, reward pacing. |
| `game-accessibility-specialist` | Accessibility audits: colorblind modes, remapping, difficulty options, motor accommodations. |
| `game-code-review` | Game-specific code review: frame independence, hot paths, state machines, resource lifecycle. |

### Game design: full design lifecycle (baxatron-git/claude-game-design-suite, all 22)
Start with `design-coherence-engine`. It is the meta skill that picks and coordinates the other 21.
- **Foundation and identity:** `game-vision-architect`, `design-pillars-architect`, `aesthetic-direction-framework`
- **Intent:** `player-experience-modeler`, `high-concept-pitch-writer`, `game-market-analyst`
- **Structure:** `core-loop-designer`, `rules-formalizer`, `systems-interaction-mapper`, `economy-progression-designer`
- **Calibration:** `game-balance-analyst`
- **Substance:** `narrative-systems-designer`, `level-encounter-planner`, `world-logic-checker`
- **Proof:** `prototype-scope-definer`, `playtest-protocol-designer`, `design-iteration-tracker`, `ui-ux-systems-designer`
- **Delivery:** `gdd-author`, `scope-feature-prioritizer`, `technical-design-bridge`

## Notes for NEXUS

- **Project decisions override skill defaults.** Some skills assume a particular stack or
  publishing target. `game-architecture`, `phaser` and `game-qa` assume the Play.fun widget
  ("no title screen", "no in-game score HUD"). The Three.js suite defaults to TypeScript + Vite,
  and `game-architecture`/`phaser` default to JavaScript. Record the NEXUS choices in a root
  `CLAUDE.md` once they are made.
- **Nothing was installed.** Some skills tell you to add npm packages (for example `three`, `vite`,
  `@playwright/test`) to the game project when it is built. Those installs are for the game,
  not for the skills.
- **Template project inside the skills tree.**
  `threejs-gameplay-systems/assets/threejs-vite-game/` is the scaffold that the skill copies
  from, and it has its own `package.json`. When you set up lint, test or TypeScript tooling
  for NEXUS, exclude `.claude/` from their globs.

## AlterLab role names → installed equivalents

The four AlterLab skills sometimes say to hand off to AlterLab team roles that were not
installed. Use these instead:

| AlterLab role mentioned | Installed equivalent |
|---|---|
| `game-creative-director` | `game-vision-architect`, `design-pillars-architect` |
| `game-art-director` | `aesthetic-direction-framework`, `threejs-aaa-graphics-builder` |
| `game-audio-director` | `aesthetic-direction-framework`, `threejs-audio-generator` |
| `game-narrative-director` | `narrative-systems-designer`, `world-logic-checker` |
| `game-ux-designer` | `ui-ux-systems-designer`, `threejs-game-ui-designer` |
| `game-technical-director` | `game-architecture`, `technical-design-bridge` |
| `game-qa-lead` | `game-qa`, `threejs-qa-release`, `playtest-protocol-designer` |
| `game-producer` | `scope-feature-prioritizer` |
| `game-prototype` | `prototype-scope-definer` |

## Local additions (not in the upstream skill folders)

- `game-qa/scripts/iterate-client.js` and `game-qa/scripts/example-actions.json`: copied from
  game-creator's repo-level `scripts/`, because `game-qa` tells you to run `scripts/iterate-client.js`.
- `game-designer/`, `game-balance-check/`, `game-accessibility-specialist/`, `game-code-review/`:
  each has the AlterLab `docs/*.md` and `templates/*.md` files its SKILL.md references, placed at
  the same relative paths.

## Deliberately not installed

- **Godot, Unity, Unreal:** the AlterLab engine specialists (not relevant to a browser game).
- **Duplicates of skills installed above:** game-creator's `threejs-game`, `game-designer`,
  `qa-game`, `review-game`, `design-game`, `improve-game` and `add-*` wrappers. AlterLab's
  `game-gdd-author`, `game-playtest`, `game-scope-check`, `game-prototype`, `game-brainstorm`,
  `game-market-research`, `game-qa-lead`, `game-ux-designer`, `game-technical-director` and
  other role or workflow skills.
- **Services and publishing pipelines:** Play.fun monetization, PartyKit multiplayer, here.now
  deploy, Meshy, Retro Diffusion, World Labs, promo video, tweet-to-game, Steam/itch/console
  launch and CI. game-creator's `use-template` was skipped because it sends opt-out telemetry
  to a third-party endpoint.

## Sources (MIT; see `_licenses/`)

| Repository | Commit |
|---|---|
| https://github.com/majidmanzarpour/threejs-game-skills | `e5f301d548bb18c530afbece78cd25082f4cda9c` |
| https://github.com/PlayableIntelligence/game-creator | `4e64b83b5fe400b34ad3a484d9b4a6090b26d512` |
| https://github.com/AlterLab-IEU/AlterLab_GameForge | `5f5148d61986b32299070e87fcd4a1ab3718eacf` |
| https://github.com/baxatron-git/claude-game-design-suite | `5dd265ac2b143d13683766cdaae9695d3d871909` |
