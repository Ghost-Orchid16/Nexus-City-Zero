/**
 * Special abilities, one per command role (see src/data/characters.js for the card text).
 * Each entry applies its effect through the simulation's public helpers and returns a report
 * for the HUD, the message feed and the decision timeline. The numbers here are exactly the
 * numbers printed on the role cards.
 */
import { RESOURCE_BY_ID } from '../data/resources.js';

const FOREVER = 1e9;

export const ABILITIES = {
  /** Governor: the fictional NEXUS Reactor — a huge, lasting boost with a lasting cost. */
  reactor(sim) {
    const paid = sim.spend(30);
    const applied = sim.applyDeltas({ energy: 40, safety: -8 });
    sim.shield('cascade', 'energy', 60);
    sim.reactorActive = true;
    sim.addLingering('water', -0.06, FOREVER, 'reactor');
    return {
      effects: { ...applied, budget: -paid },
      text: 'NEXUS Reactor online. Energy failures are contained for 60 s.'
    };
  },

  /** Scientist: reveal the next crises and sharpen the next response. */
  analysis(sim) {
    const upcoming = sim.revealForecast(3);
    sim.buffs.boost = 1.35;
    const names = upcoming.map((id) => sim.eventTitle(id));
    return {
      effects: {},
      forecast: upcoming,
      text: names.length ? `Next crises: ${names.join(', ')}. Your next response is 35% stronger.` : 'Your next response is 35% stronger.'
    };
  },

  /** Engineer: fix the backbone of the city and the weakest utility. */
  repair(sim) {
    const target = ['energy', 'water', 'transport'].sort((a, b) => sim.levels[a] - sim.levels[b])[0];
    const applied = sim.applyDeltas({ infrastructure: 25, [target]: 15 });
    sim.shield('decay', 'infrastructure', 45);
    sim.addCrew('industrial', 30);
    sim.addCrew(RESOURCE_BY_ID[target].district, 30);
    return { effects: applied, text: `Repair crews deployed. Infrastructure +25, ${RESOURCE_BY_ID[target].name} +15.` };
  },

  /** Medical Director: surge healthcare capacity and protect citizens. */
  medical(sim) {
    const applied = sim.applyDeltas({ health: 22, safety: 8 });
    sim.shield('decay', 'health', 45);
    return { effects: applied, text: 'Medical teams mobilized. Health holds steady for 45 s.' };
  },

  /** Energy Director: stop energy failures from spreading. */
  grid(sim) {
    const applied = sim.applyDeltas({ energy: 15 });
    sim.shield('cascade', 'energy', 75);
    return { effects: applied, text: 'Grid stabilized. Energy failures cannot spread for 75 s.' };
  },

  /** Logistics Commander: reroute transport and deliveries. */
  routing(sim) {
    const applied = sim.applyDeltas({ transport: 18, supplies: 18 });
    sim.shield('cascade', 'transport', 60);
    sim.shield('cascade', 'supplies', 60);
    return { effects: applied, text: 'Emergency routes open. Transport and supply failures contained for 60 s.' };
  },

  /** AI Systems Architect: project the next minute and soften what is coming. */
  predict(sim) {
    sim.predictUntil = sim.t + 60;
    sim.buffs.soften += 2;
    const p = sim.project(60);
    const first = p.crossings[0];
    return {
      effects: {},
      projection: p,
      text: first
        ? `Model: ${RESOURCE_BY_ID[first.system].name} reaches critical in ~${Math.max(5, Math.round(first.in / 5) * 5)} s. Next 2 crises softened.`
        : 'Model: no system reaches critical in the next 60 s. Next 2 crises softened.'
    };
  }
};
