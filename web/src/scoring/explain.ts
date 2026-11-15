/**
 * Plain-language explanation of a site's validity and score (pure; thresholds come from the
 * evaluation's own checks and the mission config, never hardcoded). Used by the 'i' popover of
 * the Site Check panel in Normal and Expert modes.
 */
import type { RequirementCheck, RequirementKey } from '@lunar/contracts';
import { lessIsBetter } from './utility';
import type { Contribution, ScoringConfig } from './evaluate';

type Unit = 'pct' | 'h' | 'deg' | 'km';

/** Plain-language label and unit per requirement key. */
export const REQUIREMENT_LABEL: Record<string, { label: string; unit: Unit }> = {
  illum_pct: { label: 'Sunlight', unit: 'pct' },
  earth_vis_pct: { label: 'Earth in view', unit: 'pct' },
  max_dark_hours: { label: 'Longest night', unit: 'h' },
  max_blackout_hours: { label: 'Longest Earth blackout', unit: 'h' },
  sun_el_mean_deg: { label: 'Mean Sun height', unit: 'deg' },
  sun_earth_pct: { label: 'Sun and Earth together', unit: 'pct' },
  slope_deg: { label: 'Slope', unit: 'deg' },
  psr_dist_km: { label: 'To icy craters', unit: 'km' },
};

export const requirementLabel = (key: string) => REQUIREMENT_LABEL[key]?.label ?? key;

/** A metric value with its unit, e.g. "50%", "72 h", "0.9°"; "—" when not available. */
export function formatRequirementValue(key: string, v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  switch (REQUIREMENT_LABEL[key]?.unit) {
    case 'pct':
      return `${Math.round(v * 100)}%`;
    case 'h':
      return `${Math.round(v)} h`;
    case 'deg':
      return `${v.toFixed(1)}°`;
    case 'km':
      return `${v.toFixed(1)} km`;
    default:
      return String(Math.round(v * 100) / 100);
  }
}

/** "≤ 10°" or "≥ 50%". */
export function formatNeed(key: string, threshold: number): string {
  return `${lessIsBetter(key as RequirementKey) ? '≤' : '≥'} ${formatRequirementValue(key, threshold)}`;
}

/**
 * Note shown next to a score when some requirements could not be measured, or null when all were:
 * "Slope not measured here — score uses the other 4 requirements".
 */
export function pendingNote(checks: readonly RequirementCheck[]): string | null {
  const pending = checks.filter((c) => c.pending).map((c) => requirementLabel(c.key));
  if (pending.length === 0) return null;
  const rest = checks.length - pending.length;
  return `${pending.join(' and ')} not measured here — score uses the other ${rest} requirement${rest === 1 ? '' : 's'}`;
}

export interface Explanation {
  /** Generic part: what VALID and the score mean. */
  general: string;
  /** Headline of the per-site part: "Score 100 because:" / "NOT VALID because:". */
  headline: string;
  /** One sentence per reason (per requirement, or per failing requirement). */
  reasons: string[];
}

export function explainEvaluation(
  ev: { valid: boolean; score: number; checks: RequirementCheck[]; contributions: Contribution[] },
  config: ScoringConfig,
  surfaceDays: number,
  slopeBaselineM: number | null = null,
): Explanation {
  const weighted = Object.keys(config.requirements).filter(
    (k) => (config.weights[k as RequirementKey] ?? 0) > 0,
  );
  const n = weighted.length;
  const sumW = weighted.reduce((s, k) => s + (config.weights[k as RequirementKey] ?? 0), 0);
  const equal = n > 0 && weighted.every((k) => config.weights[k as RequirementKey] === sumW / n);
  const points = (w: number) => `${Math.round((w / sumW) * 100)}`;
  const weightText =
    n === 0
      ? 'No requirement has a weight, so the score is 0.'
      : equal
        ? `${n} requirements count equally, ${points(sumW / n)} points each at most.`
        : `${n} requirements are weighted, up to ${weighted
            .map(
              (k) => `${requirementLabel(k)} ${points(config.weights[k as RequirementKey] ?? 0)}`,
            )
            .join(', ')} points.`;
  const general =
    `A site is VALID when every requirement is met over the ${surfaceDays}-day mission window ` +
    `starting at landing. Each requirement earns 0 points when it is only just met and full ` +
    `points when it reaches its target, so the score (0–100) rewards margin over the limits. ${weightText}`;

  const util = new Map(ev.contributions.map((c) => [c.key, c.utility]));
  const measured = ev.checks.filter((c) => !c.pending);
  const pendingLabels = ev.checks.filter((c) => c.pending).map((c) => requirementLabel(c.key));
  const pendingText =
    pendingLabels.length > 0
      ? [
          `${pendingLabels.join(', ')}: not measured here, so left out. The score covers only the ${measured.length} requirement${measured.length === 1 ? '' : 's'} that could be measured (${measured.map((c) => requirementLabel(c.key)).join(', ')}) and is not a final verdict.`,
        ]
      : [];

  if (slopeBaselineM !== null)
    pendingText.push(
      `Slope was measured from the polar heightmap with a ${Math.round(slopeBaselineM)} m baseline; it is coarser than the catalogue's own slope.`,
    );

  if (!ev.valid) {
    const failing = measured.filter((c) => !c.ok);
    return {
      general,
      headline: 'NOT VALID because:',
      reasons: [
        ...failing.map((c) => {
          const less = lessIsBetter(c.key);
          return `${requirementLabel(c.key)} is ${formatRequirementValue(c.key, c.value)}, but the mission needs ${formatNeed(c.key, c.threshold)}${less ? ' (too high)' : ' (too low)'}.`;
        }),
        ...pendingText,
      ],
    };
  }
  if (measured.length === 0) {
    return {
      general,
      headline: 'Not enough data yet:',
      reasons: pendingText.length ? pendingText : ['Nothing has been measured for this site yet.'],
    };
  }
  return {
    general,
    headline: `${pendingLabels.length > 0 ? 'Score so far' : 'Score'} ${Math.round(ev.score * 100)} because:`,
    reasons: [
      ...measured.map((c) => {
        const u = util.get(c.key);
        const grade =
          u === undefined
            ? 'meets the limit'
            : u >= 0.995
              ? 'full points'
              : u <= 0.005
                ? 'just meets the limit, no extra points'
                : `${Math.round(u * 100)}% of the points`;
        return `${requirementLabel(c.key)} ${formatRequirementValue(c.key, c.value)} (needs ${formatNeed(c.key, c.threshold)}): ${grade}.`;
      }),
      ...pendingText,
    ],
  };
}
