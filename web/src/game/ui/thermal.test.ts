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

  it('sunlit: 390 K at the zenith, ^0.25 law, floored for a grazing Sun', () => {
    expect(sunlitTempK(90)).toBeCloseTo(390, 6);
    expect(sunlitTempK(30)).toBeCloseTo(390 * 0.5 ** 0.25, 6);
    expect(sunlitTempK(-5)).toBeCloseTo(390 * MIN_SIN ** 0.25, 6);
    expect(sunlitTempK(1.5)).toBeGreaterThan(sunlitTempK(0.5));
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
