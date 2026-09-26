/**
 * City systems and how they depend on each other (the cascade graph).
 *
 * `dependsOn`: when the source system drops below `below`, this system drains by
 * `strength × (below − source) / below` points per simulated second. That single rule is what
 * makes "POWER ↓ → WATER ↓ → HEALTH ↓" emerge from play instead of being scripted.
 */
export const SYSTEMS = [
  {
    id: 'energy', name: 'Energy', short: 'ENERGY', icon: 'res-energy', color: 'energy', badge: 'yellow', weight: 1.1,
    district: 'energy', verb: 'Power',
    dependsOn: [{ source: 'infrastructure', below: 50, strength: 0.22 }]
  },
  {
    id: 'water', name: 'Water', short: 'WATER', icon: 'res-water', color: 'water', badge: 'blue', weight: 1.1,
    district: 'water', verb: 'Water supply',
    dependsOn: [{ source: 'energy', below: 50, strength: 0.34 }, { source: 'infrastructure', below: 50, strength: 0.2 }]
  },
  {
    id: 'health', name: 'Health', short: 'HEALTH', icon: 'res-health', color: 'health', badge: 'coral', weight: 1.4,
    district: 'medical', verb: 'Healthcare',
    dependsOn: [
      { source: 'water', below: 50, strength: 0.3 },
      { source: 'energy', below: 50, strength: 0.2 },
      { source: 'supplies', below: 50, strength: 0.24 },
      { source: 'transport', below: 50, strength: 0.14 }
    ]
  },
  {
    id: 'transport', name: 'Transport', short: 'TRANSPORT', icon: 'res-transport', color: 'transport', badge: 'orange', weight: 1.0,
    district: 'transport', verb: 'Transport',
    dependsOn: [
      { source: 'infrastructure', below: 50, strength: 0.26 },
      { source: 'energy', below: 50, strength: 0.14 },
      { source: 'communication', below: 50, strength: 0.1 }
    ]
  },
  {
    id: 'infrastructure', name: 'Infrastructure', short: 'INFRASTRUCTURE', icon: 'res-infrastructure', color: 'infrastructure', badge: 'brown', weight: 1.0,
    district: 'industrial', verb: 'Infrastructure',
    dependsOn: [{ source: 'safety', below: 40, strength: 0.1 }]
  },
  {
    id: 'safety', name: 'Public Safety', short: 'SAFETY', icon: 'res-safety', color: 'safety', badge: 'violet', weight: 1.2,
    district: 'residential', verb: 'Public safety',
    dependsOn: [
      { source: 'communication', below: 50, strength: 0.24 },
      { source: 'energy', below: 50, strength: 0.16 },
      { source: 'supplies', below: 50, strength: 0.16 },
      { source: 'health', below: 45, strength: 0.14 },
      { source: 'water', below: 45, strength: 0.12 }
    ]
  },
  {
    id: 'communication', name: 'Communication', short: 'COMMS', icon: 'res-communication', color: 'communication', badge: 'cyan', weight: 0.9,
    district: 'command', verb: 'Communication',
    dependsOn: [{ source: 'energy', below: 50, strength: 0.3 }]
  },
  {
    id: 'supplies', name: 'Supplies', short: 'SUPPLIES', icon: 'res-supplies', color: 'supplies', badge: 'green', weight: 1.0,
    district: 'industrial', verb: 'Supply chain',
    dependsOn: [{ source: 'transport', below: 50, strength: 0.34 }, { source: 'energy', below: 45, strength: 0.08 }]
  }
];

/** Emergency budget is spent by choices rather than simulated as a failing system. */
export const BUDGET = { id: 'budget', name: 'Emergency Budget', short: 'BUDGET', icon: 'res-budget', color: 'budget', badge: 'magenta', weight: 0.4 };

export const SYSTEM_IDS = SYSTEMS.map((s) => s.id);
export const ALL_RESOURCES = [...SYSTEMS, BUDGET];
export const RESOURCE_BY_ID = Object.fromEntries(ALL_RESOURCES.map((r) => [r.id, r]));

export const THRESHOLDS = { warning: 40, critical: 25, failure: 12 };

/** Systems that mainly protect people vs. the machinery of the city (used by the play-style analysis). */
export const PEOPLE_SYSTEMS = ['health', 'safety', 'supplies'];
export const CITY_SYSTEMS = ['energy', 'water', 'transport', 'infrastructure', 'communication'];
