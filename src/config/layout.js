// Screen and world geometry. Everything is authored for the 1920×1080 reference resolution.

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** Screen pixels per art pixel (world camera zoom and UI sprite scale). */
export const PX = 3;

export const TILE = 16;
export const WORLD_COLS = 45;
export const WORLD_ROWS = 25;
export const WORLD_WIDTH = WORLD_COLS * TILE; // 720
export const WORLD_HEIGHT = WORLD_ROWS * TILE; // 400

/** HUD regions in screen pixels (anchored to the 1920×1080 frame). */
export const HUD = {
  topBarHeight: 104,
  leftPanelWidth: 392,
  eventCardWidth: 520,
  margin: 16,
  bottomTickerHeight: 64
};

/** Default world camera: shows the city core in the space not covered by the HUD. */
export const CITY_VIEW = { zoom: PX, focusZoom: 4, scrollX: 33, scrollY: 14 };
