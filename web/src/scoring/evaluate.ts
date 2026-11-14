/**
 * Validity and score of a site for a mission window (owner: Javi; contracts/README.md v1.1
 * "Window metrics" and "Validity and score", docs/10 J5–J7). The ONE implementation of the score:
 * Explore, Sites, Compare and Mission import it from `@/scoring`; the Python export mirrors it and
 * both are checked against contracts/fixtures/golden-score.json.
 *
 *   const ev = evaluateWindow(site, ts, missionConfig, missionWindow(missionConfig, site));
 *   ev.valid; ev.score; ev.checks; ev.contributions; ev.reasons;
 */
import type {
  MissionConfig,
  Requirement,
  RequirementCheck,
  RequirementKey,
  SiteMetrics,
  SiteMetricsExtra,
  SiteReason,
  Timeseries,
} from '@lunar/contracts';
import { DEFAULT_MISSION_CONFIG } from './defaults';
import { margin, passes, utility } from './utility';

/** Metric values by key; null/undefined/NaN = not available (treated as pending). */
export type MetricValues = Partial<Record<RequirementKey, number | null>>;

/** Only the parts of MissionConfig the score depends on. */
export type ScoringConfig = Pick<MissionConfig, 'requirements' | 'weights'>;

export interface Contribution {
  key: RequirementKey;
  weight: number;
  utility: number;
  /** wᵢ·uᵢ / Σw: this criterion's part of the score (the shares add up to the unrounded score). */
  share: number;
}

export interface SiteEvaluation {
  valid: boolean;
  /** Σ wᵢ·uᵢ / Σ wᵢ over the weighted, non-pending criteria, 0–1, 3 decimals (0 if Σw = 0). */
  score: number;
  checks: RequirementCheck[];
  contributions: Contribution[];
  reasons: SiteReason[];
}

export interface WindowSpan {
  start_utc: string;
  end_utc: string;
}

/** Window metrics computed from a Timeseries (docs/10 J5). */
export const WINDOW_KEYS = [
  'illum_pct',
  'sun_el_mean_deg',
  'max_dark_hours',
  'earth_vis_pct',
  'max_blackout_hours',
  'sun_earth_pct',
] as const satisfies readonly RequirementKey[];
export type WindowMetricKey = (typeof WINDOW_KEYS)[number];

/**
 * Window metrics. A value is null when it cannot be measured: Earth metrics when the series has no
 * `earth_visible` (v1 data), every metric when the window has no samples. Null → pending check.
 */
export type WindowMetrics = Record<WindowMetricKey, number | null> & { samples: number };

/** Reason strings per requirement: [passes, fails]. v1 strings kept where they existed. */
export const REASON_CODES: Record<RequirementKey, readonly [SiteReason, SiteReason]> = {
  slope_deg: ['slope_ok', 'slope_high'],
  illum_pct: ['illum_ok', 'illum_low'],
  earth_vis_pct: ['earth_ok', 'earth_low'],
  max_dark_hours: ['dark_ok', 'dark_long'],
  max_blackout_hours: ['blackout_ok', 'blackout_long'],
  sun_el_mean_deg: ['sun_el_ok', 'sun_el_low'],
  sun_earth_pct: ['sun_earth_ok', 'sun_earth_low'],
  psr_dist_km: ['psr_ok', 'psr_far'],
};

const isNumber = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export function reasonFor(check: RequirementCheck): SiteReason {
  if (check.pending) return `${check.key}_pending`;
  const codes = REASON_CODES[check.key];
  if (!codes) return `${check.key}_${check.ok ? 'ok' : 'fail'}`;
  return check.ok ? codes[0] : codes[1];
}

/**
 * Validity, score, per-requirement checks and score contributions from metric values.
 * Requirements are evaluated in the order of `config.requirements`. Metrics that are pending or
 * missing give a check with `pending: true, ok: true, value: null, margin: null` and count for
 * neither validity nor score. Weights ≤ 0, and weights of keys without a requirement, are ignored.
 */
