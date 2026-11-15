import type { Site } from '@lunar/contracts';
import { isPending } from './simulate';

export type Difficulty = 'normal' | 'expert';

export interface Bar {
  key: string;
  label: string;
  /** 0-100, higher is better. */
  value: number;
  text: string;
}

/** Every bar label in display order; a site shows a subset of these (see `qualityBars`). */
export const BAR_LABELS: Record<Difficulty, readonly string[]> = {
  normal: ['Sunlight', 'Earth view', 'Sun + Earth', 'Slope'],
  expert: [
    'Sunlight',
    'Earth view',
    'Sun + Earth',
    'Slope',
    'Longest dark',
    'Longest blackout',
    'Icy craters',
  ],
};

/**
 * Short help text for a difficulty, e.g. "3 bars: Sunlight, Earth view, Sun + Earth". With a
 * `sample` site the labels are the bars that site really shows (pending metrics omitted);
 * without one, every possible label.
 */
export function difficultyHint(difficulty: Difficulty, sample?: Site): string {
  const labels = sample
    ? qualityBars(sample, difficulty).map((b) => b.label)
    : BAR_LABELS[difficulty];
  return `${labels.length} bars: ${labels.join(', ')}`;
}

const clamp100 = (v: number): number => Math.min(100, Math.max(0, v));

/**
 * Hours at which a "longest dark/blackout" bar reaches 0: 0 h → 100, ≥ RUN_ZERO_H → 0. Site
 * metrics are measured over a whole YEAR of hourly data, and south-pole sites have yearly dark
 * runs of hundreds to thousands of hours, so a 30-day scale left almost every card at 0.
 * 2000 h (~83 days) spreads the real sites across the bar.
 */
export const RUN_ZERO_H = 2000;

const usable = (site: Site, key: string, value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && !isPending(site, key);

const pct = (key: string, label: string, v: number): Bar => ({
  key,
  label,
  value: clamp100(v * 100),
  text: `${Math.round(v * 100)}%`,
});

const hoursBar = (key: string, label: string, h: number): Bar => ({
  key,
  label,
  value: clamp100(100 - (h / RUN_ZERO_H) * 100),
  text: `${Math.round(h)} h`,
});

/**
 * Quality bars for a card. Metrics listed in `site.pending_metrics` (placeholders) and optional
 * metrics the site lacks are omitted. Normal: Sunlight, Earth view, Sun + Earth, Slope. Expert
 * adds Longest dark, Longest blackout and Icy craters (each only if available).
 */
export function qualityBars(site: Site, difficulty: Difficulty): Bar[] {
  const m = site.metrics;
  const bars: Bar[] = [
    pct('illum_pct', 'Sunlight', m.illum_pct),
    pct('earth_vis_pct', 'Earth view', m.earth_vis_pct),
  ];
  if (usable(site, 'sun_earth_pct', m.sun_earth_pct)) {
    bars.push(pct('sun_earth_pct', 'Sun + Earth', m.sun_earth_pct));
  }
  if (usable(site, 'slope_deg', m.slope_deg)) {
    bars.push({
      key: 'slope_deg',
      label: 'Slope',
      value: clamp100(100 - (m.slope_deg / 20) * 100),
      text: `${m.slope_deg.toFixed(1)}°`,
    });
  }
  if (difficulty === 'normal') return bars;

  if (usable(site, 'max_dark_hours', m.max_dark_hours)) {
    bars.push(hoursBar('max_dark_hours', 'Longest dark', m.max_dark_hours));
  }
  if (usable(site, 'max_blackout_hours', m.max_blackout_hours)) {
    bars.push(hoursBar('max_blackout_hours', 'Longest blackout', m.max_blackout_hours));
  }
  if (usable(site, 'psr_dist_km', m.psr_dist_km)) {
    bars.push({
      key: 'psr_dist_km',
      label: 'Icy craters',
      value: clamp100(100 - (m.psr_dist_km / 20) * 100),
      text: `${m.psr_dist_km.toFixed(1)} km`,
    });
  }
  return bars;
}

const RED: [number, number, number] = [0x5a, 0x0f, 0x0f];
const GREEN: [number, number, number] = [0xa8, 0xf0, 0xa0];

/** Interpolates #5a0f0f (0) to #a8f0a0 (100). */
export function barColor(value: number): string {
  const t = clamp100(value) / 100;
  return (
    '#' +
    RED.map((c, i) =>
      Math.round(c + (GREEN[i]! - c) * t)
        .toString(16)
        .padStart(2, '0'),
    ).join('')
  );
}
