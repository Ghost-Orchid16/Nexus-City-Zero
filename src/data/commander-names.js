/**
 * Fictional commander call signs for the local scoreboard (no accounts, no typing needed at an
 * exhibition stand). Names are drawn from the run's seed; players can re-roll on the results screen.
 */
export const FIRST = [
  'Nova', 'Juniper', 'Comet', 'Atlas', 'Maple', 'Pixel', 'Echo', 'Sunny', 'Orbit', 'Blaze',
  'River', 'Clover', 'Ziggy', 'Indigo', 'Marble', 'Sparrow', 'Tango', 'Willow', 'Rocket', 'Luna',
  'Basil', 'Kiwi', 'Quartz', 'Poppy', 'Cosmo', 'Hazel', 'Jet', 'Saffron', 'Bolt', 'Coral'
];

export const LAST = [
  'Otter', 'Falcon', 'Lynx', 'Heron', 'Badger', 'Koala', 'Orca', 'Fox', 'Panda', 'Gecko',
  'Puffin', 'Moose', 'Beacon', 'Harbor', 'Summit', 'Meadow', 'Canyon', 'Glacier', 'Cedar', 'Starling',
  'Walrus', 'Kestrel', 'Bison', 'Lantern', 'Comet', 'Ridge', 'Marten', 'Tapir', 'Wren', 'Yak'
];

/** @param {{pick: (list: string[]) => string}} rng */
export function commanderName(rng) {
  let first = rng.pick(FIRST);
  let last = rng.pick(LAST);
  if (first === last) last = LAST[(LAST.indexOf(last) + 1) % LAST.length];
  return `CMDR. ${first.toUpperCase()} ${last.toUpperCase()}`;
}
