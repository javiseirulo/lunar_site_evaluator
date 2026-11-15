/**
 * Mission requirements. This type mirrors the teammate's future `MissionConfig`
 * (to be replaced by an import from `@/scoring`); keep it a plain data type.
 */
export type Criterion = { threshold: number; objective: number };

export interface MissionRequirements {
  slope_max_deg: number;
  max_dark_h: Criterion;
  max_blackout_h: Criterion;
  comm_pct: Criterion;
  illum_pct: Criterion;
  antenna_margin_deg: number;
  surface_days: number;
  /**
   * Historical mode: allowed Sun elevation (degrees) at touchdown. Too low and the pilot (or the
   * cameras) cannot see the ground; too high and there are no shadows to show the rocks.
   * Absent / null: no landing-light rule (South Pole mode, radar-era landers).
   */
  landing_light?: { min: number; max: number } | null;
  /** Far side missions: the Earth link goes through a relay satellite, so it is always up. */
  relay?: boolean;
}

export const DEFAULT_REQUIREMENTS: MissionRequirements = {
  slope_max_deg: 10,
  max_dark_h: { threshold: 100, objective: 24 },
  max_blackout_h: { threshold: 72, objective: 12 },
  comm_pct: { threshold: 0.5, objective: 0.95 },
  illum_pct: { threshold: 0.5, objective: 0.85 },
  antenna_margin_deg: 2,
  surface_days: 7,
};
