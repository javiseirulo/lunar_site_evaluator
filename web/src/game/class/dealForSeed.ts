/**
 * One class question = one hand dealt from a random seed. Same pipeline as useDealHand (seeded
 * subset of South Pole sites, load only their series, deal), but standalone so the teacher can
 * prefetch the next question while the current one is open. Students never run this: they only
 * get the answers (slots 1-4), so their phones download nothing heavy.
 */
import { loadTimeseries, useData } from '@/core';
import { deal, MAX_DEAL_ATTEMPTS, pickSubset, southPoleSites, type Hand } from '../engine/deal';

export async function dealForSeed(seed: number): Promise<Hand | null> {
  const sites = useData.getState().sites;
  if (!sites) return null;
  const pool = southPoleSites(sites);
  for (let attempt = 0; attempt < MAX_DEAL_ATTEMPTS; attempt++) {
    const subset = pickSubset(pool, seed, attempt);
    await Promise.all(subset.map((s) => loadTimeseries(s.id)));
    const hand = deal(subset, useData.getState().timeseries, seed);
    if (hand) return hand;
    if (subset.length >= pool.length) break;
  }
  return null;
}
