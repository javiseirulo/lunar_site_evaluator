/**
 * The sites the game can show: the shared catalogue plus, in Historical mode, the options of the
 * mission in play (kept out of the shared list so they never appear in Explore).
 */
import { useMemo } from 'react';
import type { Site } from '@lunar/contracts';
import { useData } from '@/core';
import { useGame } from '../state/gameStore';
import { useHistoric } from './data';

export function useGameSites(): Site[] | null {
  const shared = useData((s) => s.sites);
  const missionId = useGame((s) => (s.mode === 'historical' ? s.missionId : null));
  const mission = useHistoric((s) => (missionId ? s.loaded[missionId] : undefined));
  return useMemo(() => {
    if (!mission) return shared;
    const extra = mission.options.map((o) => o.site);
    return shared ? [...shared, ...extra] : extra;
  }, [shared, mission]);
}

export function useGameSite(id: string | null | undefined): Site | null {
  const sites = useGameSites();
  return useMemo(() => (id ? (sites?.find((s) => s.id === id) ?? null) : null), [sites, id]);
}
