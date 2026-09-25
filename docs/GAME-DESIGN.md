# NEXUS: CITY ZERO: game design

How the game works under the hood. Every rule described here lives in `src/sim/` (headless,
deterministic, no Phaser) and every piece of content in `src/data/`. Numbers quoted below are
the values in the code at the time of writing. The code is the source of truth.

## Pillars

1. **Decisions with consequences.** Every response has a price, and every price shows up
   somewhere else in the city a few seconds later.
2. **Readable systems.** A child can see which bar is dropping and which building is on fire.
   An adult can see *why*, because the dependencies, costs and side effects are on screen.
3. **Honest AI.** The adaptive engine, the command-AI messages and the play-style analysis read
   the real simulation state and the player's real decisions. There is no random flavor text,
   no hidden rubber-banding and no external AI service.
4. **One visitor, one story.** Three to five minutes from PLAY to a report worth reading, then a
   timeline that shows how the story could have gone differently.

## The city

### Systems

Eight city systems (0–100) plus the emergency budget:

| System | Drained while these are below their line |
|---|---|
| Energy | Infrastructure < 50 |
| Water | Energy < 50, Infrastructure < 50 |
| Health | Water < 50, Energy < 50, Supplies < 50, Transport < 50 |
| Transport | Infrastructure < 50, Energy < 50, Communication < 50 |
| Infrastructure | Public Safety < 40 |
| Public Safety | Communication < 50, Energy < 50, Supplies < 50, Health < 45, Water < 45 |
| Communication | Energy < 50 |
| Supplies | Transport < 50, Energy < 45 |

Each dependency also has its own strength (`src/data/resources.js`). Levels are tagged **LOW**
below 40, **CRITICAL** below 25 and **FAILED** below 12.

The **emergency budget** refills slowly (0.16/s, capped at 150) and pays for responses. A
response that costs more than the current budget is locked. If every response on a card is
locked, the cheapest one can still go ahead **underfunded**: it takes whatever budget is left
and works at half strength.

### Stability

