/**
 * One place that says how each site metric is named, explained and shown — in plain language for
 * students (default) and with technical names in Pro mode. Shared by the site card, Sites, Compare.
 */
import { Moon, Mountain, SatelliteDish, Snowflake, Sun, type LucideIcon } from 'lucide-react';
import type { Site, SiteMetrics } from '@lunar/contracts';
import { pct } from './format';

export interface MetricDef {
  key: keyof SiteMetrics;
  /** Short plain-language name shown by default. */
  label: string;
  /** Technical name shown in Pro mode. */
  proLabel: string;
  help: string;
  Icon: LucideIcon;
  /** Tailwind text colour class. */
  tone: string;
  /** Bar fill colour (CSS). */
  bar: string;
  format: (m: SiteMetrics, pro: boolean) => string;
  /** 0–1, higher = better for the lander; null if "better" isn't one-directional. */
  goodness: (m: SiteMetrics) => number | null;
  better: 'high' | 'low' | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function friendlyHours(h: number): string {
  if (h < 1) return 'under an hour';
  if (h < 36) return `${Math.round(h)} hours`;
  const d = Math.round(h / 24);
  return d === 1 ? 'about a day' : `${d} days`;
}

export const METRICS: MetricDef[] = [
  {
    key: 'illum_pct',
    label: 'Sunlight',
    proLabel: 'Sunlight (illumination)',
    help: 'Share of the time the Sun is above the hills around the site. More sun means more solar power.',
    Icon: Sun,
    tone: 'text-sun',
    bar: 'var(--color-sun)',
    format: (m) => pct(m.illum_pct),
    goodness: (m) => m.illum_pct,
    better: 'high',
  },
  {
    key: 'earth_vis_pct',
    label: 'Earth view',
    proLabel: 'Earth in view',
    help: 'Share of the time Earth is above the horizon, so the lander can radio home directly.',
    Icon: SatelliteDish,
    tone: 'text-earth',
    bar: 'var(--color-earth)',
    format: (m) => pct(m.earth_vis_pct),
    goodness: (m) => m.earth_vis_pct,
    better: 'high',
  },
  {
    key: 'max_dark_hours',
    label: 'Longest dark',
    proLabel: 'Longest night',
    help: 'The longest stretch without sunlight. Batteries have to keep the lander alive this long.',
    Icon: Moon,
    tone: 'text-violet-light',
    bar: 'var(--color-violet-light)',
    format: (m, pro) => (pro ? `${m.max_dark_hours} h` : friendlyHours(m.max_dark_hours)),
    goodness: (m) => clamp01(1 - m.max_dark_hours / 500),
    better: 'low',
  },
  {
    key: 'slope_deg',
    label: 'Slope',
    proLabel: 'Slope',
    help: 'How tilted the ground is. Landers need gentle ground; here anything over 15° fails.',
    Icon: Mountain,
    tone: 'text-glow',
    bar: 'var(--color-pink)',
    format: (m) => `${m.slope_deg.toFixed(1)}°`,
    goodness: (m) => clamp01(1 - m.slope_deg / 30),
    better: 'low',
  },
  {
    key: 'psr_dist_km',
    label: 'To icy craters',
    proLabel: 'To permanently shadowed region',
    help: 'How far to the nearest crater floor that never sees sunlight, where water ice may be hiding.',
    Icon: Snowflake,
    tone: 'text-psr',
    bar: 'var(--color-psr)',
    format: (m) => `${m.psr_dist_km} km`,
    goodness: () => null,
    better: null,
  },
];

export interface Verdict {
  label: string;
  /** Short reason for students. */
  why: string;
  tone: 'good' | 'ok' | 'bad';
}

/** A one-word judgement students can read at a glance, alongside the numeric score. */
export function verdictFor(site: Site): Verdict {
  if (!site.valid) {
    const steep = site.metrics.slope_deg > 15;
    return {
      label: 'Tough spot',
      why: steep
        ? 'The ground is too steep to land safely.'
        : 'Not enough sunlight to keep the lander powered.',
      tone: 'bad',
    };
  }
  if (site.score >= 0.6)
    return { label: 'Great spot', why: 'Plenty of sun and a good view of Earth.', tone: 'good' };
  if (site.score >= 0.45)
    return { label: 'Good spot', why: 'Works, with a few trade-offs.', tone: 'ok' };
  return {
    label: 'OK spot',
    why: 'Passes the safety rules, but sunlight or Earth view is limited.',
    tone: 'ok',
  };
}

/** Day number (1-based) and total days of the data window, for "Day 3 of 30". */
export function dayOfWindow(
  nowIso: string,
  startIso: string,
  endIso: string,
): { day: number; total: number } {
  const DAY = 86_400_000;
  const start = Date.parse(startIso);
  const total = Math.max(1, Math.round((Date.parse(endIso) - start) / DAY));
  const day = Math.min(total, Math.max(1, Math.floor((Date.parse(nowIso) - start) / DAY) + 1));
  return { day, total };
}
