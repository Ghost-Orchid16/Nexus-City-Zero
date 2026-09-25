import { crisis, choice as c } from './helpers.js';

export default [
  crisis({
    id: 'sinkhole', title: 'Sinkhole on the Boulevard', category: 'infrastructure', district: 'transport', hazard: 'crack',
    text: 'A sinkhole swallowed a lane of Nexus Boulevard. More of the road may give way.',
    themes: ['infrastructure', 'transport'], impact: { infrastructure: -8, transport: -6 }, severity: 2,
    choices: [
      c('patch', 'Emergency Fill and Patch', { infrastructure: 10, transport: 6 }, 16, { tags: ['infrastructure'], flags: ['repair-crew'] }),
      c('detour', 'Detour All Traffic', { transport: -4, safety: 8 }, 0, { tags: ['cautious'] }),
      c('rebuild', 'Rebuild the Roadbed', { infrastructure: 18, transport: 10 }, 34, { tags: ['major', 'preventive'], flags: ['repair-crew'] })
    ],
    ignore: { infrastructure: -12, transport: -8, safety: -4 }
  }),
  crisis({
    id: 'gas-leak', title: 'Gas Leak', category: 'infrastructure', district: 'residential', hazard: 'smoke',
    text: 'Residents smell gas near the old pipelines under their homes.',
    themes: ['infrastructure', 'industrial', 'safety'], impact: { safety: -8 }, severity: 3,
    choices: [
      c('evacuate', 'Evacuate the Blocks', { safety: 12, supplies: -6, transport: -4 }, 8, { tags: ['humanitarian'] }),
      c('shutoff', 'Shut Off Gas Citywide', { safety: 10, energy: -10 }, 0, { tags: ['bold'] }),
      c('locate', 'Send Leak Detection Teams', { safety: 8, infrastructure: 6 }, 14, { tags: ['infrastructure'], risk: 0.25, followUp: 'gas-explosion' })
    ],
    ignore: { safety: -14, infrastructure: -6, health: -4 }
  }),
  crisis({
    id: 'structural-alarm', title: 'Structural Alarm', category: 'infrastructure', district: 'residential', hazard: 'crack',
    text: 'Sensors in an apartment tower report dangerous new cracks.',
    themes: ['infrastructure'], impact: { safety: -5, infrastructure: -4 }, severity: 2,
    choices: [
      c('evacuate', 'Evacuate the Tower', { safety: 12, supplies: -4 }, 6, { tags: ['humanitarian', 'cautious'] }),
      c('brace', 'Brace the Structure', { infrastructure: 12, safety: 4 }, 22, { tags: ['infrastructure'], flags: ['repair-crew'] }),
      c('monitor', 'Keep Monitoring', { safety: -2 }, 0, { tags: ['bold'], risk: 0.45, followUp: 'building-collapse' })
    ],
    ignore: { safety: -10, infrastructure: -8 }
  }),
  crisis({
    id: 'crane-collapse-risk', title: 'Swaying Tower Crane', category: 'infrastructure', district: 'industrial', hazard: null,
    text: 'Strong wind is rocking a tower crane above the Industrial District.',
    themes: ['industrial', 'infrastructure', 'weather'], impact: { safety: -5 }, severity: 1,
    choices: [
      c('secure', 'Secure the Crane', { safety: 10, infrastructure: 4 }, 14),
      c('clear', 'Clear the Area', { safety: 12, supplies: -8 }, 0, { tags: ['cautious'] }),
      c('dismantle', 'Dismantle It Now', { infrastructure: 8, safety: 6 }, 24, { tags: ['major'] })
    ],
    ignore: { safety: -12, infrastructure: -8 }
  }),
  crisis({
    id: 'aging-pipes', title: 'Aging Pipe Network', category: 'infrastructure', district: 'water', hazard: 'flood',
    text: 'Small leaks are popping up all over the old pipe network at once.',
    themes: ['infrastructure', 'water'], impact: { water: -5, infrastructure: -5 }, severity: 1,
    choices: [
      c('patch', 'Patch the Worst Leaks', { water: 8, infrastructure: 6 }, 10, { flags: ['repair-crew'] }),
      c('pressure', 'Lower the Water Pressure', { infrastructure: 10, water: -6 }, 0, { tags: ['cautious'] }),
      c('replace', 'Replace a Whole Section', { infrastructure: 16, water: 8 }, 32, { tags: ['major', 'preventive'], flags: ['repair-crew'] })
    ],
    ignore: { water: -10, infrastructure: -10 }
  })
];
