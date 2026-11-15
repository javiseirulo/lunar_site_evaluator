import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SitesFile } from '@lunar/contracts';
import emergencies from '../content/emergencies.json';
import {
  emergencyImage,
  gameAsset,
  handSiteImages,
  knownTerrain,
  scientistImage,
  siteImage,
  siteTerrain,
  TERRAINS,
  verdictImage,
} from './assets';
import { CAUSE_HEADLINE, emergencyById, lessonFor } from './content';
import { countUp, dealTimeline, formatClock, slotForKey } from './format';

describe('formatClock', () => {
  it('formats mm:ss and rounds up partial seconds', () => {
    expect(formatClock(180_000)).toBe('03:00');
    expect(formatClock(179_001)).toBe('03:00');
    expect(formatClock(179_000)).toBe('02:59');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(1)).toBe('00:01');
  });

  it('clamps negative and non-finite values to 00:00', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-5000)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });
});

describe('dealTimeline', () => {
  it('slides every card in before the first flip and ends after the last flip', () => {
    const t = dealTimeline(4, false);
    expect(t.slideDelay(0)).toBe(0);
    expect(t.slideDelay(3) + t.slideDuration).toBeLessThan(t.flipDelay(0));
    expect(t.flipDelay(1)).toBeGreaterThan(t.flipDelay(0));
    expect(t.totalMs).toBe(Math.round((t.flipDelay(3) + t.flipDuration) * 1000));
  });

  it('is instant with reduced motion', () => {
    const t = dealTimeline(4, true);
    expect(t.totalMs).toBe(0);
    expect(t.flipDelay(3)).toBe(0);
  });
});

describe('assets', () => {
  it('builds paths under the public game folder', () => {
    expect(gameAsset('card-back.png')).toBe(`${import.meta.env.BASE_URL}game/card-back.png`);
    expect(scientistImage('alarm')).toMatch(/game\/characters\/dr-regolith-alarm\.png$/);
  });

  it('keeps the explicit terrain map and resolves every south-pole site to a terrain', () => {
    const data = join(__dirname, '..', '..', '..', 'public', 'data', 'sites.json');
    const sites = (JSON.parse(readFileSync(data, 'utf8')) as SitesFile).sites;
    expect(siteTerrain('shackleton_rim_01')).toBe('rim');
    expect(siteTerrain('nobile_rim_02')).toBe('cliff');
    expect(siteTerrain('cabeus_b')).toBe('crater');
    expect(siteTerrain('mons_mouton')).toBe('mons');
    expect(siteTerrain('leibnitz_beta')).toBe('plateau');
    expect(knownTerrain('nowhere')).toBeUndefined();
    expect(knownTerrain('toString')).toBeUndefined();
    const southPole = sites.filter((s) => s.region === 'south_pole');
    expect(southPole.length).toBeGreaterThan(0);
    for (const s of southPole) {
      const terrain = siteTerrain(s.id);
      expect(TERRAINS, `${s.id} -> ${terrain}`).toContain(terrain);
      expect(siteImage(s.id, 1)).toBe(gameAsset(`sites/site-${terrain}-1.png`));
      const known = knownTerrain(s.id);
      if (known) expect(terrain).toBe(known);
    }
  });

  it('falls back to id keywords, then to a stable hash spread over the terrains', () => {
    expect(siteTerrain('connecting_ridge_cr05')).toBe('ridge');
    expect(siteTerrain('peak_near_shackleton_pns02')).toBe('peak');
    expect(siteTerrain('cabeus_b_south')).toBe('crater');
    expect(siteTerrain('malapert_mp2')).toBe('massif');
    expect(siteTerrain('new_mons_site')).toBe('mons');
    expect(siteTerrain('some_rim')).toBe('rim');
    expect(siteTerrain('ibn_bajja_plains')).toBe('plateau');
    const unknown = Array.from({ length: 40 }, (_, i) => `site_${i}`);
    for (const id of unknown) {
      expect(TERRAINS).toContain(siteTerrain(id));
      expect(siteTerrain(id)).toBe(siteTerrain(id));
    }
    expect(new Set(unknown.map(siteTerrain)).size).toBeGreaterThanOrEqual(4);
  });

  it('gives cards of the same terrain different variants within a hand', () => {
    const cards = [
      { slot: 3, siteId: 'haworth_rim' },
      { slot: 1, siteId: 'faustini_rim' },
      { slot: 2, siteId: 'cabeus_b' },
      { slot: 4, siteId: 'sverdrup_rim' },
    ];
    const even = handSiteImages(cards, 10);
    expect(even[1]).toMatch(/site-rim-1\.png$/);
    expect(even[3]).toMatch(/site-rim-2\.png$/);
    expect(even[4]).toMatch(/site-rim-1\.png$/);
    expect(even[2]).toMatch(/site-crater-1\.png$/);
    const odd = handSiteImages(cards, 11);
    expect(odd[1]).toMatch(/site-rim-2\.png$/);
    expect(odd[3]).toMatch(/site-rim-1\.png$/);
  });

  it('maps every emergency id to its scene and unknown ids to null', () => {
    for (const e of emergencies) expect(emergencyImage(e.id)).toMatch(/emergencies\/emergency-/);
    expect(emergencyImage('comms_glitch')).toMatch(/emergency-comms\.png$/);
    expect(emergencyImage('solar_storm')).toMatch(/emergency-solar-storm\.png$/);
    expect(emergencyImage('unknown')).toBeNull();
    expect(emergencyImage(null)).toBeNull();
  });

  it('maps verdict scenes to files', () => {
    expect(verdictImage('win')).toMatch(/verdicts\/win\.png$/);
    expect(verdictImage('timeout')).toMatch(/verdicts\/timeout\.png$/);
    expect(verdictImage('slope')).toMatch(/verdicts\/lose-slope\.png$/);
    expect(verdictImage('low_sun')).toMatch(/verdicts\/lose-low-sun\.png$/);
    expect(verdictImage('low_comm')).toMatch(/verdicts\/lose-low-comm\.png$/);
  });
});

describe('content', () => {
  it('finds emergencies by id', () => {
    expect(emergencyById('fuel_leak')?.title).toBe('Fuel Leak');
    expect(emergencyById(null)).toBeNull();
  });

  it('has a lesson and headline for every failure cause', () => {
    for (const cause of Object.keys(CAUSE_HEADLINE) as (keyof typeof CAUSE_HEADLINE)[]) {
      expect(lessonFor(cause).length).toBeGreaterThan(10);
    }
    expect(lessonFor(null)).toMatch(/Well done/);
  });
});

describe('countUp', () => {
  it('eases from 0 to the target and lands exactly on it', () => {
    expect(countUp(0, 1000, 168)).toBe(0);
    expect(countUp(500, 1000, 168)).toBeGreaterThan(84);
    expect(countUp(1000, 1000, 168)).toBe(168);
    expect(countUp(5000, 1000, 168)).toBe(168);
    expect(countUp(10, 0, 42)).toBe(42);
  });
});

describe('slotForKey', () => {
  it('maps number keys to the dealt slots only', () => {
    expect(slotForKey('2', [1, 2, 3, 4])).toBe(2);
    expect(slotForKey('5', [1, 2, 3, 4])).toBeNull();
    expect(slotForKey('a', [1, 2, 3, 4])).toBeNull();
    expect(slotForKey('12', [1, 2, 3, 4])).toBeNull();
  });
});
