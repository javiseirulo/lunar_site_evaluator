/**
 * Deals the hand while the game is in `alert` with no hand: loads every site's timeseries,
 * runs `deal()` with the store's seed and calls `beginDealing`. Safe against StrictMode double
 * effects and against results that arrive after the phase or seed changed.
 */
import { useEffect, useState } from 'react';
import { loadTimeseries, useData } from '@/core';
import { deal } from '../engine/deal';
import { useGame } from '../state/gameStore';

export type DealStatus = 'loading' | 'empty' | 'error';

export function useDealHand(): DealStatus {
  const phase = useGame((s) => s.phase);
  const hand = useGame((s) => s.hand);
  const seed = useGame((s) => s.seed);
  const sites = useData((s) => s.sites);
  const dataError = useData((s) => s.status === 'error');
  const [emptySeed, setEmptySeed] = useState<number | null>(null);
  const [failedSeed, setFailedSeed] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== 'alert' || hand !== null || !sites) return;
    let cancelled = false;
    void Promise.all(sites.map((s) => loadTimeseries(s.id)))
      .then(() => {
        const game = useGame.getState();
        if (cancelled || game.phase !== 'alert' || game.hand !== null || game.seed !== seed) return;
        const data = useData.getState();
        const dealt = deal(sites, data.timeseries, seed);
        if (dealt) game.beginDealing(dealt);
        // loadTimeseries swallows fetch errors (it records them in timeseriesErrors): with no
        // hand, a failed series means a load problem, not "no valid mission".
        else if (sites.some((s) => data.timeseriesErrors[s.id])) setFailedSeed(seed);
        else setEmptySeed(seed);
      })
      .catch((err: unknown) => {
        // A series failed to load or deal() threw: show the load error, not "no valid mission".
        console.error('Mission deal failed', err);
        if (!cancelled) setFailedSeed(seed);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, hand, seed, sites]);

  if (dataError || failedSeed === seed) return 'error';
  return emptySeed === seed ? 'empty' : 'loading';
}
