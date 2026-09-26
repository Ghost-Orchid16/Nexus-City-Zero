# NEXUS: CITY ZERO — project-local Claude Code skills

Game-development skills vendored from public open-source repositories. Claude Code discovers
each one at `.claude/skills/<skill-name>/SKILL.md`, and the folder name is the slash command
(for example `/phaser-core`). Skills must sit one level deep, so the layout is flat and this
file does the grouping.

**Project direction:** NEXUS is a **2D** browser game built with **Phaser 4** (the version
`phaser-core` targets). The repository-root `CLAUDE.md` records the project decisions, and those
decisions override skill defaults.

## Start here

`router` detects the engine from `package.json` (`phaser` → Phaser) and loads the minimal set of
skills for a request. It reads engine skills first, then discipline skills.

## Skills by area

### Engine: Phaser 4 (gamedev-skills/awesome-gamedev-agent-skills)
| Skill | Use for |
|---|---|
| `phaser-core` | Game config, Scene lifecycle, loader, cameras, cross-scene communication (Phaser 4.2). |
| `phaser-arcade-physics` | Arcade bodies, velocity, colliders and overlaps, if moving objects need physics. |

### Engineering disciplines (gamedev-skills/awesome-gamedev-agent-skills)
| Skill | Use for |
|---|---|
| `create-game-assets` | Art direction brief, palette roles, asset manifest, family production, contact-sheet QA, provenance. |
| `game-ui-ux` | HUD and menu architecture: reference-resolution scaling, screen stack, focus navigation, event-driven HUD. |
| `game-feel` | Juice: eased tweens, shake tiers, flashes, feedback that returns to rest, reduced-motion option. |
| `audio-design` | Buses and mixing in dB, ducking, adaptive music layers, SFX variation. |
| `game-ai` | FSMs, behavior trees, steering, pathfinding (city traffic and NPC movement). |
| `ai-behavior-trees-utility-ai` | Utility scoring with response curves and hysteresis (the adaptive director's decisions). |
| `procedural-gen` | Seeded deterministic RNG and weighted tables (randomized runs, reproducible replays). |
| `save-systems` | Versioned, validated persistence (localStorage scoreboard, achievements, settings). |
| `input-systems` | Action mapping, keyboard, mouse and touch, accessible controls. |
| `performance-optimization` | Profile-first frame budgets, pooling, draw calls, asset budgets. |
| `camera-systems` | 2D follow, deadzone, smoothing, bounds clamping and zoom framing for the city map. |
| `physics-tuning` | Fixed timestep, render interpolation, and stable deterministic simulation ticks. |
| `prototype-fast` | Timeboxed prototypes that answer one question, with keep/kill criteria. |

### Browser game architecture and QA (PlayableIntelligence/game-creator)
| Skill | Use for |
|---|---|
| `game-architecture` | EventBus, centralized state, constants, restart safety, delta time, disposal. |
| `game-qa` | Playwright testing for browser games: clock control, gameplay invariants, visual regression. |

### Game design: systems, difficulty, and balance (AlterLab-IEU/AlterLab_GameForge)
| Skill | Use for |
|---|---|
| `game-designer` | Mechanics, progression, dynamic difficulty adjustment (DDA), reward psychology. |
| `game-balance-check` | Economy and difficulty validation: Flow channel, rubber-banding, Monte Carlo, reward pacing. |
| `game-accessibility-specialist` | Accessibility: colorblind-safe states, remapping, difficulty options, motor accommodations. |
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

## Notes

- **Skill defaults that don't apply to NEXUS.** `game-architecture` and `game-qa` assume the
  Play.fun widget ("no title screen", "no in-game score HUD"). NEXUS has a title screen and a
  full HUD.
- **The router knows skills that are not installed** (Godot, Unity, Unreal, three.js, PixiJS,
  genre templates, and others). When it names one, fall back to the installed skills listed
  above and state the gap, as the router's §6 instructs.
- **`create-game-assets` helper scripts** (`scripts/*.py`) need Python and Pillow, which are
  not installed. NEXUS generates and checks its art with its own Node tooling (see `CLAUDE.md`).

## AlterLab role names → installed equivalents

| AlterLab role mentioned | Installed equivalent |
|---|---|
| `game-creative-director` | `game-vision-architect`, `design-pillars-architect` |
| `game-art-director` | `aesthetic-direction-framework`, `create-game-assets` |
| `game-audio-director` | `aesthetic-direction-framework`, `audio-design` |
| `game-narrative-director` | `narrative-systems-designer`, `world-logic-checker` |
| `game-ux-designer` | `ui-ux-systems-designer`, `game-ui-ux` |
| `game-technical-director` | `game-architecture`, `technical-design-bridge` |
| `game-qa-lead` | `game-qa`, `playtest-protocol-designer` |
| `game-producer` | `scope-feature-prioritizer` |
| `game-prototype` | `prototype-scope-definer`, `prototype-fast` |

## Local additions (not in the upstream skill folders)

- `docs/VERSION-SUPPORT.md`: copied from awesome-gamedev-agent-skills. The router links to it as
  `../docs/VERSION-SUPPORT.md`, which resolves here in a flat install.
- `game-qa/scripts/iterate-client.js` and `game-qa/scripts/example-actions.json`: from
  game-creator's repo-level `scripts/`, because `game-qa` tells you to run `scripts/iterate-client.js`.
- `game-designer/`, `game-balance-check/`, `game-accessibility-specialist/`, `game-code-review/`:
  each has the AlterLab `docs/*.md` and `templates/*.md` files its SKILL.md references, at the same
  relative paths.

## Deliberately not installed

- **3D and other engines:** all three.js skills, PixiJS, Godot, Unity, Unreal, Bevy, pygame,
  LÖVE, Roblox. NEXUS is a 2D Phaser game. The three.js suite and the Phaser 3 `phaser` skill
  from an earlier setup were removed. They remain in git history (commit `a19d695`).
- **Not relevant to this game:** the genre templates (platformer, roguelike, RPG, FPS, tower
  defense, card game, visual novel, survival-crafting, puzzle), `dialogue-systems`,
  `shader-programming`, `level-design` (overlaps `level-encounter-planner`), the Steam and itch
  publishing workflows, and `game-jam`.
- **Duplicates or services:** other game-creator and AlterLab skills that repeat installed ones,
  plus monetization, multiplayer, hosted-deploy and promo pipelines. game-creator's `use-template`
  was skipped because it sends opt-out telemetry to a third-party endpoint.

## Sources (see `_licenses/`)

| Repository | License | Commit |
|---|---|---|
| https://github.com/gamedev-skills/awesome-gamedev-agent-skills | Apache-2.0 (LICENSE + NOTICE) | `b105e1cf617adf0b68ed98790a716bbb60993179` |
| https://github.com/PlayableIntelligence/game-creator | MIT | `4e64b83b5fe400b34ad3a484d9b4a6090b26d512` |
| https://github.com/AlterLab-IEU/AlterLab_GameForge | MIT | `5f5148d61986b32299070e87fcd4a1ab3718eacf` |
| https://github.com/baxatron-git/claude-game-design-suite | MIT | `5dd265ac2b143d13683766cdaae9695d3d871909` |
