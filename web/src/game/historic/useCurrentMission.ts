/** The Historical mission in play (loaded on first use), or null in South Pole mode. */
import { useEffect } from 'react';
import { useGame } from '../state/gameStore';
import { loadMission, useHistoric, type HistoricMission } from './data';

export function useCurrentMission(): HistoricMission | null {
  const missionId = useGame((s) => (s.mode === 'historical' ? s.missionId : null));
  const mission = useHistoric((s) => (missionId ? s.loaded[missionId] : undefined));
  useEffect(() => {
    if (missionId) void loadMission(missionId);
  }, [missionId]);
  return mission ?? null;
}