City stability is the weighted share of systems that are still *operational*: a system at 70 or
more counts fully, one at 12 or less counts as zero, with a linear ramp between. The budget
contributes a small reserve term. This makes stability readable ("how much of the city still
works") instead of an average that hides a failing hospital behind a full power grid.

If stability stays below 25 for 10 seconds, the city **collapses** and the run ends early.

### Pressure, cascades and hazards

Every simulation step (0.1 s):

- Every system **decays** slowly. The crisis theme adds pressure to its own systems, and roles
  and abilities can slow it.
- A system below one of the lines in the table **drains** the systems that depend on it, in
  proportion to how far below the line it is.
- When a system falls below 25 (CRITICAL), a **CASCADE** alert fires, the map reacts, and a
  cascade crisis card for that system joins the queue, unless an ability is containing it.
- Crisis sites leave **hazards** on the map (fires, sparks, floods, smoke) until the response
  lands. Ignored crises linger longer.
- Some responses keep acting after they land (**lingering effects**, for example a slow Health
  drain for 40 s), and risky responses may trigger **follow-up crises** later.

Alert zones use hysteresis: a critical system has to climb back to 35 before it counts as
recovered, so alerts do not flicker.

### The clock

The countdown reads **15:00 until city collapse**. It runs 7× faster than real time until
01:00, and the **final minute runs in real time**:

| Clock | Phase | Effect |
|---|---|---|
| 01:00 | CRITICAL WINDOW | All decay ×1.25 |
| 00:30 | SYSTEM CASCADE IMMINENT | Dependency drain ×1.3 |
| 00:10 | CITY STABILITY CRITICAL | Final warning |

While a crisis card is open, the whole city slows to 30% speed so players have time to read.
The response timer (22 s, 16 s in the final minute, +5 s when the adaptive engine is assisting)
runs in real seconds. A run is 180 simulated seconds and usually takes about four real minutes.

## Crises

66 crises in `src/data/events/`: 48 themed deck crises, 8 cascade crises (one per system),
7 recovery opportunities and 3 follow-ups. They cover 12 categories: energy, water, health,
transport, infrastructure, safety, communication, supplies, cyber, industrial, weather and
recovery.

Each crisis has an immediate **impact**, a **NO RESPONSE** consequence (applied at 1.3× if
the timer runs out), a district on the map, and 2–4 responses (210 in total). A response has:

- **effects** on several systems: gains are always paired with a cost somewhere else,
- a **budget cost** (56 responses are free, but free crisis responses carry about twice the side
  effects of paid ones on average),
- **tags** (cautious, bold, preventive, humanitarian, infrastructure, economic, major) that
  feed the play-style analysis,
- optionally a **risk** of a follow-up crisis, **lingering** effects, or a **role lock** (14
  responses only appear for a specific role).

The **event director** (`src/sim/event-director.js`) decides when the next crisis arrives and
which one. It uses a seeded weighted draw that combines the crisis theme, the adaptive engine
(more complex crises when you are strong, recovery opportunities when you struggle), the
currently weakest system and anti-repetition. Cascade and follow-up crises jump the queue.

## Roles

| Role | Strengths | Weakness | Special ability |
|---|---|---|---|
| Governor | Major responses 25% cheaper; +25 starting budget | Major responses: +25% side effects and 30 s of unrest | **Emergency Power Authorization** (once per run): brings the fictional NEXUS Reactor online. Energy +40, energy decays 50% slower for the rest of the run, energy cascades blocked for 60 s. Costs Budget −30 and Safety −8, and the reactor keeps drawing cooling water. |
| Scientist | Sees the hidden risk of every choice; forecasts the next crises | −20% energy and infrastructure gains | **Rapid Analysis**: reveals the next 3 crises; next response +35% effective |
| Engineer | +25% infrastructure, +20% energy and water; faster repair crews | −20% health and supplies gains | **Emergency Repair**: Infrastructure +25, weakest of Energy/Water/Transport +15, infrastructure decay stops for 45 s |
| Medical Director | +25% health gains; health decays 15% slower | −20% infrastructure gains | **Medical Mobilization**: Health +22, Safety +8, health decay stops for 45 s |
| Energy Director | +25% energy gains; energy decays 20% slower | −15% health and safety gains | **Grid Stabilization**: Energy +15, energy cascades blocked for 75 s |
| Logistics Commander | +25% transport and supply gains; supplies resist failing roads | −20% energy gains | **Emergency Routing**: Transport +18, Supplies +18, transport and supply cascades blocked for 60 s |
| AI Systems Architect | Sees 60 s trends for every system; reads through data fog; +25% communication gains | −15% safety gains | **Predictive Model**: shows the next 60 s of every system, flags the next cascade, softens the next two crises by 30% |

The Governor's ability can be used once per run; every other ability has 2 charges with a
40–45 s cooldown. Roles also change which responses appear: 14 responses are exclusive to one
role.

## Crisis themes

| Theme | Crisis systems | Special rule |
|---|---|---|
| Power Grid Crisis | Energy, Water, Communication | Brownouts: every 45 s Energy −8 unless it is above 70 |
| Extreme Weather | Infrastructure, Transport, Energy | Storm fronts: every 40 s a front hits a random district (two systems −6) |
| Water Crisis | Water, Health, Safety | Drought: Water drains 50% faster while below 40 |
| Cyber Emergency | Communication, Energy, Transport | Data fog: while Communication is below 50, some readings are hidden |
| Transport Collapse | Transport, Supplies, Health | Rush waves: every 50 s Transport −8 unless it is above 65 |
| Hospital Overload | Health, Supplies, Safety | Patient waves: every 45 s Health −9 unless it is above 70 |
| Industrial Accident | Safety, Health, Infrastructure | Toxic spread: the cloud drains Health and Safety faster every minute until contained |
| Infrastructure Failure | Infrastructure, Water, Transport | Structural alarms: every 50 s a random system −6 unless Infrastructure is above 65 |
| Food & Supply Crisis | Supplies, Health, Safety | Shortages: Supplies drain 50% faster while Transport is below 50 |

**🎲 CHAOS MODE** blends two random themes (both rules active, each crisis starts a little
milder than alone) and adds one surprise twist: Double Trouble (crises 25% more often),
Fragile Grid (energy failures spread 50% harder), Blind Spots (data fog), Endless Rush Hour
(Transport decays 50% faster), Tight Budget (−20 start, half-speed refill) or Aftershocks.

**SURPRISE CONDITIONS** randomizes the chosen theme's starting city, budget and opening crisis
within balanced ranges and adds one of the twists above as a secondary crisis condition.
**🎲 RANDOMIZE EVERYTHING** does the same with a random role and theme (`src/sim/run-setup.js`).
Crisis systems always start in trouble and the others stay playable. Everything derives from one
seed, so any run can be reproduced.

## Adaptive difficulty

`src/sim/adaptive-director.js` is a small utility AI. Every 5 simulated seconds (after a 30 s
warm-up) it reads facts about the run: stability, the 20 s trend, critical systems, recent
cascades and budget. It combines them into a performance score and scores three actions:

- **ESCALATE** only when performance is clearly strong (sigmoid centered at 0.83),
- **RELIEVE** only on real struggle (centered at 0.5),
- **HOLD** otherwise. The band between is wide on purpose, so a solid, steady player is left
  alone.

A change needs the same winner twice in a row and a 15 s cooldown, and it moves the crisis
level one step (intensity 0.6–1.5, shown as CRISIS LEVEL 1–5). The level changes knobs that the
player can see: time between crises, the size of impacts and side effects, background decay,
how hard failing systems drag their dependents, a bonus on gains while struggling, the event mix,
and clearer warnings with more decision time at low levels. Every change is announced as an
**ADAPTIVE ENGINE** message. The numbers on the cards always show the values that will apply,
so the game never lies to the player about what a response does.

## Command-AI messages

`src/sim/analyst.js` writes the COMMAND ANALYSIS, WARNING, SIMULATION UPDATE, ADAPTIVE ENGINE,
CASCADE ALERT and PREDICTIVE MODEL messages. Each message is derived from live state or measured
behavior, for example a dependency that has started draining, a system trending toward failure,
the player's own response pattern, or an adaptive change and its reason. Pacing rules keep the
feed readable:

- routine messages need 12 simulated seconds of quiet, and urgent ones 4 s,
- each insight is said once per situation (a warning repeats only if things got worse),
- in the last 25 seconds only urgent alerts get through.

## Gameplay strategy analysis

`src/sim/strategy-analysis.js` derives a play style from what the player did, not from a
questionnaire. Each decision is judged **relative to the alternatives on that card**, so the
crises a player happened to face do not decide the style. For example, picking the most
people-oriented response to a power crisis still counts as people-first.

Signals: decision speed, risk taken versus the options, cost versus the options, which systems
were favored beyond what the alternatives offered, help for the weakest system, special-ability
use, repeated patterns, reaction to cascades (fixing the source or not), and strategy changes
between the first and second half of the run (measured as an effect size, so the natural variety
of crises does not look like a change of mind).

Each of the seven styles is a utility score over those signals:

| Style | Driven by |
|---|---|
| Strategic Planner | Slow, deliberate decisions + below-average risk + few missed crises |
| Risk Taker | Picks the bolder option + several high-risk responses |
| Resource Optimizer | Picks cheaper options + spends a small share of the budget |
| Crisis Responder | Fast decisions + goes straight for the weakest system |
| Infrastructure Specialist | Favors power, water, transport, infrastructure and networks |
| Humanitarian Commander | Favors health, safety and supplies |
| Adaptive Commander | Measurable strategy change + answers cascades at the source + many kinds of crisis |

The report shows the winning style, the runner-up and up to four evidence lines that quote the
run's own numbers. With fewer than three answered crises there is not enough evidence, and the
report says **Not Enough Decisions** and lists only facts about the run.

`npm run styles` and `tests/unit/strategy.test.js` play runs with deliberately biased bot
players (a cautious planner, a daredevil, a saver and so on) and check that each one is
recognized as its own style in most runs.

## Scoring and the final report

All numbers come from the recorded run (`src/sim/scoring.js`):

- **City survival** = 0.6 × final stability + 0.4 × average stability − 3 per critical failure
  (max −18). A collapsed run is capped at 25 and scaled by how long the city lasted.
- **Citizens protected**: how well health (45%), safety (35%) and supplies (20%) held up over the
  whole run, relative to a healthy level of 80, applied to a fictional population of 480,000.
- **Resources remaining**: budget left as a share of all budget received.
- **Resource efficiency**: survival discounted by spending (spending 150 halves it).
- **Decisions made / missed, cascade events, critical failures** (systems that hit the failure
  line), ability uses, and the kinds of crisis answered.
- Outcome: CITY SECURED (80+), CITY STABILIZED (60+), CITY DAMAGED (40+), BARELY STANDING, or
  CITY COLLAPSED.

## Decision timeline and What-If

Every decision stores a snapshot of the whole simulation (levels, budget, timers, RNG state)
taken the moment the card was answered. The timeline shows each decision at its clock time above
the run's stability curve, colored by how city stability changed over the next 15 seconds. The
decisions followed by the biggest boost and the biggest drop are marked.

**What-If** (`src/sim/what-if.js`) restores that snapshot into two sandbox simulations. One
replays the real choice and the other an alternative. Both run for the same 40 simulated seconds
with no new crises and the adaptive engine frozen, so the only difference is the choice itself.
Cascades, lingering effects and rule shocks still play out. The screen shows the **SIMULATED
DIFFERENCE** per system and for stability. The real run and its score are never modified: the
branches are separate objects, and an end-to-end test checks that the report is byte-identical
before and after.

## Achievements and scoreboard

Achievements are data (`src/data/achievements.js`), each a check over the final report and the
local profile:

- **POWER BALANCER**: prevent a major energy cascade.
- **NO ONE LEFT BEHIND**: Safety never below 55 and 90% of citizens protected.
- **MASTER PLANNER**: complete a run with resource efficiency 60+.
- **CHAOS SURVIVOR**: complete a Chaos Mode run.
- **ADAPTIVE COMMANDER**: respond to 8 kinds of crisis with survival 70%+.
- Eight secret achievements, shown as ??? until unlocked.

The **Hall of Commanders** keeps the top five runs on five boards: highest survival, citizens
protected, resource efficiency, fewest critical failures and Chaos Mode victories. Runs are
saved under fictional commander names. The profile is versioned, validated on load and backed
up (`src/core/storage.js`). Corrupt or tampered data is repaired instead of crashing the game.

## Balance

`npm run balance` plays every role × crisis theme (plus Chaos and randomized runs) with four bot
strategies and checks invariants: no out-of-range values, every crisis gets a response or
expires, every run ends. The latest report (3 seeds per combination, 960 runs, about 10 s):

| Bot | Survival | Collapsed | Cascades | Budget spent | Efficiency | Citizens |
|---|---|---|---|---|---|---|
| Never responds | 20 | 70% | 5.0 | 0 | 20 | 43% |
| Random choices | 75 | 0% | 1.5 | 86 | 48 | 86% |
| Greedy (best immediate gain) | 81 | 0% | 0.7 | 86 | 52 | 85% |
| Expert (looks ahead) | 82 | 0% | 0.7 | 83 | 53 | 86% |

What this shows:

- **Decisions matter.** Ignoring the crises collapses the city in most runs. Answering them
  keeps it standing, and better answers score higher.
- **The adaptive engine keeps good players challenged.** Strong bots push the crisis level up
  (average intensity 1.2 versus 0.76 for the idle bot), which keeps the top end from saturating.
- **Chaos Mode is the hardest theme** (65 survival for the random bot versus 73–80 for the single
  themes). Roles stay within a few points of each other, so no role is a trap.
