// Response curves for utility scoring (see the ai-behavior-trees-utility-ai skill).
// Every consideration returns 0..1 so weights stay meaningful.
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inverseLerp01 = (x, a, b) => (a === b ? (x >= b ? 1 : 0) : clamp01((x - a) / (b - a)));
export const sigmoid = (t, k = 8, mid = 0.5) => clamp01(1 / (1 + Math.exp(-k * (clamp01(t) - mid))));
export const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
export const quadratic = (t) => clamp01(t) * clamp01(t);

/** Multiply considerations with Dave Mark's compensation so more factors don't over-punish. */
export function compensatedProduct(values) {
  if (!values.length) return 1;
  let product = 1;
  for (const v of values) product *= clamp01(v);
  const mod = 1 - 1 / values.length;
  return clamp01(product + (1 - product) * mod * product);
}
