/**
 * Default mission configuration (owner: Javi). These are the initial values of the Explore
 * sliders and the base that Mission scenarios override. Thresholds are reasonable starting
 * points, not official requirements (docs/10 §5 Javi, J9).
 */
import type { MissionConfig } from '@lunar/contracts';

export const DEFAULT_MISSION_CONFIG: MissionConfig = {
  time_mode: 'design',
  // 7-day window of 2027 with the most valid catalog sites (42/59, LOLA terrain horizons for the
  // 41 polar sites, real slope), found by scanning daily starts over 2027 (decisions log 2026-11-15).
  landing_utc: '2027-10-12T00:00:00.000Z',
  launch_utc: '2027-10-07T00:00:00.000Z',
  trajectory: 'hohmann',
  llo_alt_km: 100,
  // Same order as the planned Artemis III surface stay (~6.5 days).
  surface_days: 7,
  antenna_margin_deg: 2,
  requirements: {
    // 10°: Artemis HLS "surface slope for landing (100 m) < 10°" (docs/decisions/log.md, 2026-11-14).
    slope_deg: { threshold: 10, objective: 2 },
    illum_pct: { threshold: 0.5, objective: 0.85 },
    max_dark_hours: { threshold: 100, objective: 24 },
    earth_vis_pct: { threshold: 0.5, objective: 0.95 },
    max_blackout_hours: { threshold: 72, objective: 12 },
  },
  weights: {
    slope_deg: 0.2,
    illum_pct: 0.2,
    max_dark_hours: 0.2,
    earth_vis_pct: 0.2,
    max_blackout_hours: 0.2,
  },
};
