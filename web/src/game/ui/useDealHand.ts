/**
 * Deals the hand in the background while the game is in `alert` / `briefing` with no hand. A year of hourly data is ~500 KB per
 * site, so it does not load every series: it picks a seeded subset of South Pole sites
 * (`pickSubset`), loads only their timeseries and runs `deal()` on them; if that subset has no
 * valid hand it tries another one, up to `MAX_DEAL_ATTEMPTS`. Safe against StrictMode double
 * effects and against results that arrive after the phase or seed changed.
 *
 * A failed or empty result is keyed on the store's `dealId` plus a local retry counter, so it
 * never leaks into a later deal (quit + start with the same seed), and `retry()` re-runs it.
 */
import { useEffect, useState } from 'react';
import { loadTimeseries, useData } from '@/core';
import { deal, MAX_DEAL_ATTEMPTS, pickSubset, southPoleSites } from '../engine/deal';
import { DEAL_PHASES, useGame } from '../state/gameStore';
import { loadMission } from '../historic/data';
import { dealHistoric } from '../historic/deal';

export type DealStatus = 'loading' | 'empty' | 'error';

export interface DealHand {
  status: DealStatus;
  /** Re-runs the deal after a load failure (the series that failed are fetched again). */
  retry: () => void;
}

export function useDealHand(): DealHand {
  // A boolean, so going from alert to briefing does not restart a deal in progress.
  const inDeal = useGame((s) => DEAL_PHASES.includes(s.phase));
  const hand = useGame((s) => s.hand);
  const seed = useGame((s) => s.seed);
  const dealId = useGame((s) => s.dealId);
  const missionId = useGame((s) => (s.mode === 'historical' ? s.missionId : null));
  const sites = useData((s) => s.sites);
  const dataError = useData((s) => s.status === 'error');
  const [attempt, setAttempt] = useState(0);
  const key = `${dealId}:${attempt}`;
  const [emptyKey, setEmptyKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!inDeal || hand !== null || !sites) return;
    let cancelled = false;
    const stale = (): boolean => {
      const game = useGame.getState();
      return (
        cancelled || !DEAL_PHASES.includes(game.phase) || game.hand !== null || game.seed !== seed
      );
    };
    const pool = southPoleSites(sites);

    // Historical: the hand is the mission's own four options, judged at the real landing time.
    const runHistoric = async (id: string): Promise<void> => {
      const mission = await loadMission(id);
      if (stale()) return;
      if (!mission) {
        setFailedKey(key);
        return;
      }
      useGame.getState().dealt(dealHistoric(mission, seed));
    };

    const run = async (): Promise<void> => {
      let loadFailed = false;
      for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt++) {
        const subset = pickSubset(pool, seed, attempt);
        await Promise.all(subset.map((s) => loadTimeseries(s.id)));
        if (stale()) return;
        const data = useData.getState();
        // deal() skips sites whose series failed; remember failures to report a load error.
        // timeseriesErrors is never cleared, so a site that has a series now did load.
        loadFailed ||= subset.some((s) => !data.timeseries[s.id] && data.timeseriesErrors[s.id]);
        const dealt = deal(subset, data.timeseries, seed);
        if (dealt) {
          useGame.getState().dealt(dealt);
          return;
        }
        if (subset.length >= pool.length) break; // every site already tried
      }
      // loadTimeseries swallows fetch errors (it records them in timeseriesErrors): with no
      // hand, a failed series means a load problem, not "no valid mission".
      if (loadFailed) setFailedKey(key);
      else setEmptyKey(key);
    };

    (missionId ? runHistoric(missionId) : run()).catch((err: unknown) => {
      // A series failed to load or deal() threw: show the load error, not "no valid mission".
      console.error('Mission deal failed', err);
      if (!cancelled) setFailedKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [inDeal, hand, seed, sites, key, missionId]);

  const status: DealStatus =
    dataError || failedKey === key ? 'error' : emptyKey === key ? 'empty' : 'loading';
  return { status, retry: () => setAttempt((a) => a + 1) };
}
