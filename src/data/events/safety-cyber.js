import { crisis, choice as c } from './helpers.js';

export const safety = [
  crisis({
    id: 'panic-buying', title: 'Panic Buying', category: 'supplies', district: 'residential', hazard: null,
    text: 'Rumors of shortages sent crowds rushing to the supermarkets. Shelves are emptying fast.',
    themes: ['supplies', 'safety'], impact: { supplies: -8, safety: -4 }, severity: 2,
    choices: [
      c('limits', 'Purchase Limits', { supplies: 12, safety: -4 }, 0, { tags: ['cautious'] }),
      c('restock', 'Emergency Restock', { supplies: 14, transport: -6 }, 20, { tags: ['economic'] }),
      c('calm', 'Calming Public Message', { safety: 10, communication: -4 }, 4, { risk: 0.2, followUp: 'misinformation-wave' })
    ],
    ignore: { supplies: -12, safety: -8 }
  }),
  crisis({
    id: 'traffic-light-outage', title: 'Traffic Lights Down', category: 'safety', district: 'downtown', hazard: 'outage',
    text: 'Traffic lights across the east side went dark. Intersections are dangerous.',
    themes: ['transport', 'energy', 'safety'], when: [['energy', '<', 68]], impact: { transport: -6, safety: -5 }, severity: 2,
    choices: [
      c('police', 'Police at Intersections', { safety: 10, transport: 6 }, 12),
      c('battery', 'Battery Backups for Signals', { transport: 12, energy: -6 }, 16, { tags: ['preventive'] }),
      c('slow', 'Citywide Speed Limit', { safety: 8, transport: -6 }, 0, { tags: ['cautious'] })
    ],
    ignore: { safety: -10, transport: -10, health: -4 }
  }),
  crisis({
    id: 'evacuation-request', title: 'Riverside Evacuation Request', category: 'safety', district: 'residential', hazard: null,
    text: 'Families near the river ask to be evacuated before nightfall.',
    themes: ['safety', 'weather', 'water'], impact: { safety: -5 }, severity: 2,
    choices: [
      c('full', 'Full Evacuation', { safety: 16, transport: -10, supplies: -6 }, 18, { tags: ['humanitarian', 'major'] }),
      c('vulnerable', 'Evacuate the Vulnerable First', { safety: 10, health: 4 }, 10, { tags: ['humanitarian'] }),
      c('shelter', 'Shelter in Place', { safety: 4 }, 0, { tags: ['bold'], risk: 0.3, followUp: 'flash-flood' })
    ],
    ignore: { safety: -12, health: -4 }
  }),
  crisis({
    id: 'depot-crowd', title: 'Crowd at the Supply Depot', category: 'safety', district: 'industrial', hazard: null,
    text: 'Hundreds of people are gathering at the supply depot and tempers are rising.',
    themes: ['supplies', 'safety'], impact: { safety: -7 }, severity: 2,
    choices: [
      c('distribute', 'Open Distribution Points', { safety: 10, supplies: -10 }, 8, { tags: ['humanitarian'] }),
      c('stewards', 'Send Crowd Stewards', { safety: 12 }, 16),
      c('schedule', 'Publish a Pickup Schedule', { safety: 8, communication: -4 }, 2, { tags: ['cautious'] }),
      c('visit', 'Visit the Crowd in Person', { safety: 16, supplies: 4 }, 10, { tags: ['humanitarian'], role: 'governor' })
    ],
    ignore: { safety: -12, supplies: -8, infrastructure: -4 }
  })
];

