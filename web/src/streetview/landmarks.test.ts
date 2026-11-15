import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { isLandmarkOccluded, layoutLabels, nearbyLandmarks, type Landmark } from './landmarks';

describe('lunar feature labels', () => {
  it('bounds and deconflicts the thin leader lines', () => {
    const points = [
      { id: 'a', name: 'Shackleton', x: 100, y: 180 },
      { id: 'b', name: 'Nearby overlapping crater', x: 110, y: 185 },
      { id: 'c', name: 'Off screen', x: -30, y: 10 },
    ];
    const labels = layoutLabels(points, 390, 350);
    expect(labels.map((p) => p.id)).toEqual(['a', 'b']);
    expect(Math.abs(labels[0]!.elbowY - labels[1]!.elbowY)).toBeGreaterThanOrEqual(40);
    expect(labels[0]!.elbowY).toBeLessThan(labels[0]!.y);
    expect(labels[0]!.endX).toBeGreaterThan(labels[0]!.elbowX);
  });
  it('keeps an area label near the view edge without requiring exact centring', () => {
    const labels = layoutLabels([{ id: 'edge', name: 'Rim', x: -10, y: 180 }], 390, 350);
    expect(labels).toHaveLength(1);
    expect(labels[0]!.x).toBeGreaterThanOrEqual(0);
    expect(layoutLabels([{ id: 'outside', name: 'Hidden', x: -100, y: 180 }], 390, 350)).toEqual(
      [],
    );
  });
  it('uses only nearby centres, including across the dateline', () => {
    const feature = (id: string, lon: number): Landmark => ({
      id,
      lon,
      lat: 0,
      name: id,
      kind: 'MO',
      diameter_km: 5,
      source: 'https://planetarynames.wr.usgs.gov',
    });
    expect(
      nearbyLandmarks([feature('near', -179.9), feature('far', 90)], { lat: 0, lon: 179.9 }).map(
        (f) => f.id,
      ),
    ).toEqual(['near']);
  });
  it('ships official names with valid coordinates and individual source links', () => {
    const data = JSON.parse(
      readFileSync(new URL('../../public/data/terrain/lunar-names.json', import.meta.url), 'utf8'),
    ) as { features: Landmark[] };
    expect(data.features.length).toBeGreaterThan(1000);
    expect(new Set(data.features.map((p) => p.id)).size).toBe(data.features.length);
    for (const feature of data.features) {
      expect(feature.name).toBe(feature.name.trim());
      expect(Math.abs(feature.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(feature.lon)).toBeLessThanOrEqual(180);
      expect(feature.source).toMatch(/^https:\/\/planetarynames\.wr\.usgs\.gov\/Feature\/\d+$/);
    }
    expect(data.features.find((f) => f.name === 'Shackleton')).toBeDefined();
  });
});

it('keeps Mons Pico named when its own near slope hides the catalogue centre', () => {
  // Browser regression: 24.419 km feature, 24.931 km centre, 13.097 km near slope.
  expect(isLandmarkOccluded(24_931, 13_097, 24.419)).toBe(false);
  expect(isLandmarkOccluded(24_931, 5_000, 24.419)).toBe(true);
  expect(isLandmarkOccluded(80_000, 50_000, 200)).toBe(true);
});
