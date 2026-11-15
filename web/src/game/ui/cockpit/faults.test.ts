import { describe, expect, it } from 'vitest';
import { faultsFor } from './faults';

describe('faultsFor', () => {
  it('maps each cause to the instruments that fail', () => {
    expect(faultsFor(null)).toEqual({
      power: false,
      temp: false,
      link: false,
      tilt: false,
      minimum: null,
    });
    expect(faultsFor('win').power || faultsFor('win').link).toBe(false);
    expect(faultsFor('cold')).toMatchObject({ power: true, temp: true, link: false });
    expect(faultsFor('blackout')).toMatchObject({ link: true, power: false, minimum: null });
    expect(faultsFor('slope')).toMatchObject({ tilt: true, power: false, link: false });
    expect(faultsFor('low_sun')).toMatchObject({ power: true, minimum: 'power' });
    expect(faultsFor('low_comm')).toMatchObject({ link: true, minimum: 'link' });
  });
});
