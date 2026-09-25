// Draw-order bands for the world camera. Objects that stand on the ground sort by baseline y.

export const DEPTH = {
  ground: 0,
  water: 1,
  decal: 2,
  shadow: 3,
  objects: 10, // + baseline y (0..400)
  overlay: 4000,
  cloudShadow: 4100,
  smoke: 4200,
  weather: 4300,
  markers: 5000,
  fx: 5100
};

export const depthFor = (baselineY) => DEPTH.objects + baselineY;

/**
 * Anchor a sprite at its bottom-center on an integer pixel column so pixel art stays crisp
 * (origin 0.5 on odd widths would land on half pixels).
 */
export function anchorBottom(obj) {
  const w = obj.frame ? obj.frame.realWidth : obj.width;
  return obj.setOrigin(Math.floor(w / 2) / w, 1);
}
