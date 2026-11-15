import { describe, expect, it } from 'vitest';
import {
  buildSphere,
  buildSpinner,
  orthoInverse,
  shadeInto,
  sunLonForProgress,
  type TextureData,
} from './moonSphere';

const DEG = Math.PI / 180;

/** 16x8 mid-gray texture, so brightness differences come only from the lighting. */
const flat: TextureData = {
  width: 16,
  height: 8,
  data: new Uint8ClampedArray(16 * 8 * 4).map((_, i) => (i % 4 === 3 ? 255 : 100)),
};

describe('orthoInverse', () => {
  it('maps the disc centre to the view centre', () => {
    const [lat, lon] = orthoInverse(0, 0, -35 * DEG, 10 * DEG)!;
    expect(lat / DEG).toBeCloseTo(-35, 6);
    expect(lon / DEG).toBeCloseTo(10, 6);
  });

  it('puts the bottom limb 90 degrees from the view centre, folded over the pole', () => {
    // Viewed from 35 S, the point 90 degrees south of the centre is past the pole: latitude -55.
    const [lat] = orthoInverse(0, -0.99999, -35 * DEG, 0)!;
    expect(Math.abs(lat / DEG - -55)).toBeLessThan(0.5);
  });

  it('puts the east limb 90 degrees east on the equator', () => {
    // arcsin is steep at the limb, so 0.99999 is still about a quarter of a degree short of 90.
    const [lat, lon] = orthoInverse(0.99999, 0, 0, 0)!;
    expect(Math.abs(lat / DEG)).toBeLessThan(0.01);
    expect(Math.abs(lon / DEG - 90)).toBeLessThan(0.5);
  });

  it('returns null outside the disc', () => {
    expect(orthoInverse(1, 1, 0, 0)).toBeNull();
  });
});

describe('sphere shading', () => {
  const size = 64;
  const sphere = buildSphere(flat, size, -35, 0);
  const pixel = (out: Uint8ClampedArray, x: number, y: number) => out[(y * size + x) * 4]!;

  it('is transparent in the corners and opaque in the middle', () => {
    expect(sphere.alpha[0]).toBe(0);
    expect(sphere.alpha[(size / 2) * size + size / 2]).toBe(255);
  });

  it('is bright under the Sun and dark on the far side', () => {
    const noon = new Uint8ClampedArray(size * size * 4);
    const night = new Uint8ClampedArray(size * size * 4);
    shadeInto(sphere, 0, noon);
    shadeInto(sphere, 180, night);
    const c = size / 2;
    expect(pixel(noon, c, c)).toBeGreaterThan(100);
    expect(pixel(night, c, c)).toBeLessThan(15);
  });

  it('lights the right half when the Sun is to the east, the left half when it is to the west', () => {
    const east = new Uint8ClampedArray(size * size * 4);
    const west = new Uint8ClampedArray(size * size * 4);
    shadeInto(sphere, 90, east);
    shadeInto(sphere, -90, west);
    const y = size / 2;
    expect(pixel(east, size - 6, y)).toBeGreaterThan(pixel(east, 5, y));
    expect(pixel(west, 5, y)).toBeGreaterThan(pixel(west, size - 6, y));
  });

  it('leaves the south pole region dimmer than the centre at full phase', () => {
    const out = new Uint8ClampedArray(size * size * 4);
    shadeInto(sphere, 0, out);
    expect(pixel(out, size / 2, size - 8)).toBeLessThan(pixel(out, size / 2, size / 2));
  });
});

describe('sunLonForProgress', () => {
  it('goes from a left-lit quarter to a full Moon, monotonically', () => {
    expect(sunLonForProgress(0)).toBeCloseTo(-100, 6);
    expect(sunLonForProgress(1)).toBeCloseTo(0, 6);
    let prev = sunLonForProgress(0);
    for (let t = 0.05; t <= 1; t += 0.05) {
      const v = sunLonForProgress(t);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});

describe('spinner', () => {
  // Left half of the texture white, right half black: spinning half a turn swaps them.
  const striped: TextureData = {
    width: 16,
    height: 8,
    data: new Uint8ClampedArray(16 * 8 * 4).map((_, i) =>
      i % 4 === 3 ? 255 : (i >> 2) % 16 < 8 ? 255 : 0,
    ),
  };
  const size = 64;

  it('keeps the same silhouette while turning but changes the surface', () => {
    const sp = buildSpinner(striped, size, -35, 0);
    const a = new Uint8ClampedArray(size * size * 4);
    const b = new Uint8ClampedArray(size * size * 4);
    sp.draw(a, 0);
    sp.draw(b, Math.PI);
    const c = (size / 2) * size + size / 2;
    expect(a[c * 4 + 3]).toBe(255);
    expect(b[c * 4 + 3]).toBe(255);
    expect(a[3]).toBe(0); // corner stays empty
    let differs = 0;
    for (let i = 0; i < size * size; i++) if (Math.abs(a[i * 4]! - b[i * 4]!) > 40) differs++;
    expect(differs).toBeGreaterThan(300);
  });

  it('repeats exactly after one full turn', () => {
    const sp = buildSpinner(striped, size, -35, -50);
    const a = new Uint8ClampedArray(size * size * 4);
    const b = new Uint8ClampedArray(size * size * 4);
    sp.draw(a, 0.7);
    sp.draw(b, 0.7 + 2 * Math.PI);
    for (let i = 0; i < a.length; i += 4) expect(Math.abs(a[i]! - b[i]!)).toBeLessThanOrEqual(1);
  });

  it('is lit on the Sun side and dark on the other', () => {
    const flatSp = buildSpinner(flat, size, -35, -60);
    const out = new Uint8ClampedArray(size * size * 4);
    flatSp.draw(out, 0);
    const y = size / 2;
    expect(out[(y * size + 8) * 4]!).toBeGreaterThan(out[(y * size + size - 9) * 4]! + 40);
  });
});
