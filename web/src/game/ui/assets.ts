/**
 * Every image path the Mission game uses, in one place. Files live in `web/public/game/`
 * and may not exist yet: render them through `GameImage`, which falls back to a placeholder.
 */
import type { FailCause } from '../engine/simulate';

/** Public URL of a file under `web/public/game/`. */
export const gameAsset = (path: string): string => `${import.meta.env.BASE_URL}game/${path}`;

export const CARD_BACK = gameAsset('card-back.png');
export const MENU_BG = gameAsset('menu-bg.png');
export const MODE_SOUTH_POLE = gameAsset('mode-south-pole.png');
export const MODE_HISTORICAL = gameAsset('mode-historical.png');
export const LANDER_ICON = gameAsset('lander/lander-icon.png');
export const LANDER_SIDE = gameAsset('lander/lander-side.png');
export const ORBIT_BG = gameAsset('orbit-bg.png');

export type Terrain = 'rim' | 'cliff' | 'ridge' | 'peak' | 'massif' | 'mons' | 'plateau' | 'crater';

const TERRAIN_BY_SITE: Record<string, Terrain> = {
  shackleton_rim_01: 'rim',
  haworth_rim: 'rim',
  faustini_rim: 'rim',
  shoemaker_rim: 'rim',
  amundsen_rim: 'rim',
  sverdrup_rim: 'rim',
  shackleton_rim_02: 'cliff',
  de_gerlache_rim_01: 'cliff',
  de_gerlache_rim_02: 'cliff',
  nobile_rim_01: 'cliff',
  nobile_rim_02: 'cliff',
  connecting_ridge: 'ridge',
  peak_near_shackleton: 'peak',
  malapert_massif: 'massif',
  de_gerlache_kocher: 'massif',
  mons_mouton: 'mons',
  leibnitz_beta: 'plateau',
  plain_81s: 'plateau',
  slater_plain: 'plateau',
  cabeus_b: 'crater',
};

/** Terrain explicitly mapped for a site id, or undefined if the id is not in the map. */
export function knownTerrain(siteId: string): Terrain | undefined {
  return Object.hasOwn(TERRAIN_BY_SITE, siteId) ? TERRAIN_BY_SITE[siteId] : undefined;
}

export const TERRAINS: readonly Terrain[] = [
  'rim',
  'cliff',
  'ridge',
  'peak',
  'massif',
  'mons',
  'plateau',
  'crater',
];

/** Keywords in a site id that pick a terrain, checked in this order. */
const TERRAIN_KEYWORDS: [Terrain, readonly string[]][] = [
  ['mons', ['mons', 'mouton']],
  ['massif', ['massif', 'malapert']],
  ['peak', ['peak']],
  ['ridge', ['ridge']],
  ['crater', ['crater', 'cabeus']],
  ['rim', ['rim']],
  ['plateau', ['plateau', 'plain']],
];

/** FNV-1a 32-bit hash: stable across sessions and platforms. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * Terrain illustration family for a site: the explicit map, else a keyword in the id, else a
 * stable hash over the 8 terrains (so unknown sites do not all share one picture).
 */
export function siteTerrain(siteId: string): Terrain {
  const known = knownTerrain(siteId);
  if (known) return known;
  const id = siteId.toLowerCase();
  for (const [terrain, words] of TERRAIN_KEYWORDS) {
    if (words.some((w) => id.includes(w))) return terrain;
  }
  return TERRAINS[hash(id) % TERRAINS.length]!;
}

export function siteImage(siteId: string, variant: 1 | 2): string {
  return gameAsset(`sites/site-${siteTerrain(siteId)}-${variant}.png`);
}

/**
 * Illustration per card slot for one hand. Cards that share a terrain alternate between
 * variants 1 and 2 (in slot order), and the seed picks which variant comes first.
 */
export function handSiteImages(
  cards: readonly { slot: number; siteId: string }[],
  seed: number,
): Record<number, string> {
  const offset = Math.abs(Math.trunc(seed)) % 2;
  const seen: Partial<Record<Terrain, number>> = {};
  const out: Record<number, string> = {};
  for (const card of [...cards].sort((a, b) => a.slot - b.slot)) {
    const terrain = siteTerrain(card.siteId);
    const count = seen[terrain] ?? 0;
    seen[terrain] = count + 1;
    out[card.slot] = siteImage(card.siteId, (count + offset) % 2 === 0 ? 1 : 2);
  }
  return out;
}

const EMERGENCY_FILE: Record<string, string> = {
  propulsion: 'emergency-propulsion.png',
  solar_storm: 'emergency-solar-storm.png',
  guidance: 'emergency-guidance.png',
  fuel_leak: 'emergency-fuel-leak.png',
  comms_glitch: 'emergency-comms.png',
};

/** Emergency scene, or null (→ placeholder) for an unknown id. */
export function emergencyImage(id: string | null): string | null {
  const file = id ? EMERGENCY_FILE[id] : undefined;
  return file ? gameAsset(`emergencies/${file}`) : null;
}

export type VerdictScene = FailCause | 'win' | 'timeout';

export function verdictImage(scene: VerdictScene): string {
  // A landing in the dark or in glare ends like a slope crash: the lander hits what it could not see.
  const art = scene === 'dark_landing' || scene === 'glare_landing' ? 'slope' : scene;
  const file = art === 'win' || art === 'timeout' ? art : `lose-${art.replaceAll('_', '-')}`;
  return gameAsset(`verdicts/${file}.png`);
}

export type Mood = 'neutral' | 'talk' | 'alarm' | 'happy' | 'sad';

export function scientistImage(mood: Mood): string {
  return gameAsset(`characters/dr-regolith-${mood}.png`);
}
