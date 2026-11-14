/**
 * Explore filtering state + live ranking — owner: Marta (src/globe).
 *
 * Candidate sites stay hidden (list and 3D pins) until the user applies requirements once.
 * After that, every slider change re-filters and re-ranks live. The requirements themselves live
 * in the shared store (`missionConfig.requirements`, Javi's J9); only "applied" is local here.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { useAppStore, useData } from '@/core';
import { rankSites, type SiteEvaluation } from './requirements';

interface ExploreState {
  applied: boolean;
  setApplied: (applied: boolean) => void;
}

export const useExplore = create<ExploreState>()((set) => ({
  applied: false,
  setApplied: (applied) => set({ applied }),
}));

/** Ranked evaluations of every site, or null while data loads or before requirements are applied. */
export function useRanking(): SiteEvaluation[] | null {
  const sites = useData((s) => s.sites);
  const requirements = useAppStore((s) => s.missionConfig.requirements);
  const weights = useAppStore((s) => s.missionConfig.weights);
  const applied = useExplore((s) => s.applied);
  return useMemo(
    () => (sites && applied ? rankSites(sites, { requirements, weights }) : null),
    [sites, requirements, weights, applied],
  );
}
