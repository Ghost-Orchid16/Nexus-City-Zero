import { crisis, choice as c } from './helpers.js';

export default [
  crisis({
    id: 'er-overload', title: 'Emergency Rooms Overloaded', category: 'health', district: 'medical', hazard: null,
    text: 'Every emergency room is full and ambulances are queuing outside the hospital.',
    themes: ['health'], impact: { health: -7 }, severity: 3,
    choices: [
      c('field', 'Open a Field Hospital', { health: 16, supplies: -10 }, 20, { tags: ['humanitarian', 'major'] }),
      c('transfer', 'Transfer Patients Out of Town', { health: 12, transport: -10 }, 14),
      c('triage', 'Strict Triage Protocol', { health: 8, safety: -4 }, 0, { tags: ['cautious'] }),
      c('mobile', 'Mobile Clinics', { health: 20, safety: 4 }, 12, { tags: ['humanitarian'], role: 'medical' })
    ],
    ignore: { health: -14, safety: -6 }
  }),
  crisis({
    id: 'patient-surge', title: 'Patient Surge', category: 'health', district: 'medical', hazard: null,
    text: 'A new wave of patients arrives faster than beds can be freed.',
    themes: ['health'], impact: { health: -8 }, severity: 2,
    choices: [
      c('shifts', 'Double Staff Shifts', { health: 14 }, 18, { tags: ['bold'], lingering: [{ system: 'health', rate: -0.06, duration: 40 }] }),
      c('clinics', 'Open Neighborhood Clinics', { health: 12, supplies: -6, energy: -4 }, 12, { tags: ['humanitarian'] }),
      c('postpone', 'Postpone Non-Urgent Care', { health: 7, safety: -3 }, 0, { tags: ['cautious'] }),
      c('network', 'Regional Triage Network', { health: 18, safety: 4 }, 10, { tags: ['humanitarian'], role: 'medical' })
    ],
    ignore: { health: -12, safety: -5 }
  }),
  crisis({
    id: 'ambulance-shortage', title: 'Ambulance Shortage', category: 'health', district: 'medical', hazard: null,
    text: 'Too many calls, too few ambulances. Response times are climbing fast.',
    themes: ['health', 'transport'], impact: { health: -5 }, severity: 2,
    choices: [
      c('taxis', 'Deputize City Taxis', { health: 12, transport: -6 }, 6, { tags: ['bold'], risk: 0.2, followUp: 'gridlock-downtown' }),
      c('rent', 'Rent Private Ambulances', { health: 14 }, 26, { tags: ['economic'] }),
      c('lanes', 'Priority Lanes for Ambulances', { health: 10, transport: -10 }, 0),
      c('dispatch', 'Smart Dispatch Network', { health: 16, transport: 4 }, 8, { role: 'logistics' })
    ],
    ignore: { health: -12, safety: -4 }
  }),
  crisis({
    id: 'heatstroke-wave', title: 'Heatstroke Wave', category: 'health', district: 'residential', hazard: null,
    text: 'A heatwave is sending hundreds of people with heatstroke to the clinics.',
    themes: ['weather', 'health'], impact: { health: -6, energy: -4 }, severity: 2,
    choices: [
      c('cooling', 'Open Cooling Centers', { health: 14, energy: -8 }, 12, { tags: ['humanitarian'] }),
      c('water', 'Hand Out Water on the Streets', { health: 10, water: -8, supplies: -4 }, 8, { tags: ['humanitarian'] }),
      c('alerts', 'Heat Alerts on Every Channel', { health: 8, communication: -4 }, 0, { tags: ['preventive'] })
    ],
    ignore: { health: -12, safety: -4 }
  }),
  crisis({
    id: 'medicine-shortage', title: 'Medicine Shortage', category: 'health', district: 'medical', hazard: null,
    text: 'Pharmacies report they are almost out of basic medicine.',
    themes: ['health', 'supplies'], when: [['supplies', '<', 72]], impact: { health: -5, supplies: -4 }, severity: 2,
    choices: [
      c('order', 'Emergency Medicine Order', { health: 12, supplies: 6 }, 28, { tags: ['economic'] }),
      c('hospitals', 'Send Everything to Hospitals', { health: 10, safety: -6 }, 6),
      c('factory', 'Convert a Factory Line', { supplies: 12, infrastructure: -6 }, 14, { tags: ['bold'], risk: 0.2, followUp: 'chemical-leak' })
    ],
    ignore: { health: -12, supplies: -6 }
  }),
  crisis({
    id: 'field-hospital-offer', title: 'Field Hospital Offered', category: 'health', district: 'command', hazard: null,
    text: 'The national guard offers a mobile hospital. Where should it be set up?',
    themes: ['health'], weight: 0.6, severity: 1, kind: 'recovery',
    choices: [
      c('medical', 'Next to the Hospital', { health: 16 }, 4, { tags: ['humanitarian'] }),
      c('residential', 'In the Residential District', { health: 8, safety: 8 }, 4, { tags: ['humanitarian'] }),
      c('industrial', 'At the Industrial Zone', { health: 6, supplies: 8 }, 4)
    ],
    ignore: {}
  })
];
