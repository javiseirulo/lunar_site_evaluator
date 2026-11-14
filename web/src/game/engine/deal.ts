import type { Site, Timeseries } from '@lunar/contracts';
import { DEFAULT_REQUIREMENTS, type MissionRequirements } from './requirements';
import { mulberry32, shuffle } from './random';
import { simulate, type Verdict } from './simulate';

export interface Card {
  /** 1-based position on the table after shuffling. */
  slot: number;
  siteId: string;
  verdict: Verdict;
}

export interface Hand {
  startIndex: number;
  landingUtc: string;
  cards: Card[];
}

/**
 * Deals `size` cards with at least one winner and one loser, for one shared
 * landing time. Returns null if no start has a winner plus enough losers.
 */
export function deal(
  sites: Site[],
  series: Record<string, Timeseries>,
  seed: number,
  req: MissionRequirements = DEFAULT_REQUIREMENTS,
  size = 4,
): Hand | null {
  const rnd = mulberry32(seed);
  const eligible = sites.filter((s) => series[s.id] !== undefined);
  if (eligible.length < size) return null;

  const hours = req.surface_days * 24;
  const length = Math.min(...eligible.map((s) => series[s.id]!.t_utc.length));
  const starts: number[] = [];
  for (let i = 0; i + hours <= length; i += 24) starts.push(i);

  for (const startIndex of shuffle(starts, rnd)) {
    const results = eligible.map((site) => ({
      siteId: site.id,
      verdict: simulate(site, series[site.id]!, startIndex, req),
    }));
    const winners = shuffle(
      results.filter((r) => r.verdict.win),
      rnd,
    );
    const losers = shuffle(
      results.filter((r) => !r.verdict.win),
      rnd,
    );
    if (winners.length < 1 || losers.length < size - 2) continue;

    const nWin = Math.min(winners.length, 1 + Math.floor(rnd() * 2), size - 1);
    const picked = winners.slice(0, nWin);

    // Fill with losers, preferring causes not yet in the hand.
    const pool = [...losers];
    const seen = new Set<string | null>();
    while (picked.length < size && pool.length > 0) {
      let idx = pool.findIndex((l) => !seen.has(l.verdict.cause));
      if (idx < 0) idx = 0;
      const [next] = pool.splice(idx, 1);
      seen.add(next!.verdict.cause);
      picked.push(next!);
    }
    if (picked.length < size) continue;

    const cards = shuffle(picked, rnd).map((p, i) => ({ slot: i + 1, ...p }));
    const landingUtc = series[cards[0]!.siteId]!.t_utc[startIndex]!;
    return { startIndex, landingUtc, cards };
  }
  return null;
}