export function evaluateSite(
  input: { metrics: MetricValues; pending?: readonly RequirementKey[] },
  config: ScoringConfig,
): SiteEvaluation {
  const pending = new Set(input.pending ?? []);
  const checks: RequirementCheck[] = [];
  const contributions: Contribution[] = [];
  let valid = true;
  let sumW = 0;
  let sumWU = 0;

  for (const key of Object.keys(config.requirements) as RequirementKey[]) {
    const req = config.requirements[key];
    if (!req) continue;
    const value = input.metrics[key];
    const base = {
      key,
      threshold: req.threshold,
      ...(req.objective !== undefined && { objective: req.objective }),
    };
    if (pending.has(key) || !isNumber(value)) {
      checks.push({ ...base, ok: true, value: null, margin: null, pending: true });
      continue;
    }
    const ok = passes(key, value, req);
    valid &&= ok;
    checks.push({ ...base, ok, value, margin: margin(key, value, req) });
    const w = config.weights[key] ?? 0;
    if (isNumber(w) && w > 0) {
      const u = utility(key, value, req);
      sumW += w;
      sumWU += w * u;
      contributions.push({ key, weight: w, utility: u, share: 0 });
    }
  }

  for (const c of contributions) c.share = (c.weight * c.utility) / sumW;
  const score = sumW > 0 ? Math.round((sumWU / sumW) * 1000) / 1000 : 0;
  return { valid, score, checks, contributions, reasons: checks.map(reasonFor) };
}

/**
 * Sample range [i0, i1) of `ts` with start ≤ t < end (half-open window: the first sample is the
 * first one at or after start, i.e. start rounded up to the step). Omitted bounds = whole series.
 */
export function windowSlice(ts: Timeseries, startIso?: string, endIso?: string): [number, number] {
  const n = ts.t_utc.length;
  if (n === 0) return [0, 0];
  const t = (i: number) => Date.parse(ts.t_utc[i]!);
  // first index with t(i) >= x (binary search; t_utc is sorted)
  const lowerBound = (x: number) => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t(mid) < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const i0 = startIso ? lowerBound(Date.parse(startIso)) : 0;
  const i1 = endIso ? lowerBound(Date.parse(endIso)) : n;
  return [i0, Math.max(i0, i1)];
}

/** The series has samples for all of [start, end). */
export function timeseriesCovers(ts: Timeseries, startIso: string, endIso: string): boolean {
  const n = ts.t_utc.length;
  if (n === 0) return false;
  return (
    Date.parse(ts.t_utc[0]!) <= Date.parse(startIso) &&
    Date.parse(ts.t_utc[n - 1]!) + ts.step_s * 1000 >= Date.parse(endIso)
  );
}

/**
 * Window metrics over [start, end) (contracts/README.md v1.1):
 * illum_pct = mean(sun_frac) (mean(lit) without sun_frac); sun_el_mean_deg = mean(sun_frac ·
 * max(0, sun_el)) (lit instead of sun_frac in v1 data); max_dark_hours / max_blackout_hours =
 * longest run of lit = 0 / earth_visible = 0 in hours (runs are cut at the window edges);
 * earth_vis_pct = mean(earth_visible); sun_earth_pct = mean(sun_frac · earth_visible). Run length
 * = sample count × step.
 */
export function windowMetrics(ts: Timeseries, startIso?: string, endIso?: string): WindowMetrics {
  const [i0, i1] = windowSlice(ts, startIso, endIso);
  const m = i1 - i0;
  const n = ts.t_utc.length;
  if (m === 0) {
    return {
      illum_pct: null,
      sun_el_mean_deg: null,
      max_dark_hours: null,
      earth_vis_pct: null,
      max_blackout_hours: null,
      sun_earth_pct: null,
      samples: 0,
    };
  }
  const frac = ts.sun_frac?.length === n ? ts.sun_frac : null;
  const ev = ts.earth_visible?.length === n ? ts.earth_visible : null;
  let illum = 0;
  let elSum = 0;
  let dark = 0;
  let darkMax = 0;
  let vis = 0;
  let black = 0;
  let blackMax = 0;
  let both = 0;
  for (let i = i0; i < i1; i++) {
    const lit = ts.lit[i] === 1;
    const f = frac ? frac[i]! : lit ? 1 : 0;
    illum += f;
    elSum += f * Math.max(0, ts.sun_el[i]!);
    dark = lit ? 0 : dark + 1;
    darkMax = Math.max(darkMax, dark);
    if (ev) {
      const up = ev[i] === 1;
      vis += up ? 1 : 0;
      both += up ? f : 0;
      black = up ? 0 : black + 1;
      blackMax = Math.max(blackMax, black);
    }
  }
  const h = ts.step_s / 3600;
  return {
    illum_pct: illum / m,
    sun_el_mean_deg: elSum / m,
    max_dark_hours: darkMax * h,
    earth_vis_pct: ev ? vis / m : null,
    max_blackout_hours: ev ? blackMax * h : null,
    sun_earth_pct: ev ? both / m : null,
    samples: m,
  };
}

