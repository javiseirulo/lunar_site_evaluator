/**
 * SIMPLIFIED surface-temperature model for the cockpit gauge (informative only: the failure rule
 * stays the engine's "dark run > 100 h"). Not a thermophysical model: no regolith conduction,
 * no topography, no latitude-specific calibration.
 *
 * - Sun up: radiative equilibrium, T = T_PEAK_K · max(sin(sun_el), MIN_SIN)^0.25, but never
 *   below T_NIGHT_K nor below the value the surface would have cooled to in that hour (a
 *   grazing Sun cannot make it colder than the night, and sunrise never jumps down).
 * - Sun down: exponential cooling from the last value toward T_NIGHT_K with time constant
 *   COOL_TAU_H.
 *
 * Constants: Diviner Lunar Radiometer equatorial maxima 387–397 K and pre-dawn minima ~95 K
 * (Williams, J.-P. et al. 2017, "The global surface temperatures of the Moon as measured by the
 * Diviner Lunar Radiometer Experiment", Icarus 283, 300–325).
 */
import type { Timeseries } from '@lunar/contracts';

/** Peak sunlit temperature with the Sun at the zenith (K), Diviner equatorial maxima. */
export const T_PEAK_K = 390;
/** Temperature the surface cools toward in the dark (K), Diviner pre-dawn minimum. */
export const T_NIGHT_K = 95;
/** e-folding time of the night cooling (hours). */
export const COOL_TAU_H = 20;
/** Floor for sin(sun_el) so a grazing or below-horizon Sun does not give 0 K. */
export const MIN_SIN = 0.001;
/** Hours of history used to warm up the model before the landing hour. */
export const THERMAL_LOOKBACK_H = 240;

const DEG = Math.PI / 180;

/** Radiative-equilibrium temperature (K) for a sunlit surface with the Sun at `sunElDeg`. */
export function sunlitTempK(sunElDeg: number): number {
  return Math.max(T_NIGHT_K, T_PEAK_K * Math.max(Math.sin(sunElDeg * DEG), MIN_SIN) ** 0.25);
}

/** Temperature (K) after `hours` of darkness starting from `fromK`. */
export function coolTempK(fromK: number, hours: number): number {
  return T_NIGHT_K + (fromK - T_NIGHT_K) * Math.exp(-Math.max(0, hours) / COOL_TAU_H);
}

/** Hour-by-hour temperature (K) for `lit` / `sunElDeg` samples, starting from `initialK`. */
export function temperatureSeries(
  lit: readonly boolean[],
  sunElDeg: readonly number[],
  initialK: number = T_NIGHT_K,
): number[] {
  let t = initialK;
  return lit.map(
    (l, i) => (t = l ? Math.max(sunlitTempK(sunElDeg[i] ?? 0), coolTempK(t, 1)) : coolTempK(t, 1)),
  );
}

/**
 * Model temperature (K) at each of `hours` mission hours from `startIndex`, warmed up over up
 * to THERMAL_LOOKBACK_H earlier samples so a mission that lands in the dark starts realistic.
 */
export function missionTemperatures(ts: Timeseries, startIndex: number, hours: number): number[] {
  const from = Math.max(0, startIndex - THERMAL_LOOKBACK_H);
  const to = Math.min(ts.t_utc.length, startIndex + hours);
  if (to <= startIndex) return [];
  const idx = Array.from({ length: to - from }, (_, k) => from + k);
  const series = temperatureSeries(
    idx.map((i) => ts.lit[i] === 1),
    idx.map((i) => ts.sun_el[i] ?? 0),
  );
  return series.slice(startIndex - from);
}

/** Value of an hourly series at fractional hour `h` (linear between samples, clamped). */
export function valueAtHour(series: readonly number[], h: number): number | null {
  if (series.length === 0) return null;
  const c = Math.min(series.length - 1, Math.max(0, h));
  const i = Math.floor(c);
  const a = series[i]!;
  const b = series[Math.min(series.length - 1, i + 1)]!;
  return a + (b - a) * (c - i);
}

export const kelvinToCelsius = (k: number): number => k - 273.15;
