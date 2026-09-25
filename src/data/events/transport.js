import { crisis, choice as c } from './helpers.js';

export default [
  crisis({
    id: 'bridge-closure', title: 'Cracks on the Main Bridge', category: 'transport', district: 'water', hazard: 'crack',
    text: 'Engineers found cracks on Nexus Bridge and want it closed right now.',
    themes: ['transport', 'infrastructure'], impact: { transport: -8 }, severity: 3,
    choices: [
      c('close', 'Close the Bridge', { safety: 10, transport: -8, supplies: -4 }, 0, { tags: ['cautious'] }),
      c('reinforce', 'Reinforce and Keep Open', { transport: 10, infrastructure: 8 }, 28, { tags: ['infrastructure', 'major'] }),
      c('ferry', 'Run Emergency Ferries', { transport: 12, supplies: 4 }, 16, { tags: ['bold'], risk: 0.2, followUp: 'gridlock-downtown' }),
      c('shore', 'Shore Up the Bridge Overnight', { transport: 14, infrastructure: 12 }, 12, { tags: ['infrastructure'], role: 'engineer', flags: ['repair-crew'] })
    ],
    ignore: { transport: -12, safety: -8, infrastructure: -6 }
  }),
  crisis({
    id: 'metro-signal-failure', title: 'Metro Signal Failure', category: 'transport', district: 'transport', hazard: 'glitch',
    text: 'The metro signal system crashed. Trains are stuck between stations.',
    themes: ['transport', 'communication', 'cyber'], impact: { transport: -8, communication: -3 }, severity: 2,
    choices: [
      c('manual', 'Manual Signal Control', { transport: 12, safety: -4 }, 10, { tags: ['bold'] }),
      c('buses', 'Replacement Bus Service', { transport: 10, supplies: -4 }, 16),
      c('reboot', 'Full System Reboot', { transport: 16, communication: -8 }, 20, { tags: ['major'] })
    ],
    ignore: { transport: -14, safety: -5 }
  }),
  crisis({
    id: 'gridlock-downtown', title: 'Downtown Gridlock', category: 'transport', district: 'downtown', hazard: null,
    text: 'Traffic lights are out downtown and every street is locked solid.',
    themes: ['transport'], impact: { transport: -8, supplies: -3 }, severity: 2,
    choices: [
      c('officers', 'Traffic Officers at Every Junction', { transport: 12, safety: -6 }, 10),
      c('reverse', 'Reverse Lanes Outbound', { transport: 10, communication: -3 }, 4, { tags: ['bold'] }),
      c('curfew', 'Temporary Driving Curfew', { transport: 8, supplies: -8 }, 0, { tags: ['cautious'] })
    ],
    ignore: { transport: -12, health: -4, supplies: -4 }
  }),
  crisis({
    id: 'fuel-shortage', title: 'Fuel Shortage', category: 'supplies', district: 'industrial', hazard: null,
    text: 'Fuel stations are running dry and delivery trucks are parked in rows.',
    themes: ['transport', 'supplies'], impact: { transport: -6, supplies: -5 }, severity: 2,
    choices: [
      c('reserve', 'Release the Fuel Reserve', { transport: 14, supplies: 6 }, 24, { tags: ['economic'] }),
      c('priority', 'Fuel for Emergency Vehicles Only', { health: 6, transport: -6, safety: 4 }, 0, { tags: ['humanitarian'] }),
      c('electric', 'Switch Buses to Electric', { transport: 10, energy: -10 }, 10, { tags: ['preventive'] })
    ],
    ignore: { transport: -10, supplies: -10 }
  }),
  crisis({
    id: 'freight-train-stalled', title: 'Freight Train Stalled', category: 'transport', district: 'transport', hazard: null,
    text: 'A freight train full of food stalled on the main line outside the station.',
    themes: ['transport', 'supplies'], impact: { supplies: -6 }, severity: 1,
    choices: [
      c('tow', 'Send a Rescue Locomotive', { supplies: 12, transport: 4 }, 14),
      c('trucks', 'Unload by Truck', { supplies: 10, transport: -8 }, 8),
      c('wait', 'Wait for Repairs', { supplies: 4 }, 0, { tags: ['cautious'], lingering: [{ system: 'supplies', rate: -0.05, duration: 40 }] })
    ],
    ignore: { supplies: -10, transport: -6 }
  }),
  crisis({
    id: 'traffic-ai-glitch', title: 'Traffic AI Glitch', category: 'cyber', district: 'downtown', hazard: 'glitch',
    text: 'The AI traffic controller is sending cars around in circles.',
    themes: ['cyber', 'transport'], impact: { transport: -8 }, severity: 2,
    choices: [
      c('manual', 'Switch to Manual Mode', { transport: 10, safety: -4 }, 6),
      c('patch', 'Emergency Software Patch', { transport: 14, communication: 4 }, 18, { tags: ['bold'], risk: 0.2, followUp: 'city-servers-locked' }),
      c('offline', 'Take It Offline', { transport: 6, communication: -4 }, 0, { tags: ['cautious'] }),
      c('retrain', 'Retrain the Model Live', { transport: 18, communication: 6 }, 8, { role: 'ai' })
    ],
    ignore: { transport: -12, supplies: -4 }
  })
];
