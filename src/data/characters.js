/**
 * Command roles. Every field changes play:
 * - `affinity`: multiplier on the POSITIVE effects of choices, per system (strength / weakness)
 * - `decayMult`: slower crisis decay for the role's own domain
 * - `startBudget`: bonus emergency budget
 * - `sideEffectMult`: extra weight on the NEGATIVE effects of choices tagged `major`
 * - `majorDiscount`: budget cost multiplier for choices tagged `major`
 * - `majorStrain`: a long-term drain that follows every `major` choice ({ system, rate, duration })
 * - `resist`: multiplier on how hard failing systems drag this system down (dependency drain)
 * - `perks`: passive advantages (seeRisk: risk odds on every choice, seeForecast: trend
 *   projections and immunity to data fog, fastCrews: repair crews clear hazards faster and
 *   keep repairing after they arrive)
 * - `ability`: one special action with limited charges and a cooldown (seconds of play)
 */
export const CHARACTERS = [
  {
    id: 'governor',
    name: 'Governor',
    role: 'Emergency political authority',
    color: 'violet',
    portrait: 'portrait-governor',
    strengths: ['Authorizes major interventions at 25% lower cost', 'Starts with +25 emergency budget'],
    weakness: 'Big moves bring long-term trade-offs: +25% side effects and 30 s of unrest',
    startBudget: 25,
    sideEffectMult: 1.25,
    majorDiscount: 0.75,
    majorStrain: { system: 'safety', rate: -0.08, duration: 30 },
    affinity: {},
    perks: [],
    ability: {
      id: 'reactor',
      name: 'Emergency Power Authorization',
      icon: 'abl-reactor',
      short: 'Bring the fictional NEXUS Reactor online',
      description: 'Energy +40, energy decays 50% slower for the rest of the run, and energy failures cannot cascade for 60 s. Trade-off: Budget −30, Public Safety −8, and the reactor keeps drawing cooling water (Water slowly drains).',
      charges: 1,
      cooldown: 0
    }
  },
  {
    id: 'scientist',
    name: 'Scientist',
    role: 'Research and analysis specialist',
    color: 'cyan',
    portrait: 'portrait-scientist',
    strengths: ['Sees the hidden risk of every choice', 'Forecasts the next crises before they hit'],
    weakness: 'Less direct infrastructure power (−20% energy and infrastructure gains)',
    startBudget: 0,
    sideEffectMult: 1,
    affinity: { energy: 0.8, infrastructure: 0.8 },
    perks: ['seeRisk'],
    ability: {
      id: 'analysis',
      name: 'Rapid Analysis',
      icon: 'abl-analysis',
      short: 'Reveal the next 3 crises',
      description: 'Reveals the next 3 incoming crises and makes your next response 35% more effective.',
      charges: 2,
      cooldown: 40
    }
  },
  {
    id: 'engineer',
    name: 'Engineer',
    role: 'Infrastructure specialist',
    color: 'orange',
    portrait: 'portrait-engineer',
    strengths: ['+25% to infrastructure repairs, +20% energy and water', 'Repair crews reach sites faster'],
    weakness: 'Less pull over healthcare and logistics (−20% health and supplies gains)',
    startBudget: 0,
    sideEffectMult: 1,
    affinity: { infrastructure: 1.25, energy: 1.2, water: 1.2, health: 0.8, supplies: 0.8 },
    perks: ['fastCrews'],
    ability: {
      id: 'repair',
      name: 'Emergency Repair',
      icon: 'abl-repair',
      short: 'Rapidly repair damaged infrastructure',
      description: 'Infrastructure +25 and the weakest of Energy, Water or Transport +15. Infrastructure stops decaying for 45 s.',
      charges: 2,
      cooldown: 45
    }
  },
  {
    id: 'medical',
    name: 'Medical Director',
    role: 'Healthcare specialist',
    color: 'coral',
    portrait: 'portrait-medical',
    strengths: ['+25% to every health gain', 'Hospitals resist overload (health decays 15% slower)'],
    weakness: 'Less influence over infrastructure (−20% infrastructure gains)',
    startBudget: 0,
    sideEffectMult: 1,
    affinity: { health: 1.25, safety: 1.1, infrastructure: 0.8 },
    decayMult: { health: 0.85 },
    perks: [],
    ability: {
      id: 'medical',
      name: 'Medical Mobilization',
      icon: 'abl-medical',
      short: 'Boost healthcare and protect citizens',
      description: 'Health +22 and Public Safety +8. Health stops decaying for 45 s.',
      charges: 2,
      cooldown: 45
    }
  },
  {
    id: 'energy',
    name: 'Energy Director',
    role: 'Power-grid specialist',
    color: 'yellow',
    portrait: 'portrait-energy',
    strengths: ['+25% to every energy gain', 'Energy decays 20% slower'],
    weakness: 'Less experience with people-facing services (−15% health and safety gains)',
    startBudget: 0,
    sideEffectMult: 1,
    affinity: { energy: 1.25, health: 0.85, safety: 0.85 },
    decayMult: { energy: 0.8 },
    perks: [],
    ability: {
      id: 'grid',
      name: 'Grid Stabilization',
      icon: 'abl-grid',
      short: 'Stop energy failures from spreading',
      description: 'Energy +15 and energy failures cannot cascade into other systems for 75 s.',
      charges: 2,
      cooldown: 45
    }
  },
  {
    id: 'logistics',
    name: 'Logistics Commander',
    role: 'Transportation and supply specialist',
    color: 'green',
    portrait: 'portrait-logistics',
    strengths: ['+25% to transport and supply gains', 'Supplies resist failing roads: deliveries keep moving'],
    weakness: 'Less grip on the power grid (−20% energy gains)',
    startBudget: 0,
    sideEffectMult: 1,
    affinity: { transport: 1.25, supplies: 1.25, energy: 0.8 },
    resist: { supplies: 0.5, transport: 0.75 },
    perks: [],
    ability: {
      id: 'routing',
      name: 'Emergency Routing',
      icon: 'abl-routing',
      short: 'Reroute transport and deliveries',
      description: 'Transport +18 and Supplies +18. Transport and supply failures cannot cascade for 60 s.',
      charges: 2,
      cooldown: 45
    }
  },
  {
    id: 'ai',
    name: 'AI Systems Architect',
    role: 'Prediction and optimization specialist',
    color: 'magenta',
    portrait: 'portrait-ai',
    strengths: ['Sees where every system is heading and reads through data fog', '+25% to communication gains'],
    weakness: 'Public trust in automation is fragile (−15% safety gains)',
    startBudget: 0,
    sideEffectMult: 1,
    affinity: { communication: 1.25, safety: 0.85 },
    perks: ['seeForecast'],
    ability: {
      id: 'predict',
      name: 'Predictive Model',
      icon: 'abl-predict',
      short: 'Predict and soften what comes next',
      description: 'Shows the next 60 s of every system, flags the next cascade, and softens the next two crises by 30%.',
      charges: 2,
      cooldown: 40
    }
  }
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
