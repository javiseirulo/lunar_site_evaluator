import { describe, expect, it } from 'vitest';
import type { Timeseries } from '@lunar/contracts';
import {
  COOL_TAU_H,
  coolTempK,
  kelvinToCelsius,
  missionTemperatures,
  MIN_SIN,
  sunlitTempK,
  T_NIGHT_K,
  T_PEAK_K,
  temperatureSeries,
  valueAtHour,
} from './thermal';

describe('thermal model (simplified)', () => {
  it('uses the Diviner-based constants', () => {
    expect(T_PEAK_K).toBe(390);
    expect(T_NIGHT_K).toBe(95);
    expect(COOL_TAU_H).toBe(20);
  });

  it('sunlit: 390 K at the zenith, ^0.25 law, never below the 95 K night floor', () => {
    expect(sunlitTempK(90)).toBeCloseTo(390, 6);
    expect(sunlitTempK(30)).toBeCloseTo(390 * 0.5 ** 0.25, 6);
    expect(390 * MIN_SIN ** 0.25).toBeLessThan(T_NIGHT_K); // the raw law would undercut it
    expect(sunlitTempK(-5)).toBe(T_NIGHT_K);
    expect(sunlitTempK(0.05)).toBe(T_NIGHT_K);
    expect(sunlitTempK(1.5)).toBeGreaterThan(sunlitTempK(0.5));
  });

  it('never drops below 95 K and does not jump down at sunrise or sunset', () => {
    // Day at 20°, then a long night, then a grazing sunrise, then day again.
    const lit = [
      ...Array<boolean>(30).fill(true),
      ...Array<boolean>(40).fill(false),
      ...Array<boolean>(5).fill(true),
    ];
    const el = [...Array<number>(30).fill(20), ...Array<number>(40).fill(-3), 0.2, 0.4, 1, 3, 6];
    const t = temperatureSeries(lit, el);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(T_NIGHT_K);
    // Sunset (index 30): cools from the day value, no step down below the cooling curve.
    expect(t[30]).toBeCloseTo(coolTempK(t[29]!, 1), 6);
    // Sunrise (from index 70) with a grazing Sun: never colder than one more hour of night
    // cooling would give, then warming once the Sun is high enough.
    for (let i = 70; i < t.length; i++) {
      expect(t[i]!).toBeGreaterThanOrEqual(coolTempK(t[i - 1]!, 1) - 1e-9);
    }
    expect(t[t.length - 1]!).toBeGreaterThan(t[69]!);
  });

  it('dark: cools exponentially toward 95 K with tau 20 h', () => {
    expect(coolTempK(300, 0)).toBe(300);
    expect(coolTempK(300, 20)).toBeCloseTo(95 + 205 / Math.E, 6);
    expect(coolTempK(300, 1000)).toBeCloseTo(95, 6);
    expect(coolTempK(95, 5)).toBe(95);
  });

  it('series: sunlit hours use the equilibrium, dark hours cool from the last value', () => {
    const t = temperatureSeries([true, false, false], [30, 0, 0]);
    expect(t[0]).toBeCloseTo(sunlitTempK(30), 6);
    expect(t[1]).toBeCloseTo(coolTempK(t[0]!, 1), 6);
    expect(t[2]).toBeCloseTo(coolTempK(t[0]!, 2), 6);
    expect(temperatureSeries([false], [0])[0]).toBe(95);
  });

  it('missionTemperatures warms up on earlier samples and slices the mission window', () => {
    const n = 300;
    const ts = {
      t_utc: Array.from({ length: n }, (_, i) => `t${i}`),
      lit: Array.from({ length: n }, (_, i) => (i < 250 ? 1 : 0)),
      sun_el: Array.from({ length: n }, () => 10),
    } as unknown as Timeseries;
    const temps = missionTemperatures(ts, 250, 10);
    expect(temps).toHaveLength(10);
    // Dark from the landing hour, but cooling from the sunlit value, not starting at 95 K.
    expect(temps[0]).toBeCloseTo(coolTempK(sunlitTempK(10), 1), 6);
    expect(missionTemperatures(ts, 295, 10)).toHaveLength(5);
    expect(missionTemperatures(ts, 300, 10)).toEqual([]);
  });

  it('valueAtHour interpolates and clamps', () => {
    expect(valueAtHour([], 1)).toBeNull();
    expect(valueAtHour([10, 20], 0.5)).toBe(15);
    expect(valueAtHour([10, 20], 5)).toBe(20);
    expect(valueAtHour([10, 20], -1)).toBe(10);
  });

  it('kelvinToCelsius', () => {
    expect(kelvinToCelsius(273.15)).toBe(0);
  });
});
