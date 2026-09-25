/**
 * The crisis is framed as "15 MINUTES UNTIL CITY COLLAPSE" but plays in about 4 minutes:
 * the in-game clock runs 7× faster until the last minute, which then runs in real time so the
 * finale feels dramatic. While a decision card is open the whole city slows to 30%.
 */
export const CLOCK = {
  total: 900, // in-game seconds shown on the countdown (15:00)
  fastRate: 7, // in-game seconds per simulated second before the final minute
  finalWindow: 60, // last in-game minute runs 1:1
  decisionDilation: 0.3 // simulated time rate while the player is deciding
};

export const FAST_PHASE = (CLOCK.total - CLOCK.finalWindow) / CLOCK.fastRate; // 120 s
export const SESSION_LENGTH = FAST_PHASE + CLOCK.finalWindow; // 180 simulated seconds

/** In-game seconds remaining at simulated time t. */
export function clockAt(t) {
  if (t <= FAST_PHASE) return CLOCK.total - t * CLOCK.fastRate;
  return Math.max(0, CLOCK.finalWindow - (t - FAST_PHASE));
}

/** Simulated time at which the countdown shows `remaining` in-game seconds. */
export function timeForClock(remaining) {
  if (remaining >= CLOCK.finalWindow) return (CLOCK.total - remaining) / CLOCK.fastRate;
  return FAST_PHASE + (CLOCK.finalWindow - remaining);
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** 0 = golden afternoon, 1 = night. The city stays bright until the last minutes. */
export function nightAt(t) {
  return Math.min(1, Math.pow(Math.max(0, t) / SESSION_LENGTH, 1.35));
}
