/**
 * Achievements are plain data: each has a `check(report, profile)` over the final city report
 * (src/sim/scoring.js) and the local profile (src/core/profile.js). Adding one is adding an
 * entry here. `secret` achievements show as "???" until unlocked.
 */
const allAbove = (systems, v) => Object.values(systems).every((x) => x >= v);

export const ACHIEVEMENTS = [
  {
    id: 'power-balancer',
    name: 'POWER BALANCER',
    icon: 'res-energy',
    color: 'yellow',
    text: 'Prevent a major energy cascade: pull Energy back from the danger zone, or contain an energy failure.',
    check: (r) => r.completed && (r.blockedCascades.includes('energy') || (r.minLevels.energy < 40 && !r.cascadeFrom.includes('energy')))
  },
  {
    id: 'no-one-left-behind',
    name: 'NO ONE LEFT BEHIND',
    icon: 'res-safety',
    color: 'violet',
    text: 'Maintain strong public safety: Safety never below 55 and 90% of citizens protected.',
    check: (r) => r.completed && r.minLevels.safety >= 55 && r.citizensProtected >= 90
  },
  {
    id: 'master-planner',
    name: 'MASTER PLANNER',
    icon: 'ui-star',
    color: 'teal',
    text: 'Complete a run with high resource efficiency (60 or more).',
    check: (r) => r.completed && r.efficiency >= 60
  },
  {
    id: 'chaos-survivor',
    name: 'CHAOS SURVIVOR',
    icon: 'scn-chaos',
    color: 'magenta',
    text: 'Complete a Chaos Mode run without the city collapsing.',
    check: (r) => r.completed && r.chaos
  },
  {
    id: 'adaptive-commander',
    name: 'ADAPTIVE COMMANDER',
    icon: 'ui-ai',
    color: 'cyan',
    text: 'Respond to 8 different kinds of crisis in one run and keep survival at 70% or more.',
    check: (r) => r.categoriesAnswered >= 8 && r.survival >= 70
  },
  // ---- secret achievements
  {
    id: 'nuclear-option',
    secret: true,
    name: 'NUCLEAR OPTION',
    icon: 'abl-reactor',
    color: 'orange',
    text: 'Bring the NEXUS Reactor online and still finish with Water at 40 or more.',
    check: (r) => r.completed && r.abilityId === 'reactor' && r.abilityUses > 0 && r.systems.water >= 40
  },
  {
    id: 'cascade-breaker',
    secret: true,
    name: 'CASCADE BREAKER',
    icon: 'ui-cascade',
    color: 'red',
    text: 'Answer 3 cascade crises in a single run.',
    check: (r) => r.cascadesAnswered >= 3
  },
  {
    id: 'penny-pincher',
    secret: true,
    name: 'PENNY PINCHER',
    icon: 'res-budget',
    color: 'green',
    text: 'Finish a run with more emergency budget than you started with.',
    check: (r) => r.completed && r.budgetFinal > r.budgetStart
  },
  {
    id: 'lightning-reflexes',
    secret: true,
    name: 'LIGHTNING REFLEXES',
    icon: 'ui-clock',
    color: 'yellow',
    text: 'Make 8 or more decisions averaging under 3 seconds each.',
    check: (r) => r.decisionsMade >= 8 && r.avgDecisionTime < 3
  },
  {
    id: 'comeback-city',
    secret: true,
    name: 'COMEBACK CITY',
    icon: 'ui-up',
    color: 'coral',
    text: 'Drop below 50% stability and still finish above 70%.',
    check: (r) => r.completed && r.minStability < 50 && r.finalStability > 70
  },
  {
    id: 'clear-skies',
    secret: true,
    name: 'CLEAR SKIES',
    icon: 'ui-check',
    color: 'blue',
    text: 'Finish with every system at 55 or more.',
    check: (r) => r.completed && allAbove(r.systems, 55)
  },
  {
    id: 'full-roster',
    secret: true,
    name: 'FULL ROSTER',
    icon: 'ui-people',
    color: 'violet',
    text: 'Command NEXUS in all 7 roles.',
    check: (r, profile) => profile.rolesPlayed.length >= 7
  },
  {
    id: 'world-of-trouble',
    secret: true,
    name: 'WORLD OF TROUBLE',
    icon: 'ui-flag',
    color: 'teal',
    text: 'Face every one of the 10 crisis themes.',
    check: (r, profile) => profile.themesPlayed.length >= 10
  }
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
