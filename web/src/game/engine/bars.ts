import type { Site } from '@lunar/contracts';

export type Difficulty = 'normal' | 'expert';

export interface Bar {
  key: string;
  label: string;
  /** 0-100, higher is better. */
  value: number;
  text: string;
}

const clamp100 = (v: number): number => Math.min(100, Math.max(0, v));

export function qualityBars(site: Site, difficulty: Difficulty): Bar[] {
  const m = site.metrics;
  const bars: Bar[] = [
    {
      key: 'illum_pct',
      label: 'Sunlight',
      value: clamp100(m.illum_pct * 100),
      text: `${Math.round(m.illum_pct * 100)}%`,
    },
    {
      key: 'earth_vis_pct',
      label: 'Earth view',
      value: clamp100(m.earth_vis_pct * 100),
      text: `${Math.round(m.earth_vis_pct * 100)}%`,
    },
    {
      key: 'slope_deg',
      label: 'Slope',
      value: clamp100(100 - (m.slope_deg / 20) * 100),
      text: `${m.slope_deg.toFixed(1)}°`,
    },
  ];
  if (difficulty === 'expert') {
    bars.push(
      {
        key: 'max_dark_hours',
        label: 'Longest dark',
        value: clamp100(100 - (m.max_dark_hours / 500) * 100),
        text: `${Math.round(m.max_dark_hours)} h`,
      },
      {
        key: 'psr_dist_km',
        label: 'Icy craters',
        value: clamp100(100 - (m.psr_dist_km / 20) * 100),
        text: `${m.psr_dist_km.toFixed(1)} km`,
      },
    );
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
