/**
 * Human-readable requirement texts shared by the Explore list and the globe card — owner: Marta.
 */
import type { RequirementKey } from '@lunar/contracts';
import { METRICS, friendlyHours, pct } from '@/core';
import type { CriterionResult, SiteEvaluation } from './requirements';

export function formatValue(key: RequirementKey, v: number, pro: boolean): string {
  if (key === 'illum_pct' || key === 'earth_vis_pct' || key === 'sun_earth_pct') return pct(v);
  if (key === 'slope_deg') return `${v.toFixed(0)}°`;
  if (key === 'sun_el_mean_deg') return `${v.toFixed(1)}°`;
  if (key === 'psr_dist_km') return `${v} km`;
  return pro ? `${Math.round(v)} h` : friendlyHours(v);
}

export function metricLabel(key: RequirementKey, pro: boolean): string {
  const m = METRICS.find((x) => x.key === key);
  return m ? (pro ? m.proLabel : m.label) : key;
}

/** "Sunlight 42% (needs at least 50%)" */
function missText(c: CriterionResult, pro: boolean): string {
  const need = c.value < c.threshold ? 'at least' : 'at most';
  return `${metricLabel(c.key, pro)} ${formatValue(c.key, c.value, pro)} (needs ${need} ${formatValue(c.key, c.threshold, pro)})`;
}

export function whyNot(e: SiteEvaluation, pro: boolean): string {
  if (e.failed[0]) {
    const more = e.failed.length > 1 ? ` +${e.failed.length - 1} more` : '';
    return missText(e.failed[0], pro) + more;
  }
  return 'Fails a safety rule (too steep or too little sunlight).';
}
