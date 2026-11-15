import { describe, expect, it } from 'vitest';
import { embedInitialView, embedSceneOptions, embedToken, hasWebGL } from './embed';
import { DEFAULT_VIEW } from './viewLink';

describe('StreetViewEmbed helpers', () => {
  it('reads only a non-blank configured token', () => {
    expect(embedToken(undefined)).toBeNull();
    expect(embedToken(null)).toBeNull();
    expect(embedToken('   ')).toBeNull();
    expect(embedToken(' abc ')).toBe('abc');
  });

  it('hides names on request and walks only in walk mode', () => {
    expect(embedSceneOptions(true, 'look-only')).toEqual({
      names: false,
      walk: false,
      detail: 'full',
    });
    expect(embedSceneOptions(false, 'walk')).toEqual({ names: true, walk: true, detail: 'full' });
    expect(embedSceneOptions(true, 'walk')).toEqual({ names: false, walk: true, detail: 'full' });
  });

  it('starts at the default eye height facing a wrapped, clamped heading', () => {
    expect(embedInitialView()).toEqual(DEFAULT_VIEW);
    const v = embedInitialView(-90, 120);
    expect(v.heading).toBe(270);
    expect(v.pitch).toBe(85);
    expect(v.height).toBe(DEFAULT_VIEW.height);
    expect(v.fov).toBe(DEFAULT_VIEW.fov);
    expect(embedInitialView(Number.NaN).heading).toBe(0);
  });

  it('reports no WebGL outside a browser', () => {
    expect(hasWebGL()).toBe(false);
  });
});
