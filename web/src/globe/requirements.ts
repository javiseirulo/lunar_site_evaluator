/**
 * INTERIM requirement filter + ranking for Explore — owner: Marta (src/globe).
 *
 * Lives here, not in src/scoring, on purpose: Javi will publish the official `evaluateSite` /
 * `rankSites` in `@/scoring` (docs/10 §10), and Marta's v1 replaces the sliders with mission
 * requirements (battery, consumption, panel, comm outage, slope) computed in `missionStats.ts`
 * (docs/10 §5 Marta). Until then this filters on the v1 metrics in sites.json:
 * - each requirement has a threshold (hard limit) and an optional objective;
 * - utility: 0 at the threshold, 1 at the objective (inverted when less is better);
 * - score: weighted mean of the utilities of the criteria the site has data for (0–1);
 * - a site passes if it meets every requirement it has data for and `site.valid`.
 */
import type { MissionConfig, Requirement, RequirementKey, Site } from '@lunar/contracts';

/** Which way is better for each metric. */
export const BETTER: Record<RequirementKey, 'high' | 'low'> = {
  illum_pct: 'high',
  earth_vis_pct: 'high',
  sun_el_mean_deg: 'high',
  sun_earth_pct: 'high',
  slope_deg: 'low',
  max_dark_hours: 'low',
  max_blackout_hours: 'low',
  psr_dist_km: 'low',
};

export interface CriterionResult {
  key: RequirementKey;
  value: number;
  threshold: number;
  objective: number | undefined;
  pass: boolean;
  /** (value − threshold) / |threshold|, positive = on the good side. */
  margin: number;
  /** 0–1 */
  utility: number;
  weight: number;
}

export interface SiteEvaluation {
  site: Site;
  /** Meets every requirement with data and the safety filter. */
  pass: boolean;
  /** False when the pipeline's safety filter (`site.valid`) rejects the site. */
  safe: boolean;
  /** Requirements the site misses, worst margin first. */
  failed: CriterionResult[];
  criteria: CriterionResult[];
  /** Weighted mean utility, 0–1 (0 when no criterion has a weight). */
  score: number;
}

/** Utility 0–1 of `value` for one requirement. */
export function utility(value: number, req: Requirement, better: 'high' | 'low'): number {
  const sign = better === 'high' ? 1 : -1;
  const pass = sign * (value - req.threshold) >= 0;
  if (!pass) return 0;
  if (req.objective === undefined) return 1;
  const span = sign * (req.objective - req.threshold);
  if (span <= 0) return 1; // threshold already at/after the objective: passing is all there is
  return Math.min(1, (sign * (value - req.threshold)) / span);
}

function metricValue(site: Site, key: RequirementKey): number | undefined {
  const v = (site.metrics as unknown as Record<string, unknown>)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

export function evaluateSite(
  site: Site,
  config: Pick<MissionConfig, 'requirements' | 'weights'>,
): SiteEvaluation {
  const criteria: CriterionResult[] = [];
  for (const [k, req] of Object.entries(config.requirements)) {
    const key = k as RequirementKey;
    const value = metricValue(site, key);
    if (!req || value === undefined) continue;
    const better = BETTER[key];
    const sign = better === 'high' ? 1 : -1;
    const margin = (sign * (value - req.threshold)) / (Math.abs(req.threshold) || 1);
    criteria.push({
      key,
      value,
      threshold: req.threshold,
      objective: req.objective,
      pass: margin >= 0,
      margin,
      utility: utility(value, req, better),
      weight: config.weights[key] ?? 0,
    });
  }
  const failed = criteria.filter((c) => !c.pass).sort((a, b) => a.margin - b.margin);
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  const score =
    totalWeight > 0 ? criteria.reduce((s, c) => s + c.weight * c.utility, 0) / totalWeight : 0;
  return {
    site,
    pass: site.valid && failed.length === 0,
    safe: site.valid,
    failed,
    criteria,
    score,
  };
}

/** Passing sites first (best score first), then the rest (fewest misses, then score). */
export function rankSites(
  sites: Site[],
  config: Pick<MissionConfig, 'requirements' | 'weights'>,
): SiteEvaluation[] {
  return sites
    .map((s) => evaluateSite(s, config))
    .sort(
      (a, b) =>
        Number(b.pass) - Number(a.pass) ||
        Number(b.safe) - Number(a.safe) ||
        a.failed.length - b.failed.length ||
        b.score - a.score ||
        a.site.name.localeCompare(b.site.name),
    );
}
