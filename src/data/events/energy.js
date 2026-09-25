import { crisis, choice as c } from './helpers.js';

export default [
  crisis({
    id: 'grid-overload', title: 'Grid Overload', category: 'energy', district: 'energy', hazard: 'sparks',
    text: 'Demand spikes across the city and substations are running hot. Something has to give.',
    themes: ['energy'], impact: { energy: -6 }, severity: 2,
    choices: [
      c('rolling', 'Rolling Blackouts', { energy: 14, safety: -6, communication: -4 }, 0, { tags: ['cautious', 'infrastructure'] }),
      c('import', 'Buy Emergency Power', { energy: 18 }, 30, { tags: ['economic'] }),
      c('industry', 'Cut Industrial Power', { energy: 16, supplies: -10, infrastructure: -3 }, 0, { tags: ['bold'], risk: 0.25, followUp: 'warehouse-spoilage' }),
      c('balance', 'Smart Load Balancing', { energy: 20, communication: 4 }, 10, { tags: ['infrastructure'], role: 'energy' })
    ],
    ignore: { energy: -14, communication: -6 }
  }),
  crisis({
    id: 'hospital-power-failure', title: 'Hospital Power Failure', category: 'energy', district: 'medical', hazard: 'sparks',
    text: 'The Central Hospital lost grid power. Its backup generators only have fuel for a few hours.',
    themes: ['energy', 'health'], impact: { health: -5 }, severity: 3,
    choices: [
      c('hospital', 'Restore Hospital Power', { health: 18, energy: -12 }, 25, { tags: ['humanitarian'] }),
      c('grid', 'Stabilize Main Grid', { energy: 16, health: -8 }, 15, { tags: ['infrastructure'], risk: 0.2, followUp: 'patient-surge' }),
      c('backup', 'Deploy Emergency Backup', { health: 10, energy: -2 }, 40, { tags: ['economic', 'cautious'] })
    ],
    ignore: { health: -14, safety: -5 }
  }),
  crisis({
    id: 'substation-fire', title: 'Substation Fire', category: 'energy', district: 'energy', hazard: 'fire',
    text: 'A transformer at the main substation is on fire. The grid is losing capacity by the minute.',
    themes: ['energy', 'industrial'], impact: { energy: -8, safety: -3 }, severity: 3,
    choices: [
      c('firefighters', 'Send Firefighters', { safety: 8, energy: 6, infrastructure: -4 }, 15, { tags: ['humanitarian'] }),
      c('reroute', 'Isolate & Reroute Power', { energy: 12, communication: -6 }, 10, { tags: ['infrastructure'], risk: 0.2, followUp: 'grid-overload' }),
      c('rebuild', 'Rebuild the Substation', { energy: 20, infrastructure: 6 }, 38, { tags: ['major', 'infrastructure'] })
    ],
    ignore: { energy: -14, infrastructure: -8, safety: -6 }
  }),
  crisis({
    id: 'solar-surplus', title: 'Solar Surplus', category: 'energy', district: 'energy', hazard: null,
    text: 'A bright afternoon floods the grid with solar power. Where should the extra energy go?',
    themes: ['energy', 'weather'], weight: 0.7, severity: 1, kind: 'recovery',
    choices: [
      c('store', 'Charge City Batteries', { energy: 14 }, 8, { tags: ['preventive'] }),
      c('pumps', 'Power the Water Pumps', { water: 12, energy: 4 }, 5, { tags: ['preventive'] }),
      c('sell', 'Sell to Neighbor Cities', { budget: 22 }, 0, { tags: ['economic'] })
    ],
    ignore: {}
  }),
  crisis({
    id: 'transformer-explosion', title: 'Transformer Explosion', category: 'energy', district: 'downtown', hazard: 'fire',
    text: 'A transformer exploded downtown. Offices and cell towers on the block lost power.',
    themes: ['energy', 'communication'], impact: { energy: -6, communication: -6 }, severity: 2,
    choices: [
      c('crews', 'Emergency Line Crews', { energy: 12, communication: 8 }, 28, { tags: ['infrastructure'] }),
      c('comms', 'Prioritize Communications', { communication: 16, energy: -4 }, 12, { tags: ['cautious'] }),
      c('evacuate', 'Evacuate the Block', { safety: 12, supplies: -6, transport: -6 }, 8, { tags: ['humanitarian'] })
    ],
    ignore: { energy: -10, communication: -10, safety: -6 }
  }),
  crisis({
    id: 'wind-farm-shutdown', title: 'Wind Farm Shutdown', category: 'energy', district: 'energy', hazard: 'outage',
    text: 'Dangerous winds forced the wind turbines to lock their blades.',
    themes: ['energy', 'weather'], impact: { energy: -7 }, severity: 1,
    choices: [
      c('gas', 'Fire Up Gas Generators', { energy: 14, health: -5 }, 18, { tags: ['bold'] }),
      c('save', 'Ask Citizens to Save Power', { energy: 8, communication: -3 }, 0, { tags: ['cautious'] }),
      c('batteries', 'Release Battery Reserves', { energy: 12 }, 12, { lingering: [{ system: 'energy', rate: -0.05, duration: 50 }] })
    ],
    ignore: { energy: -10 }
  }),
  crisis({
    id: 'blackout-protests', title: 'Blackout Protests', category: 'safety', district: 'residential', hazard: null,
    text: 'Neighborhoods without power are gathering outside City Hall, demanding answers.',
    themes: ['energy', 'safety'], when: [['energy', '<', 55]], impact: { safety: -6 }, severity: 2,
    choices: [
      c('restore', 'Restore Their Power First', { safety: 10, energy: -8 }, 10, { tags: ['humanitarian'] }),
      c('shelters', 'Open Warm Shelters', { safety: 12, supplies: -8 }, 16, { tags: ['humanitarian'] }),
      c('broadcast', 'Broadcast a Recovery Plan', { safety: 8, communication: -4 }, 4, { tags: ['cautious'], risk: 0.2, followUp: 'misinformation-wave' }),
      c('decree', 'Emergency Decree', { safety: 16, energy: 6 }, 20, { tags: ['major'], role: 'governor' })
    ],
    ignore: { safety: -12, infrastructure: -4 }
  }),
  crisis({
    id: 'lightning-strike', title: 'Lightning Strike', category: 'energy', district: 'energy', hazard: 'sparks',
    text: 'Lightning struck the main transmission line. Half of the east side flickered off.',
    themes: ['weather', 'energy'], impact: { energy: -8, communication: -4 }, severity: 2,
    choices: [
      c('repair', 'Live-Line Repair Team', { energy: 12, safety: -4 }, 14, { tags: ['bold'] }),
      c('bypass', 'Bypass Through Old Lines', { energy: 8, infrastructure: -4 }, 4, { tags: ['cautious'] }),
      c('replace', 'Replace the Whole Segment', { energy: 16, infrastructure: 6 }, 30, { tags: ['major', 'preventive'] }),
      c('island', 'Island the Grid Sections', { energy: 18, safety: 4 }, 8, { tags: ['infrastructure'], role: 'energy' })
    ],
    ignore: { energy: -12, communication: -6 }
  })
];
