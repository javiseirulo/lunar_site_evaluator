/**
 * Outputs for the web beyond a single verdict (owner: Javi; docs/10 J7.4):
 * the "best landing date" curve of a site and the Pareto front of a trade-off scatter.
 */
import type { MissionConfig, Timeseries } from '@lunar/contracts';
import {
  evaluateWindow,
  timeseriesCovers,
  type EvaluableSite,
  type ScoringConfig,
} from './evaluate';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export interface DatePoint {
  landing_utc: string;
  valid: boolean;
  score: number;
}

/**
 * Validity and score against the landing time: one point every `stepHours` for landings in
 * [rangeStart, rangeEnd], each evaluated on [landing, landing + surface_days]. Landings whose
 * window `ts` does not fully cover are left out.
 */
export function bestDateCurve(
  site: EvaluableSite,
  ts: Timeseries,
  config: ScoringConfig & Pick<MissionConfig, 'surface_days'>,
  rangeStartIso: string,
  rangeEndIso: string,
  stepHours = 24,
): DatePoint[] {
  const start = Date.parse(rangeStartIso);
  const end = Date.parse(rangeEndIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(stepHours > 0)) return [];
  const out: DatePoint[] = [];
  for (let t = start; t <= end; t += stepHours * HOUR_MS) {
    const window = {
      start_utc: new Date(t).toISOString(),
      end_utc: new Date(t + config.surface_days * DAY_MS).toISOString(),
    };
    if (!timeseriesCovers(ts, window.start_utc, window.end_utc)) continue;
    const ev = evaluateWindow(site, ts, config, window);
    out.push({ landing_utc: window.start_utc, valid: ev.valid, score: ev.score });
  }
  return out;
}

export interface ParetoPoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Ids of the points no other point dominates, maximising both x and y (e.g. x = sunlight,
 * y = Earth in view). Identical points are all on the front; non-finite points are skipped.
 * Returned in input order. O(n log n).
 */
export function paretoFront(points: readonly ParetoPoint[]): string[] {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const sorted = [...pts].sort((a, b) => b.x - a.x || b.y - a.y);
  const front = new Set<ParetoPoint>();
  let bestY = -Infinity; // best y among the points with a strictly greater x
  for (let i = 0; i < sorted.length;) {
    const x = sorted[i]!.x;
    const groupMaxY = sorted[i]!.y;
    let j = i;
    for (; j < sorted.length && sorted[j]!.x === x; j++) {
      const p = sorted[j]!;
      if (p.y === groupMaxY && p.y > bestY) front.add(p);
    }
    bestY = Math.max(bestY, groupMaxY);
    i = j;
  }
  return pts.filter((p) => front.has(p)).map((p) => p.id);
}
