import { crisis, choice as c } from './helpers.js';

export const weather = [
  crisis({
    id: 'storm-front', title: 'Storm Front', category: 'weather', district: 'energy', hazard: 'sparks',
    text: 'A violent storm front slams into the city with wind, rain and lightning.',
    themes: ['weather'], impact: { infrastructure: -6, energy: -6 }, severity: 3,
    choices: [
      c('indoors', 'Order Everyone Indoors', { safety: 12, supplies: -4, transport: -6 }, 0, { tags: ['cautious'] }),
      c('crews', 'Pre-Position Repair Crews', { infrastructure: 10, energy: 6 }, 20, { tags: ['preventive'], flags: ['repair-crew'] }),
      c('grid', 'Protect the Power Grid', { energy: 12, communication: -4 }, 12, { tags: ['infrastructure'] })
    ],
    ignore: { infrastructure: -10, energy: -8, safety: -6 }
  }),
  crisis({
    id: 'heatwave', title: 'Heatwave', category: 'weather', district: 'energy', hazard: null,
    text: 'A heatwave pushes air conditioners, and the power grid, to the limit.',
    themes: ['weather', 'energy'], impact: { energy: -6, health: -4 }, severity: 2,
    choices: [
      c('cooling', 'Open Cooling Centers', { health: 10, energy: -6 }, 10, { tags: ['humanitarian'] }),
      c('demand', 'Demand Response Program', { energy: 12, safety: -4 }, 8, { tags: ['preventive'] }),
      c('import', 'Import Power', { energy: 14 }, 26, { tags: ['economic'] })
    ],
    ignore: { health: -10, energy: -10 }
  }),
  crisis({
    id: 'hailstorm', title: 'Hailstorm', category: 'weather', district: 'transport', hazard: 'crack',
    text: 'Golf-ball-sized hail is smashing windshields, roofs and solar panels.',
    themes: ['weather', 'infrastructure'], impact: { infrastructure: -6, transport: -5 }, severity: 2,
    choices: [
      c('shelter', 'Stop All Traffic', { safety: 10, transport: -6 }, 0, { tags: ['cautious'] }),
      c('repair', 'Rapid Roof Repairs', { infrastructure: 12, supplies: -6 }, 14, { flags: ['repair-crew'] }),
      c('solar', 'Protect the Solar Farm', { energy: 10, infrastructure: 4 }, 12, { tags: ['preventive'] })
    ],
    ignore: { infrastructure: -10, transport: -8, energy: -4 }
  })
];

/** Opportunities that the adaptive engine favors when the commander is struggling. */
export const recovery = [
  crisis({
    id: 'neighbor-aid', title: 'Neighbor City Sends Aid', category: 'recovery', district: 'command', hazard: null,
    text: 'A neighboring city offers one aid convoy. Choose what it should carry.',
    themes: [], weight: 0.5, severity: 1, kind: 'recovery',
    choices: [
      c('supplies', 'Food and Water', { supplies: 12, water: 6 }, 0, { tags: ['humanitarian'] }),
      c('generators', 'Mobile Generators', { energy: 14 }, 0, { tags: ['infrastructure'] }),
      c('medics', 'Medical Teams', { health: 14 }, 0, { tags: ['humanitarian'] })
    ],
    ignore: {}
  }),
  crisis({
    id: 'volunteer-engineers', title: 'Volunteer Engineers Arrive', category: 'recovery', district: 'command', hazard: null,
    text: 'Retired engineers volunteered to help. Where should they work?',
    themes: [], weight: 0.5, severity: 1, kind: 'recovery',
    choices: [
      c('roads', 'Roads and Bridges', { infrastructure: 12, transport: 6 }, 2, { tags: ['infrastructure'], flags: ['repair-crew'] }),
      c('pipes', 'Water Pipes', { water: 14 }, 2, { tags: ['infrastructure'] }),
      c('grid', 'Power Lines', { energy: 14 }, 2, { tags: ['infrastructure'] })
    ],
    ignore: {}
  }),
  crisis({
    id: 'emergency-fund', title: 'Emergency Fund Released', category: 'recovery', district: 'downtown', hazard: null,
    text: 'The national government released emergency money for the city.',
    themes: [], weight: 0.5, severity: 1, kind: 'recovery',
    choices: [
      c('budget', 'Add to the Emergency Budget', { budget: 24 }, 0, { tags: ['economic'] }),
      c('relief', 'Direct Relief to Families', { safety: 10, supplies: 6 }, 0, { tags: ['humanitarian'] }),
      c('repairs', 'Fast-Track Repairs', { infrastructure: 12 }, 0, { tags: ['infrastructure'] })
    ],
    ignore: {}
  }),
  crisis({
    id: 'community-teams', title: 'Community Response Teams', category: 'recovery', district: 'residential', hazard: null,
    text: 'Neighbors have formed response teams and are ready for instructions.',
    themes: [], weight: 0.5, severity: 1, kind: 'recovery',
    choices: [
      c('patrols', 'Neighborhood Watch', { safety: 12 }, 0, { tags: ['humanitarian'] }),
      c('care', 'Check on the Elderly', { health: 10, safety: 4 }, 0, { tags: ['humanitarian'] }),
      c('supply', 'Run Supply Pickups', { supplies: 10, transport: 4 }, 0)
    ],
    ignore: {}
  })
];
