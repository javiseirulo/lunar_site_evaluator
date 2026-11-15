import type { Site } from '@lunar/contracts';
import { DEFAULT_REQUIREMENTS } from './requirements';
import { isPending, type FailCause } from './simulate';

export type Difficulty = 'normal' | 'expert';

export interface Bar {
  key: string;
  label: string;
  /** 0-100, higher is better. */
  value: number;
  /** Exact value with units ("82%", "130 h", "4.2°"); shown on Expert cards. */
  text: string;
  /** One-sentence explanation of the bar (tooltip / accessible description). */
  hint: string;
  /** Pass/fail against a hard limit that the card value decides on its own, else null. */
  pass: boolean | null;
}

/**
 * Every bar label in display order; a site shows a subset of these (see `qualityBars`).
 * Normal shows the bars that predict the common failures (long dark, long blackout); Expert
 * adds exact numbers and two extra bars.
 */
export const BAR_LABELS: Record<Difficulty, readonly string[]> = {
  normal: ['Sunlight', 'Earth link', 'Longest dark', 'Longest blackout', 'Slope'],
  expert: [
    'Sunlight',
    'Earth link',
    'Longest dark',
    'Longest blackout',
    'Slope',
    'Sun + Earth together',
    'Icy craters',
  ],
};

/** Bar keys that decide each failure cause (the verdict highlights that bar). */
export const CAUSE_BAR: Record<FailCause, string> = {
  slope: 'slope_deg',
  cold: 'max_dark_hours',
  blackout: 'max_blackout_hours',
  low_sun: 'illum_pct',
  low_comm: 'earth_vis_pct',
  // Landing light has no bar (it is about one instant): the verdict highlights none.
  dark_landing: '',
  glare_landing: '',
};

const R = DEFAULT_REQUIREMENTS;
const HINTS: Record<string, string> = {
  illum_pct: `Share of the year in sunlight. Solar power needs the Sun at least ${R.illum_pct.threshold * 100}% of the week.`,
  earth_vis_pct: `Share of the year with Earth in view for radio. The mission needs Earth in view at least ${R.comm_pct.threshold * 100}% of the week.`,
  max_dark_hours: `Longest night in the year (fuller = shorter). More than ${R.max_dark_h.threshold} hours dark in your week freezes the lander.`,
  max_blackout_hours: `Longest stretch without an Earth link in the year (fuller = shorter). More than ${R.max_blackout_h.threshold} hours without a link loses the mission.`,
  slope_deg: `Tilt of the ground. Steeper than ${R.slope_max_deg}° tips the lander over.`,
  sun_earth_pct: 'Share of the year with the Sun and an Earth link at the same time.',
  psr_dist_km: 'Distance to the nearest permanently shadowed (icy) crater. Closer is better.',
};

/**
 * Short help text for a difficulty, e.g. "4 bars: Sunlight, Earth link, ...". With a `sample`
 * site the labels are the bars that site really shows (pending metrics omitted); without one,
 * every possible label.
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
  hint: HINTS[key] ?? '',
  pass: null,
});

const hoursBar = (key: string, label: string, h: number): Bar => ({
  key,
  label,
  value: clamp100(100 - (h / RUN_ZERO_H) * 100),
  text: `${Math.round(h)} h`,
  hint: HINTS[key] ?? '',
  pass: null,
});

/**
 * Quality bars for a card (values are yearly averages/extremes; the mission is one week).
 * Metrics listed in `site.pending_metrics` (placeholders) and optional metrics the site lacks
 * are omitted. Normal: Sunlight, Earth link, Longest dark, Longest blackout, Slope. Expert
 * adds Sun + Earth together and Icy craters (each only if available) and shows the numbers.
 */
export function qualityBars(site: Site, difficulty: Difficulty): Bar[] {
  const m = site.metrics;
  const bars: Bar[] = [
    pct('illum_pct', 'Sunlight', m.illum_pct),
    pct('earth_vis_pct', 'Earth link', m.earth_vis_pct),
  ];
  if (usable(site, 'max_dark_hours', m.max_dark_hours)) {
    bars.push(hoursBar('max_dark_hours', 'Longest dark', m.max_dark_hours));
  }
  if (usable(site, 'max_blackout_hours', m.max_blackout_hours)) {
    bars.push(hoursBar('max_blackout_hours', 'Longest blackout', m.max_blackout_hours));
  }
  if (usable(site, 'slope_deg', m.slope_deg)) {
    bars.push({
      key: 'slope_deg',
      label: 'Slope',
      value: clamp100(100 - (m.slope_deg / 20) * 100),
      text: `${m.slope_deg.toFixed(1)}°`,
      hint: HINTS.slope_deg!,
      // Slope is the one rule a card decides on its own (no week-to-week variation).
      pass: m.slope_deg <= R.slope_max_deg,
    });
  }
  if (difficulty === 'normal') return bars;

  if (usable(site, 'sun_earth_pct', m.sun_earth_pct)) {
    bars.push(pct('sun_earth_pct', 'Sun + Earth together', m.sun_earth_pct));
  }
  if (usable(site, 'psr_dist_km', m.psr_dist_km)) {
    bars.push({
      key: 'psr_dist_km',
      label: 'Icy craters',
      value: clamp100(100 - (m.psr_dist_km / 20) * 100),
      text: `${m.psr_dist_km.toFixed(1)} km`,
      hint: HINTS.psr_dist_km!,
      pass: null,
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
