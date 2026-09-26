// NEXUS art forge: renders every original pixel-art family into assets/ (PNG + JSON atlases)
// and writes QA contact sheets into tools/art/out/. Run with `npm run art`.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { packAtlas, contactSheet } from './lib/atlas.mjs';
import { PixelCanvas } from './lib/canvas.mjs';

const only = process.argv.slice(2);
const want = (name) => only.length === 0 || only.includes(name);

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
}

const manifest = [];
const provenance = {
  kind: 'authored-in-code',
  tool: 'tools/art/forge.mjs (NEXUS art forge)',
  creator: 'NEXUS: CITY ZERO project',
  license: 'Original work of this project',
  notes: 'Procedural + hand-specified pixel art; palette src/config/palette.js; no third-party or AI-generated images.'
};
function record(id, path, extra = {}) {
  manifest.push({ id, path, status: 'approved', source: provenance, ...extra });
}

function atlas(name, dir, items, { maxWidth = 1024, sheetScale = 3, columns = 8 } = {}) {
  const { texture, json } = packAtlas(items, { maxWidth, image: `${name}.png` });
  record(name, `${dir}/${name}.png`, { atlas: `${dir}/${name}.json`, frames: items.length, technical: { size: `${texture.w}x${texture.h}`, alpha: true, filtering: 'smooth-pixel-art (nearest texels)' } });
  write(`${dir}/${name}.png`, texture.toPNG());
  write(`${dir}/${name}.json`, JSON.stringify(json));
  write(`tools/art/out/${name}-sheet.png`, contactSheet(items, { scale: sheetScale, columns }).toPNG());
  console.log(`${name.padEnd(12)} ${String(items.length).padStart(3)} frames  ${texture.w}×${texture.h}`);
}

/** Stack equally sized frames vertically into a spritesheet. */
function stack(frames) {
  const w = frames[0].w;
  const h = frames[0].h;
  const sheet = new PixelCanvas(w, h * frames.length);
  frames.forEach((f, i) => sheet.blit(f, 0, i * h));
  return sheet;
}

if (want('ground')) {
  const { renderGround, renderWaterFrames } = await import('./families/ground.mjs');
  const ground = renderGround();
  write('assets/city/ground.png', ground.toPNG());
  write('assets/city/water.png', stack(renderWaterFrames(4)).toPNG());
  record('ground', 'assets/city/ground.png', { technical: { size: '720x400' } });
  record('water', 'assets/city/water.png', { frames: 4, technical: { frameSize: '720x400' } });
  write('tools/art/out/ground-sheet.png', ground.scaled(2).toPNG());
  console.log('ground       720×400 + 4 water frames');
}
if (want('buildings')) atlas('buildings', 'assets/buildings', (await import('./families/buildings.mjs')).buildBuildings(), { maxWidth: 1024, sheetScale: 2, columns: 8 });
if (want('city')) atlas('city', 'assets/city', (await import('./families/props.mjs')).buildCityProps(), { maxWidth: 1024, sheetScale: 3, columns: 12 });
if (want('people')) atlas('people', 'assets/characters', (await import('./families/people.mjs')).buildPeople(), { maxWidth: 512, sheetScale: 4, columns: 16 });
if (want('effects')) atlas('effects', 'assets/effects', (await import('./families/effects.mjs')).buildEffects(), { maxWidth: 1024, sheetScale: 3, columns: 12 });
if (want('icons')) atlas('icons', 'assets/icons', (await import('./families/icons.mjs')).buildIcons(), { maxWidth: 1024, sheetScale: 4, columns: 12 });
if (want('portraits')) atlas('portraits', 'assets/characters', (await import('./families/portraits.mjs')).buildPortraits(), { maxWidth: 1024, sheetScale: 3, columns: 8 });
if (want('ui')) atlas('ui', 'assets/ui', (await import('./families/ui.mjs')).buildUI(), { maxWidth: 1024, sheetScale: 3, columns: 8 });
if (want('backdrops')) {
  for (const { name, canvas } of (await import('./families/backdrops.mjs')).buildBackdrops()) {
    write(`assets/backgrounds/${name}.png`, canvas.toPNG());
    record(name, `assets/backgrounds/${name}.png`, { technical: { size: `${canvas.w}x${canvas.h}` } });
    write(`tools/art/out/backdrop-${name}.png`, canvas.scaled(2).toPNG());
  }
  atlas('clouds', 'assets/backgrounds', (await import('./families/backdrops.mjs')).buildClouds(), { maxWidth: 256, sheetScale: 2, columns: 4 });
  console.log('backdrops    written');
}

if (want('favicon')) {
  const { buildFavicon } = await import('./families/ui.mjs');
  write('public/favicon.png', buildFavicon().toPNG());
  console.log('favicon      public/favicon.png');
}
if (only.length === 0) {
  write('assets/asset-manifest.json', JSON.stringify({
    schema_version: 1,
    art_direction_brief: 'docs/ART-DIRECTION.md',
    generated_by: 'npm run art',
    assets: manifest
  }, null, 2));
  console.log(`manifest     ${manifest.length} entries`);
}
