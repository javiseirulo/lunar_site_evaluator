import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { layoutLabels, nearbyLandmarks, type Landmark } from './landmarks';

describe('lunar feature labels', () => {
  it('bounds and deconflicts the thin leader lines', () => {
    const points = [
      { id: 'a', name: 'Shackleton', x: 100, y: 180 },
      { id: 'b', name: 'Nearby overlapping crater', x: 110, y: 185 },
      { id: 'c', name: 'Off screen', x: -30, y: 10 },
    ];
    const labels = layoutLabels(points, 390, 350);
    expect(labels.map((p) => p.id)).toEqual(['a']);
    expect(labels[0]!.elbowY).toBeLessThan(labels[0]!.y);
    expect(labels[0]!.endX).toBeGreaterThan(labels[0]!.elbowX);
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
