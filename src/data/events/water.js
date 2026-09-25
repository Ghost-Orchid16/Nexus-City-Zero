import { crisis, choice as c } from './helpers.js';

export default [
  crisis({
    id: 'water-main-burst', title: 'Water Main Burst', category: 'water', district: 'residential', hazard: 'flood',
    text: 'A major pipe burst under the Residential District. Streets are flooding and taps are sputtering.',
    themes: ['water', 'infrastructure'], impact: { water: -8, infrastructure: -4 }, severity: 2,
    choices: [
      c('repair', 'Emergency Pipe Repair', { water: 12, infrastructure: 6 }, 22, { tags: ['infrastructure'], flags: ['repair-crew'] }),
      c('shutoff', 'Shut Off the District', { water: 8, safety: -8 }, 0, { tags: ['cautious'] }),
      c('pump', 'Pump Out the Streets', { infrastructure: 10, water: -4, energy: -5 }, 12, { tags: ['preventive'] }),
      c('field', 'Field Repair Crew', { water: 16, infrastructure: 12 }, 10, { tags: ['infrastructure'], role: 'engineer', flags: ['repair-crew'] })
    ],
    ignore: { water: -12, infrastructure: -8, transport: -5 }
  }),
  crisis({
    id: 'reservoir-contamination', title: 'Contaminated Reservoir', category: 'water', district: 'water', hazard: 'toxic',
    text: 'Tests found bacteria in the main reservoir. Drinking water for the whole city is at risk.',
    themes: ['water', 'health'], impact: { water: -6, health: -3 }, severity: 3,
    choices: [
      c('treat', 'Emergency Chlorination', { water: 14, supplies: -6 }, 18, { tags: ['infrastructure'] }),
      c('bottled', 'Distribute Bottled Water', { health: 10, supplies: -12 }, 14, { tags: ['humanitarian'] }),
      c('boil', 'Issue a Boil-Water Notice', { health: 6, water: -4, communication: -4 }, 0, { tags: ['cautious'] }),
      c('trace', 'Trace the Source', { water: 18, health: 6 }, 10, { tags: ['preventive'], role: 'scientist' })
    ],
    ignore: { health: -12, water: -10, safety: -4 }
  }),
  crisis({
    id: 'pump-station-outage', title: 'Pump Station Power Loss', category: 'water', district: 'water', hazard: 'outage',
    text: 'Without power, the pumps can no longer push water up to the hill neighborhoods.',
    themes: ['water', 'energy'], when: [['energy', '<', 60]], impact: { water: -8 }, severity: 2,
    choices: [
      c('generators', 'Truck In Generators', { water: 14, transport: -6 }, 16),
      c('divert', 'Divert Grid Power', { water: 16, energy: -12 }, 0, { tags: ['bold'] }),
      c('ration', 'Ration Water by Zone', { water: 8, safety: -6 }, 0, { tags: ['cautious'] })
    ],
    ignore: { water: -14, health: -5 }
  }),
  crisis({
    id: 'drought-emergency', title: 'Drought Emergency', category: 'water', district: 'water', hazard: null,
    text: 'After weeks without rain, the reservoir just hit a record low.',
    themes: ['water', 'weather'], impact: { water: -6 }, severity: 2,
    choices: [
      c('strict', 'Strict Rationing', { water: 14, safety: -8 }, 0, { tags: ['bold'] }),
      c('tankers', 'Water Tanker Convoys', { water: 12, transport: -8 }, 20),
      c('desal', 'Emergency Desalination Rig', { water: 20, energy: -10 }, 30, { tags: ['major', 'preventive'] })
    ],
    ignore: { water: -12, health: -6 }
  }),
  crisis({
    id: 'chemical-shortage', title: 'Treatment Chemicals Running Out', category: 'water', district: 'water', hazard: null,
    text: 'The water plant has only two days of cleaning chemicals left.',
    themes: ['water', 'supplies'], when: [['supplies', '<', 70]], impact: { water: -5 }, severity: 1,
    choices: [
      c('airlift', 'Airlift Chemicals', { water: 12 }, 26, { tags: ['economic'] }),
      c('borrow', 'Borrow from Factories', { water: 10, supplies: -8, infrastructure: -3 }, 6),
      c('stretch', 'Stretch Supplies (Lower Output)', { water: 4, health: -5 }, 0, { tags: ['cautious'] })
    ],
    ignore: { water: -12, health: -6 }
  }),
  crisis({
    id: 'flash-flood', title: 'Flash Flood', category: 'water', district: 'transport', hazard: 'flood',
    text: 'Rainwater overwhelms the drains and pours into the Transport Hub tunnels.',
    themes: ['weather', 'water', 'transport'], impact: { transport: -8, infrastructure: -5 }, severity: 2,
    choices: [
      c('pumps', 'Deploy Flood Pumps', { transport: 12, energy: -6 }, 16, { tags: ['infrastructure'] }),
      c('close', 'Close the Underpasses', { safety: 10, transport: -6 }, 0, { tags: ['cautious'] }),
      c('barriers', 'Build Flood Barriers', { infrastructure: 14, transport: 6 }, 30, { tags: ['preventive', 'major'] })
    ],
    ignore: { transport: -12, infrastructure: -8, safety: -4 }
  }),
  crisis({
    id: 'dam-stress', title: 'Dam Under Stress', category: 'infrastructure', district: 'water', hazard: 'crack',
    text: 'The dam upstream shows stress fractures after heavy rain.',
    themes: ['infrastructure', 'water', 'weather'], impact: { water: -4, infrastructure: -4 }, severity: 3,
    choices: [
      c('release', 'Controlled Water Release', { infrastructure: 10, water: -8 }, 0, { tags: ['cautious'] }),
      c('reinforce', 'Reinforce the Dam', { infrastructure: 14, water: 6 }, 30, { tags: ['major'] }),
      c('sandbags', 'Sandbag the Riverside', { safety: 10, supplies: -8 }, 8, { tags: ['humanitarian'] })
    ],
    ignore: { infrastructure: -12, water: -8, safety: -6 }
  })
];
