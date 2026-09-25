// Asset manifest. Every file is imported explicitly so Vite hashes it into the build and a
// missing file fails the build instead of failing silently at runtime. All art is generated
// by the art forge (`npm run art`) — see tools/art/.
import groundPng from '../assets/city/ground.png?url';
import waterPng from '../assets/city/water.png?url';
import cityPng from '../assets/city/city.png?url';
import cityJson from '../assets/city/city.json';
import buildingsPng from '../assets/buildings/buildings.png?url';
import buildingsJson from '../assets/buildings/buildings.json';
import peoplePng from '../assets/characters/people.png?url';
import peopleJson from '../assets/characters/people.json';
import portraitsPng from '../assets/characters/portraits.png?url';
import portraitsJson from '../assets/characters/portraits.json';
import effectsPng from '../assets/effects/effects.png?url';
import effectsJson from '../assets/effects/effects.json';
import iconsPng from '../assets/icons/icons.png?url';
import iconsJson from '../assets/icons/icons.json';
import uiPng from '../assets/ui/ui.png?url';
import uiJson from '../assets/ui/ui.json';
import cloudsPng from '../assets/backgrounds/clouds.png?url';
import cloudsJson from '../assets/backgrounds/clouds.json';
import skyPng from '../assets/backgrounds/sky.png?url';
import mountainsPng from '../assets/backgrounds/mountains.png?url';
import skylineFarPng from '../assets/backgrounds/skyline-far.png?url';
import skylineMidPng from '../assets/backgrounds/skyline-mid.png?url';
import skylineNearPng from '../assets/backgrounds/skyline-near.png?url';
import vignettesPng from '../assets/backgrounds/vignettes.png?url';

export const ATLASES = [
  { key: 'city', png: cityPng, json: cityJson },
  { key: 'buildings', png: buildingsPng, json: buildingsJson },
  { key: 'people', png: peoplePng, json: peopleJson },
  { key: 'portraits', png: portraitsPng, json: portraitsJson },
  { key: 'effects', png: effectsPng, json: effectsJson },
  { key: 'icons', png: iconsPng, json: iconsJson },
  { key: 'ui', png: uiPng, json: uiJson },
  { key: 'clouds', png: cloudsPng, json: cloudsJson }
];

export const IMAGES = [
  { key: 'ground', url: groundPng },
  { key: 'sky', url: skyPng },
  { key: 'mountains', url: mountainsPng },
  { key: 'skyline-far', url: skylineFarPng },
  { key: 'skyline-mid', url: skylineMidPng },
  { key: 'skyline-near', url: skylineNearPng }
];

export const SPRITESHEETS = [
  { key: 'water', url: waterPng, frameWidth: 720, frameHeight: 400 },
  { key: 'vignettes', url: vignettesPng, frameWidth: 160, frameHeight: 90 }
];

/** Order of district vignettes in the spritesheet (matches tools/art/families/backdrops.mjs). */
export const VIGNETTE_INDEX = {
  water: 0, residential: 1, downtown: 2, medical: 3, energy: 4, command: 5, transport: 6, industrial: 7
};
