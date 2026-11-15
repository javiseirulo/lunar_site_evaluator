import { describe, expect, it } from 'vitest';
import { DESCENT_MS, IN_GAME_PHASES } from '../state/gameStore';
import { backgroundShot, chosenTarget, markersForHand } from './globeShots';

const sites = [
  { id: 'shackleton_rim_01', lat: -89.7, lon: 200 },
  { id: 'malapert_massif', lat: -86, lon: 0 },
  { id: 'de_gerlache_rim_01', lat: -88.5, lon: -87 },
];
const cards = [
  { slot: 1, siteId: 'malapert_massif' },
  { slot: 2, siteId: 'shackleton_rim_01' },
  { slot: 3, siteId: 'unknown_site' },
  { slot: 4, siteId: 'de_gerlache_rim_01' },
];

describe('markersForHand', () => {
  it('numbers the markers like the cards and never carries the site id', () => {
    const m = markersForHand(cards, sites);
    expect(m.map((x) => x.label)).toEqual(['1', '2', '4']);
    expect(m[0]).toMatchObject({ lat: -86, lon: 0 });
    for (const x of m) {
      for (const s of sites) expect(JSON.stringify(x)).not.toContain(s.id);
    }
  });

  it('is empty without sites', () => {
    expect(markersForHand(cards, null)).toEqual([]);
  });
});

describe('chosenTarget', () => {
  it('finds the chosen card site', () => {
    expect(chosenTarget(cards, 2, sites)).toEqual({ lat: -89.7, lon: 200 });
    expect(chosenTarget(cards, 3, sites)).toBeNull();
    expect(chosenTarget(cards, null, sites)).toBeNull();
  });
});

describe('backgroundShot', () => {
  it('spins behind the menu, intro, alert and briefing', () => {
    for (const p of ['menu', 'intro', 'alert', 'briefing'] as const) {
      expect(backgroundShot(p, cards, null, sites)).toEqual({ kind: 'spin' });
    }
  });

  it('keeps one pole shot from the approach to the choice (no restart in between)', () => {
    const a = JSON.stringify(backgroundShot('approach', cards, null, sites));
    expect(JSON.stringify(backgroundShot('dealing', cards, null, sites))).toBe(a);
    expect(JSON.stringify(backgroundShot('choosing', cards, null, sites))).toBe(a);
  });

  it('dives to the chosen site during the descent', () => {
    expect(backgroundShot('descent', cards, 1, sites)).toEqual({
      kind: 'dive',
      target: { lat: -86, lon: 0 },
      durationMs: DESCENT_MS,
    });
  });

  it('shows no background globe from recon onwards', () => {
    for (const p of ['recon', 'timelapse', 'verdict', 'timeout'] as const) {
      expect(backgroundShot(p, cards, 1, sites)).toBeNull();
    }
  });

  it('never puts a site name or id in any background shot', () => {
    for (const p of IN_GAME_PHASES) {
      const text = JSON.stringify(backgroundShot(p, cards, 2, sites));
      for (const s of sites) expect(text).not.toContain(s.id);
    }
  });
});