/** What `evaluateWindow` needs from a site: its static metrics (slope, PSR) and pending list. */
export interface EvaluableSite {
  metrics?: Partial<SiteMetrics & SiteMetricsExtra>;
  pending_metrics?: RequirementKey[];
}

export interface WindowEvaluation extends SiteEvaluation {
  window: WindowSpan;
  /** Values used: window metrics + the site's static slope_deg / psr_dist_km. */
  metrics: MetricValues;
  /** Samples of `ts` inside the window. */
  samples: number;
  /** `ts` covers the whole window. */
  covered: boolean;
}

/**
 * Evaluate a site on a mission window: window metrics from `ts` + the static `slope_deg` /
 * `psr_dist_km` of `site.metrics`. `site.pending_metrics` applies to those static metrics (the
 * window metrics are recomputed from `ts`, so they are never placeholders).
 */
export function evaluateWindow(
  site: EvaluableSite,
  ts: Timeseries,
  config: ScoringConfig,
  window: WindowSpan,
): WindowEvaluation {
  const wm = windowMetrics(ts, window.start_utc, window.end_utc);
  const { samples, ...windowValues } = wm;
  const metrics: MetricValues = {
    ...windowValues,
    slope_deg: site.metrics?.slope_deg ?? null,
    psr_dist_km: site.metrics?.psr_dist_km ?? null,
  };
  const windowKeys: readonly RequirementKey[] = WINDOW_KEYS;
  const pending = (site.pending_metrics ?? []).filter((k) => !windowKeys.includes(k));
  return {
    ...evaluateSite({ metrics, pending }, config),
    window,
    metrics,
    samples,
    covered: timeseriesCovers(ts, window.start_utc, window.end_utc),
  };
}

/** Valid sites first, then by score (descending). Stable; returns a new array. */
export function rankSites<T extends { valid: boolean; score: number }>(evals: readonly T[]): T[] {
  return [...evals].sort((a, b) => Number(b.valid) - Number(a.valid) || b.score - a.score);
}

/**
 * A partial scenario merged onto DEFAULT_MISSION_CONFIG (or `base`): top-level fields replace,
 * `requirements` and `weights` are merged key by key (and per requirement field).
 */
export function mergeMissionConfig(
  partial: DeepPartialConfig = {},
  base: MissionConfig = DEFAULT_MISSION_CONFIG,
): MissionConfig {
  const { requirements, weights, ...rest } = partial;
  const reqs: MissionConfig['requirements'] = { ...base.requirements };
  for (const [k, r] of Object.entries(requirements ?? {}) as [
    RequirementKey,
    Partial<Requirement> | undefined,
  ][]) {
    if (!r) continue;
    const merged = { ...base.requirements[k], ...r };
    if (typeof merged.threshold === 'number') reqs[k] = merged as Requirement;
  }
  const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  return {
    ...base,
    ...clean,
    requirements: reqs,
    weights: { ...base.weights, ...(weights ?? {}) },
  };
}

export type DeepPartialConfig = Partial<Omit<MissionConfig, 'requirements' | 'weights'>> & {
  requirements?: Partial<Record<RequirementKey, Partial<Requirement>>>;
  weights?: Partial<MissionConfig['weights']>;
};
