import { UI } from '../config/palette.js';

export const FONTS = {
  display: '"Pixelify Sans", "Nunito", system-ui, sans-serif',
  body: '"Nunito", system-ui, sans-serif'
};

/** Fonts that must be ready before any Phaser Text is created. */
export const FONT_FACES = [
  '500 32px "Pixelify Sans"',
  '700 32px "Pixelify Sans"',
  '700 32px "Nunito"',
  '800 32px "Nunito"',
  '900 32px "Nunito"'
];

/**
 * Build a Phaser text style.
 * @param {object} o
 * @param {number} o.size font size in px (1920×1080 reference)
 * @param {'display'|'body'} [o.font]
 */
export function textStyle({
  size = 28,
  font = 'body',
  color = UI.ink,
  weight = font === 'display' ? '700' : '800',
  align = 'left',
  stroke = null,
  strokeThickness = 0,
  wrap = null,
  lineSpacing = 0,
  shadow = null
} = {}) {
  const style = {
    fontFamily: FONTS[font],
    fontSize: `${size}px`,
    fontStyle: weight,
    color,
    align
  };
  if (stroke) {
    style.stroke = stroke;
    style.strokeThickness = strokeThickness || Math.max(2, Math.round(size / 8));
  }
  if (wrap) style.wordWrap = { width: wrap, useAdvancedWrap: true };
  if (lineSpacing) style.lineSpacing = lineSpacing;
  if (shadow) {
    style.shadow = { offsetX: shadow.x ?? 0, offsetY: shadow.y ?? 4, color: shadow.color ?? UI.ink, blur: shadow.blur ?? 0, fill: true, stroke: !!stroke };
  }
  return style;
}
