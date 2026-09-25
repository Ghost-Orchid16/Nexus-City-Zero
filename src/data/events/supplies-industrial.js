import { crisis, choice as c } from './helpers.js';

export const supplies = [
  crisis({
    id: 'warehouse-spoilage', title: 'Warehouse Freezers Failed', category: 'supplies', district: 'industrial', hazard: 'outage',
    text: 'The freezers at the central food warehouse stopped working.',
    themes: ['supplies', 'energy'], when: [['energy', '<', 68]], impact: { supplies: -8 }, severity: 2,
    choices: [
      c('rescue', 'Rescue the Food Now', { supplies: 10, transport: -6 }, 10),
      c('trucks', 'Rent Refrigerated Trucks', { supplies: 12 }, 22, { tags: ['economic'] }),
      c('donate', 'Donate What’s Left Today', { safety: 8, supplies: -4 }, 0, { tags: ['humanitarian'] })
    ],
    ignore: { supplies: -12, health: -4 }
  }),
  crisis({
    id: 'convoy-delayed', title: 'Supply Convoy Stuck', category: 'supplies', district: 'transport', hazard: null,
    text: 'The food convoy is stuck at the city border behind a blocked road.',
    themes: ['supplies', 'transport'], impact: { supplies: -6 }, severity: 2,
    choices: [
      c('escort', 'Police Escort', { supplies: 14, safety: -6 }, 8),
      c('airdrop', 'Emergency Airdrop', { supplies: 12 }, 28, { tags: ['economic'] }),
      c('farms', 'Buy from Local Farms', { supplies: 8 }, 12, { tags: ['preventive'], lingering: [{ system: 'supplies', rate: 0.06, duration: 40 }] }),
      c('reroute', 'Reroute Through the Port', { supplies: 18, transport: 6 }, 8, { role: 'logistics' })
    ],
    ignore: { supplies: -12, health: -4 }
  }),
  crisis({
    id: 'price-spike', title: 'Prices Double Overnight', category: 'supplies', district: 'residential', hazard: null,
    text: 'Prices for bread, milk and fuel doubled overnight. Families are worried.',
    themes: ['supplies', 'safety'], impact: { supplies: -5, safety: -4 }, severity: 1,
    choices: [
      c('freeze', 'Emergency Price Freeze', { safety: 10, supplies: -6 }, 0, { tags: ['bold'] }),
      c('subsidy', 'Subsidize Essentials', { supplies: 10, safety: 6 }, 26, { tags: ['economic', 'humanitarian'] }),
      c('vouchers', 'Food Vouchers for Families', { safety: 8, supplies: 4 }, 14, { tags: ['humanitarian'] })
    ],
    ignore: { safety: -10, supplies: -8 }
  }),
  crisis({
    id: 'donation-drive', title: 'Citywide Donation Drive', category: 'supplies', district: 'command', hazard: null,
    text: 'Citizens organized a huge donation drive. Where should it help most?',
    themes: ['supplies', 'safety'], weight: 0.6, severity: 1, kind: 'recovery',
    choices: [
      c('food', 'Food Banks', { supplies: 14 }, 2, { tags: ['humanitarian'] }),
      c('clinics', 'Neighborhood Clinics', { health: 12 }, 2, { tags: ['humanitarian'] }),
      c('fund', 'The Emergency Fund', { budget: 20 }, 0, { tags: ['economic'] })
    ],
    ignore: {}
  })
];

export const industrial = [
  crisis({
    id: 'chemical-leak', title: 'Chemical Leak', category: 'industrial', district: 'industrial', hazard: 'toxic',
    text: 'A tank at the chemical works is leaking toxic fumes over the east side.',
    themes: ['industrial', 'health'], impact: { safety: -7, health: -4 }, severity: 3,
    choices: [
      c('contain', 'Hazmat Containment', { safety: 12, health: 4 }, 24, { tags: ['infrastructure'], flags: ['contain-toxic'] }),
      c('evacuate', 'Evacuate Downwind', { safety: 10, transport: -8, supplies: -4 }, 8, { tags: ['humanitarian'] }),
      c('shelter', 'Tell Everyone to Stay Indoors', { safety: 6, health: -4 }, 0, { tags: ['cautious'], risk: 0.3, followUp: 'toxic-drift' }),
      c('neutralize', 'Chemical Neutralizer Foam', { safety: 16, health: 8 }, 12, { role: 'scientist', flags: ['contain-toxic'] })
    ],
    ignore: { health: -12, safety: -10 }
  }),
  crisis({
    id: 'factory-fire', title: 'Factory Fire', category: 'industrial', district: 'industrial', hazard: 'fire',
    text: 'A fire broke out in the textile factory and smoke is pouring out.',
    themes: ['industrial', 'safety'], impact: { infrastructure: -6, safety: -5 }, severity: 3,
    choices: [
      c('all', 'Send All Fire Crews', { safety: 12, infrastructure: 6, transport: -6 }, 16, { tags: ['humanitarian'] }),
      c('contain', 'Contain It and Let It Burn Out', { safety: 6, supplies: -8 }, 4, { tags: ['cautious'] }),
      c('aircraft', 'Firefighting Aircraft', { safety: 14, infrastructure: 8 }, 30, { tags: ['major'] })
    ],
    ignore: { infrastructure: -12, safety: -10, supplies: -6 }
  }),
  crisis({
    id: 'toxic-drift', title: 'Toxic Smoke Drifting', category: 'industrial', district: 'residential', hazard: 'toxic',
    text: 'The wind shifted and toxic smoke is now drifting toward homes.',
    themes: ['industrial', 'weather', 'health'], impact: { health: -6 }, severity: 2,
    choices: [
      c('masks', 'Hand Out Masks', { health: 10, supplies: -8 }, 8, { tags: ['humanitarian'] }),
      c('sirens', 'Sound the Sirens', { safety: 10, communication: -4 }, 0),
      c('curtains', 'Water Curtains at the Plant', { health: 8, water: -10 }, 12, { tags: ['preventive'], flags: ['contain-toxic'] })
    ],
    ignore: { health: -12, safety: -8 }
  }),
  crisis({
    id: 'gas-explosion', title: 'Gas Explosion', category: 'infrastructure', district: 'residential', hazard: 'fire',
    text: 'The gas leak ignited. An explosion rocked the district.',
    themes: ['infrastructure'], impact: { safety: -8, infrastructure: -6 }, severity: 3, kind: 'followup',
    choices: [
      c('rescue', 'All Rescue Teams', { safety: 12, health: 6 }, 16, { tags: ['humanitarian'] }),
      c('secure', 'Secure the Gas Network', { infrastructure: 10, energy: -6 }, 12, { tags: ['infrastructure'] })
    ],
    ignore: { safety: -12, health: -8 }
  }),
  crisis({
    id: 'building-collapse', title: 'Partial Collapse', category: 'infrastructure', district: 'residential', hazard: 'crack',
    text: 'Part of the damaged apartment tower collapsed. People may be trapped.',
    themes: ['infrastructure'], impact: { safety: -8, infrastructure: -8 }, severity: 3, kind: 'followup',
    choices: [
      c('rescue', 'Search and Rescue', { safety: 12, health: 6 }, 16, { tags: ['humanitarian'] }),
      c('clear', 'Clear the Rubble', { infrastructure: 10, transport: 4 }, 14, { tags: ['infrastructure'], flags: ['repair-crew'] })
    ],
    ignore: { safety: -12, health: -8 }
  })
];