export const cyber = [
  crisis({
    id: 'city-servers-locked', title: 'City Servers Locked', category: 'cyber', district: 'command', hazard: 'glitch',
    text: 'Hackers locked the city’s servers and are demanding a ransom to unlock them.',
    themes: ['cyber', 'communication'], impact: { communication: -8, transport: -3 }, severity: 3,
    choices: [
      c('restore', 'Restore from Backups', { communication: 14, transport: 4 }, 20, { tags: ['infrastructure'] }),
      c('isolate', 'Isolate the Network', { communication: -4, safety: 8, energy: 4 }, 0, { tags: ['cautious'] }),
      c('pay', 'Pay the Ransom', { communication: 18 }, 36, { tags: ['bold', 'economic'], risk: 0.35, followUp: 'data-breach' }),
      c('counter', 'Counter-Intrusion AI', { communication: 20, energy: 4 }, 12, { role: 'ai' })
    ],
    ignore: { communication: -14, transport: -6, energy: -4 }
  }),
  crisis({
    id: 'misinformation-wave', title: 'Misinformation Wave', category: 'communication', district: 'command', hazard: 'glitch',
    text: 'Fake messages about a dam failure are spreading faster than the truth.',
    themes: ['cyber', 'communication', 'safety'], impact: { safety: -6, communication: -4 }, severity: 2,
    choices: [
      c('factcheck', 'Official Fact-Check Channel', { communication: 10, safety: 6 }, 12),
      c('sms', 'Emergency Text to Every Phone', { safety: 12, communication: -6 }, 6, { tags: ['bold'] }),
      c('creators', 'Team Up with Local Creators', { communication: 12, safety: 4 }, 16, { tags: ['preventive'] })
    ],
    ignore: { safety: -12, transport: -4 }
  }),
  crisis({
    id: 'radio-failure', title: 'Emergency Radio Down', category: 'communication', district: 'command', hazard: 'outage',
    text: 'The emergency radio network failed. Crews in the field can’t coordinate.',
    themes: ['communication'], impact: { communication: -8 }, severity: 2,
    choices: [
      c('satellite', 'Satellite Phones for Crews', { communication: 14, safety: 4 }, 24, { tags: ['economic'] }),
      c('volunteers', 'Ham Radio Volunteers', { communication: 8, safety: 4 }, 2, { risk: 0.2, followUp: 'misinformation-wave' }),
      c('repeater', 'Repair the Repeater Tower', { communication: 16, energy: -6 }, 16, { tags: ['infrastructure'] })
    ],
    ignore: { communication: -12, safety: -6 }
  }),
  crisis({
    id: 'satellite-down', title: 'Satellite Link Down', category: 'communication', district: 'command', hazard: 'glitch',
    text: 'A solar storm knocked out the satellite link used for navigation and dispatch.',
    themes: ['cyber', 'communication', 'weather'], impact: { communication: -6, transport: -4 }, severity: 1,
    choices: [
      c('fiber', 'Reroute Over Fiber', { communication: 12, energy: -4 }, 12),
      c('maps', 'Paper Maps for Crews', { transport: 8, communication: -2 }, 0, { tags: ['cautious'] }),
      c('lease', 'Lease a Backup Satellite', { communication: 16, transport: 6 }, 30, { tags: ['economic'] })
    ],
    ignore: { communication: -10, transport: -8 }
  }),
  crisis({
    id: 'data-breach', title: 'Data Breach', category: 'cyber', district: 'command', hazard: 'glitch',
    text: 'Hackers leaked emergency-service data. Public trust is dropping.',
    themes: ['cyber'], impact: { communication: -6, safety: -6 }, severity: 2, kind: 'followup',
    choices: [
      c('disclose', 'Full Public Disclosure', { safety: 8, communication: -4 }, 0, { tags: ['humanitarian'] }),
      c('audit', 'Emergency Security Audit', { communication: 12 }, 20),
      c('hotline', 'Support Hotline for Victims', { safety: 10, supplies: -4 }, 10, { tags: ['humanitarian'] })
    ],
    ignore: { safety: -10, communication: -8 }
  }),
  crisis({
    id: 'smart-grid-hack', title: 'Smart Grid Hacked', category: 'cyber', district: 'energy', hazard: 'glitch',
    text: 'Someone is flipping substations on and off remotely.',
    themes: ['cyber', 'energy'], impact: { energy: -8, communication: -4 }, severity: 3,
    choices: [
      c('manual', 'Switch Substations to Manual', { energy: 12, transport: -4 }, 10, { tags: ['cautious'] }),
      c('hunt', 'Hunt Down the Intruder', { communication: 12, energy: 6 }, 22, { risk: 0.25, followUp: 'data-breach' }),
      c('cut', 'Cut the Grid Off the Internet', { energy: 8, communication: -8 }, 0, { tags: ['bold'] })
    ],
    ignore: { energy: -14, communication: -6 }
  })
];
