/**
 * Crisis themes. Each one changes the actual simulation:
 * - `start`: starting levels that differ from the defaults
 * - `decay`: crisis pressure (points lost per simulated second) per system
 * - `themes`: event-deck weights (events tagged with a theme become more likely)
 * - `rule`: a special mechanic applied by the simulation (see src/sim/rules.js)
 * - `opening`: the first crisis of the run
 */
export const DEFAULT_START = { energy: 72, water: 72, health: 74, transport: 70, infrastructure: 70, safety: 74, communication: 72, supplies: 70 };
export const DEFAULT_BUDGET = 60;
export const BASE_DECAY = 0.02;

export const SCENARIOS = [
  {
    id: 'power', name: 'Power Grid Crisis', icon: 'scn-power', color: 'yellow', difficulty: 2,
    description: 'Aging substations fail one after another. Keep the lights on before everything that needs power goes dark.',
    systems: ['energy', 'water', 'communication'],
    start: { energy: 46 },
    decay: { energy: 0.18, communication: 0.07 },
    themes: { energy: 3, communication: 1.4 },
    rule: { id: 'brownouts', text: 'Brownouts: every 45 s the grid sags (Energy −8) unless Energy is above 70.' },
    opening: 'grid-overload'
  },
  {
    id: 'weather', name: 'Extreme Weather', icon: 'scn-weather', color: 'blue', difficulty: 3,
    description: 'A superstorm parks over the city. Floods, lightning and wind hit a different district every minute.',
    systems: ['infrastructure', 'transport', 'energy'],
    start: { infrastructure: 60, transport: 60 },
    decay: { infrastructure: 0.11, transport: 0.09, energy: 0.07 },
    themes: { weather: 3.2, water: 1.3, infrastructure: 1.5 },
    rule: { id: 'storm-fronts', text: 'Storm fronts: every 40 s a front strikes a random district (two systems −6).' },
    weather: { rain: true, storm: true },
    opening: 'storm-front'
  },
  {
    id: 'water', name: 'Water Crisis', icon: 'scn-water', color: 'cyan', difficulty: 2,
    description: 'Drought and a failing treatment plant leave the reservoir dangerously low.',
    systems: ['water', 'health', 'safety'],
    start: { water: 44 },
    decay: { water: 0.17 },
    themes: { water: 3, health: 1.3 },
    rule: { id: 'drought', text: 'Drought: Water drains 50% faster while it is below 40.' },
    opening: 'reservoir-contamination'
  },
  {
    id: 'cyber', name: 'Cyber Emergency', icon: 'scn-cyber', color: 'magenta', difficulty: 3,
    description: 'Hackers have locked the city’s control systems. Data is unreliable and networks keep dropping.',
    systems: ['communication', 'energy', 'transport'],
    start: { communication: 45 },
    decay: { communication: 0.16, transport: 0.07 },
    themes: { cyber: 3.2, communication: 1.5 },
    rule: { id: 'data-fog', text: 'Data fog: while Communication is below 50, some system readings are hidden.' },
    opening: 'city-servers-locked'
  },
  {
    id: 'transport', name: 'Transport Collapse', icon: 'scn-transport', color: 'orange', difficulty: 2,
    description: 'A cracked bridge and a signal outage paralyze the roads and rails.',
    systems: ['transport', 'supplies', 'health'],
    start: { transport: 45 },
    decay: { transport: 0.17, supplies: 0.07 },
    themes: { transport: 3, supplies: 1.5 },
    rule: { id: 'rush-waves', text: 'Rush waves: every 50 s traffic surges (Transport −8) unless Transport is above 65.' },
    opening: 'bridge-closure'
  },
  {
    id: 'hospital', name: 'Hospital Overload', icon: 'scn-hospital', color: 'red', difficulty: 3,
    description: 'A fast-spreading flu fills every hospital bed. Healthcare is at the edge.',
    systems: ['health', 'supplies', 'safety'],
    start: { health: 46 },
    decay: { health: 0.18, supplies: 0.05 },
    themes: { health: 3.2, supplies: 1.4 },
    rule: { id: 'patient-waves', text: 'Patient waves: every 45 s a new wave arrives (Health −9) unless Health is above 70.' },
    opening: 'er-overload'
  },
  {
    id: 'industrial', name: 'Industrial Accident', icon: 'scn-industrial', color: 'orange', difficulty: 3,
    description: 'An explosion at the chemical works releases a toxic cloud over the east side.',
    systems: ['safety', 'health', 'infrastructure'],
    start: { safety: 52, health: 62 },
    decay: { safety: 0.12, health: 0.09, infrastructure: 0.07 },
    themes: { industrial: 3.2, health: 1.3 },
    rule: { id: 'toxic-spread', text: 'Toxic spread: until the leak is contained, the cloud drains Health and Safety faster every minute.' },
    opening: 'chemical-leak'
  },
  {
    id: 'infrastructure', name: 'Infrastructure Failure', icon: 'scn-infrastructure', color: 'violet', difficulty: 2,
    description: 'Decades of wear catch up at once: pipes burst, roads crack, buildings groan.',
    systems: ['infrastructure', 'water', 'transport'],
    start: { infrastructure: 44 },
    decay: { infrastructure: 0.17 },
    themes: { infrastructure: 3, water: 1.3, transport: 1.3 },
    rule: { id: 'aftershocks', text: 'Structural alarms: every 50 s a failure hits a random system (−6) unless Infrastructure is above 65.' },
    opening: 'sinkhole'
  },
  {
    id: 'supply', name: 'Food & Supply Crisis', icon: 'scn-supply', color: 'green', difficulty: 2,
    description: 'Ports are closed and warehouses are nearly empty. Food and fuel are running out.',
    systems: ['supplies', 'health', 'safety'],
    start: { supplies: 44 },
    decay: { supplies: 0.17, safety: 0.05 },
    themes: { supplies: 3, safety: 1.3 },
    rule: { id: 'shortages', text: 'Shortages: Supplies drain 50% faster while Transport is below 50.' },
    opening: 'panic-buying'
  },
  {
    id: 'chaos', name: 'Chaos Mode', icon: 'scn-chaos', color: 'magenta', difficulty: 5,
    description: 'Everything, everywhere, at once: two crises combined with a random twist. Every run is different.',
    systems: [],
    start: {},
    decay: {},
    themes: {},
    rule: { id: 'chaos', text: 'Two random crises combined, randomized starting city, plus a surprise twist.' },
    opening: null,
    chaos: true
  }
];

/** Surprise twists for Chaos Mode (applied by the simulation's rule engine). */
export const CHAOS_TWISTS = [
  { id: 'double-trouble', name: 'Double Trouble', text: 'Crises arrive 25% more often.' },
  { id: 'fragile-grid', name: 'Fragile Grid', text: 'Energy failures spread 50% harder.' },
  { id: 'blind-spots', name: 'Blind Spots', text: 'Data fog: low Communication hides system readings.' },
  { id: 'rush-hour', name: 'Endless Rush Hour', text: 'Transport decays 50% faster.' },
  { id: 'tight-budget', name: 'Tight Budget', text: 'Budget starts 20 lower and refills at half speed.' },
  { id: 'aftershocks', name: 'Aftershocks', text: 'Every 50 s a structural failure hits a random system unless Infrastructure is above 65.' }
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
export const PLAYABLE_THEMES = SCENARIOS.filter((s) => !s.chaos).map((s) => s.id);
