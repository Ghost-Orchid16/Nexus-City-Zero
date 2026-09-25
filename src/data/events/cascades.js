import { crisis, choice as c } from './helpers.js';

/**
 * Cascade crises: never drawn from the deck. The simulation raises `cascade-<system>` when a
 * system falls into the critical zone, giving the commander one chance to stop the spread.
 */
export default [
  crisis({
    id: 'cascade-energy', title: 'Grid Collapse Imminent', category: 'energy', district: 'energy', hazard: 'outage',
    text: 'Power is failing across the city. Water pumps, hospitals and networks are next.',
    kind: 'cascade', severity: 3, impact: { communication: -4 },
    choices: [
      c('shed', 'Shed Load Everywhere', { energy: 18, safety: -8, supplies: -6 }, 0, { tags: ['bold'] }),
      c('buy', 'Buy Power at Any Price', { energy: 20 }, 32, { tags: ['economic'] }),
      c('critical', 'Protect Critical Services Only', { energy: 10, health: 6 }, 10, { tags: ['humanitarian'] })
    ],
    ignore: { energy: -10, water: -8, communication: -8 }
  }),
  crisis({
    id: 'cascade-water', title: 'Taps Running Dry', category: 'water', district: 'water', hazard: null,
    text: 'The water network is collapsing. Without water, health and safety will follow.',
    kind: 'cascade', severity: 3,
    choices: [
      c('tankers', 'Water Tankers to Every District', { water: 16, transport: -6 }, 18),
      c('ration', 'Hard Rationing', { water: 12, safety: -8 }, 0, { tags: ['bold'] }),
      c('pumps', 'All Power to the Pumps', { water: 18, energy: -12 }, 6, { tags: ['infrastructure'] })
    ],
    ignore: { water: -10, health: -8, safety: -6 }
  }),
  crisis({
    id: 'cascade-health', title: 'Hospitals Overwhelmed', category: 'health', district: 'medical', hazard: null,
    text: 'Hospitals have stopped accepting patients. The city needs care right now.',
    kind: 'cascade', severity: 3,
    choices: [
      c('allhands', 'All Hands on Deck', { health: 18, safety: -6 }, 14, { tags: ['humanitarian'] }),
      c('army', 'Request Army Medics', { health: 20 }, 34, { tags: ['major'] }),
      c('triage', 'Crisis Triage', { health: 12, supplies: -8 }, 4, { tags: ['cautious'] })
    ],
    ignore: { health: -10, safety: -8 }
  }),
  crisis({
    id: 'cascade-transport', title: 'City at a Standstill', category: 'transport', district: 'transport', hazard: null,
    text: 'Nothing is moving. Deliveries and ambulances are stuck in traffic.',
    kind: 'cascade', severity: 3,
    choices: [
      c('clear', 'Clear Emergency Routes', { transport: 16, safety: -4 }, 10),
      c('carfree', 'Car-Free Emergency Zones', { transport: 12, supplies: -6 }, 0, { tags: ['bold'] }),
      c('airlift', 'Helicopter Airlift', { transport: 8, supplies: 12 }, 30, { tags: ['economic'] })
    ],
    ignore: { transport: -10, supplies: -8, health: -6 }
  }),
  crisis({
    id: 'cascade-infrastructure', title: 'Structures Failing', category: 'infrastructure', district: 'industrial', hazard: 'crack',
    text: 'Roads, pipes and power lines are breaking faster than crews can fix them.',
    kind: 'cascade', severity: 3,
    choices: [
      c('triage', 'Repair What Matters Most', { infrastructure: 16 }, 20, { tags: ['infrastructure'], flags: ['repair-crew'] }),
      c('close', 'Close Unsafe Areas', { safety: 10, infrastructure: 6, transport: -8 }, 0, { tags: ['cautious'] }),
      c('army', 'Army Engineering Corps', { infrastructure: 22 }, 36, { tags: ['major'], flags: ['repair-crew'] })
    ],
    ignore: { infrastructure: -10, transport: -8, water: -6 }
  }),
  crisis({
    id: 'cascade-safety', title: 'Public Order Breaking Down', category: 'safety', district: 'residential', hazard: null,
    text: 'Fear is spreading. People are leaving their homes and streets are unsafe.',
    kind: 'cascade', severity: 3,
    choices: [
      c('stewards', 'Community Stewards', { safety: 16 }, 18, { tags: ['humanitarian'] }),
      c('curfew', 'Night Curfew', { safety: 14, supplies: -6, transport: -6 }, 0, { tags: ['bold'] }),
      c('townhall', 'Emergency Town Hall', { safety: 10, communication: 4 }, 6)
    ],
    ignore: { safety: -10, infrastructure: -6 }
  }),
  crisis({
    id: 'cascade-communication', title: 'Communications Blackout', category: 'communication', district: 'command', hazard: 'glitch',
    text: 'Phones, radio and internet are down. Nobody knows what is happening.',
    kind: 'cascade', severity: 3,
    choices: [
      c('towers', 'Mobile Cell Towers', { communication: 18 }, 22),
      c('radio', 'Emergency Radio Broadcasts', { communication: 12, safety: 4 }, 8),
      c('priority', 'Priority Power to Networks', { communication: 10, energy: -6 }, 0, { tags: ['cautious'] })
    ],
    ignore: { communication: -10, safety: -8 }
  }),
  crisis({
    id: 'cascade-supplies', title: 'Supply Chain Collapse', category: 'supplies', district: 'industrial', hazard: null,
    text: 'Stores are empty and warehouses are bare. Families need food today.',
    kind: 'cascade', severity: 3,
    choices: [
      c('convoys', 'Emergency Convoys', { supplies: 18, transport: -6 }, 18),
      c('ration', 'Food Rationing', { supplies: 12, safety: -8 }, 0, { tags: ['bold'] }),
      c('airlift', 'Supply Airlift', { supplies: 20 }, 34, { tags: ['major'] })
    ],
    ignore: { supplies: -10, health: -6, safety: -6 }
  })
];
