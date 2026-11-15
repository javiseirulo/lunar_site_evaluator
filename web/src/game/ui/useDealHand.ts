/**
 * Deals the hand while the game is in `alert` with no hand. A year of hourly data is ~500 KB per
 * site, so it does not load every series: it picks a seeded subset of South Pole sites
 * (`pickSubset`), loads only their timeseries and runs `deal()` on them; if that subset has no
 * valid hand it tries another one, up to `MAX_DEAL_ATTEMPTS`. Safe against StrictMode double
 * effects and against results that arrive after the phase or seed changed.
 */
import { useEffect, useState } from 'react';
import { loadTimeseries, useData } from '@/core';
import { deal, MAX_DEAL_ATTEMPTS, pickSubset, southPoleSites } from '../engine/deal';
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
    const stale = (): boolean => {
      const game = useGame.getState();
      return cancelled || game.phase !== 'alert' || game.hand !== null || game.seed !== seed;
    };
    const pool = southPoleSites(sites);

    const run = async (): Promise<void> => {
      let loadFailed = false;
      for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt++) {
        const subset = pickSubset(pool, seed, attempt);
        await Promise.all(subset.map((s) => loadTimeseries(s.id)));
        if (stale()) return;
        const data = useData.getState();
        // deal() skips sites whose series failed; remember failures to report a load error.
        loadFailed ||= subset.some((s) => data.timeseriesErrors[s.id]);
        const dealt = deal(subset, data.timeseries, seed);
        if (dealt) {
          useGame.getState().beginDealing(dealt);
          return;
        }
        if (subset.length >= pool.length) break; // every site already tried
      }
      // loadTimeseries swallows fetch errors (it records them in timeseriesErrors): with no
      // hand, a failed series means a load problem, not "no valid mission".
      if (loadFailed) setFailedSeed(seed);
      else setEmptySeed(seed);
    };

    run().catch((err: unknown) => {
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
