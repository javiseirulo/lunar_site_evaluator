/**
 * Live candidate list for Explore — owner: Marta (src/globe).
 * Loads every site's timeseries once the first requirement is active, then re-evaluates on any change.
 */
import { useDeferredValue, useEffect, useMemo } from 'react';
import { loadTimeseries, useData, useTimeseries } from '@/core';
import {
  activeChecks,
  evaluateSite,
  missionStats,
  resolveWindow,
  sortEvaluations,
  topRanks,
  type MissionStats,
  type ResolvedWindow,
  type SiteEvaluation,
} from './missionStats';
import { useRequirements } from './requirementsStore';

/** The mission window resolved against manifest.time_range (null while the manifest loads). */
export function useMissionWindow(): ResolvedWindow | null {
  const range = useData((s) => s.manifest?.time_range);
  const input = useRequirements((s) => s.window);
  return useMemo(() => (range ? resolveWindow(range, input) : null), [range, input]);
}

export interface Candidates {
  /** False until at least one requirement can be checked. */
  active: boolean;
  /** Loading the timeseries of all sites. */
  loading: boolean;
  /** Sites whose timeseries failed to load. */
  failed: number;
  total: number;
  /** All sites, candidates first, sorted (null when not active). */
  evaluations: SiteEvaluation[] | null;
  candidates: SiteEvaluation[];
  /** Site id → 1…5 for the top five candidates. */
  topRank: Map<string, number>;
  window: ResolvedWindow | null;
}

export function useCandidates(): Candidates {
  const sites = useData((s) => s.sites);
  const timeseries = useData((s) => s.timeseries);
  const tsErrors = useData((s) => s.timeseriesErrors);
  const window = useMissionWindow();
  const liveReq = useRequirements((s) => s.req);
  const sortBy = useRequirements((s) => s.sortBy);
  // Inputs stay responsive while the list re-evaluates.
  const req = useDeferredValue(liveReq);
  // Same requirements for the flag and the evaluation (no flash of "0 of N" while deferring).
  const active = activeChecks(req).length > 0;
  const wantData = activeChecks(liveReq).length > 0;

  useEffect(() => {
    if (wantData && sites) for (const s of sites) void loadTimeseries(s.id);
  }, [wantData, sites]);

  return useMemo(() => {
    const total = sites?.length ?? 0;
    const failed = sites?.filter((s) => tsErrors[s.id]).length ?? 0;
    const loading = !!sites && sites.some((s) => !timeseries[s.id] && !tsErrors[s.id]);
    if (!active || !sites || !window) {
      return {
        active,
        loading: active && loading,
        failed,
        total,
        evaluations: null,
        candidates: [],
        topRank: new Map(),
        window,
      };
    }
    const evals = sites.map((site) => {
      const ts = timeseries[site.id];
      return evaluateSite(site, ts ? missionStats(ts, window) : null, req);
    });
    const evaluations = sortEvaluations(evals, sortBy, req);
    const candidates = evaluations.filter((e) => e.candidate);
    const topRank = topRanks(evaluations, sortBy, req);
    return { active, loading, failed, total, evaluations, candidates, topRank, window };
  }, [active, sites, timeseries, tsErrors, window, req, sortBy]);
}

/** Window statistics for one site (detail sheet), loading its timeseries on demand. */
export function useSiteStats(siteId: string | null): MissionStats | null {
  const ts = useTimeseries(siteId);
  const window = useMissionWindow();
  return useMemo(() => (ts && window ? missionStats(ts, window) : null), [ts, window]);
}
