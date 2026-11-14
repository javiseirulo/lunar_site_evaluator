/**
 * Per-requirement pass/fail, margin and utility (owner: Javi; contracts/README.md v1.1 "Validity
 * and score", docs/10 J6–J7). Pure; mirrored by the Python export (contracts/fixtures/golden-score.json).
 */
import type { Requirement, RequirementKey } from '@lunar/contracts';

/** Metrics that fail ABOVE their threshold. Every other metric fails below it. */
export const LESS_IS_BETTER: ReadonlySet<RequirementKey> = new Set<RequirementKey>([
  'slope_deg',
  'max_dark_hours',
  'max_blackout_hours',
  'psr_dist_km',
]);

export const lessIsBetter = (key: RequirementKey) => LESS_IS_BETTER.has(key);

/** The requirement passes; exactly at the threshold counts as passing. Unrounded values. */
export function passes(key: RequirementKey, value: number, req: Requirement): boolean {
  return lessIsBetter(key) ? value <= req.threshold : value >= req.threshold;
}

/**
 * Signed relative margin, > 0 passes (0 = exactly at the threshold, also passes):
 * (value − threshold)/|threshold| (more is better), (threshold − value)/|threshold| (less is
 * better); the plain difference when the threshold is 0.
 */
export function margin(key: RequirementKey, value: number, req: Requirement): number {
  const t = req.threshold;
  const diff = lessIsBetter(key) ? t - value : value - t;
  return t === 0 ? diff : diff / Math.abs(t);
}

/**
 * Utility 0–1: 0 at the threshold, 1 at the objective, linear in between and clamped (inverted for
 * less-is-better metrics). Without an objective — or with one that is not strictly on the good
 * side of the threshold (e.g. objective = threshold) — it is 1 when the requirement passes, else 0.
 */
export function utility(key: RequirementKey, value: number, req: Requirement): number {
  const ok = passes(key, value, req);
  const t = req.threshold;
  const o = req.objective;
  const less = lessIsBetter(key);
  if (o === undefined || (less ? o >= t : o <= t)) return ok ? 1 : 0;
  const u = less ? (t - value) / (t - o) : (value - t) / (o - t);
  return Math.min(1, Math.max(0, u));
}
