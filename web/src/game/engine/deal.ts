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

/** Sites the South Pole mode plays with (historic and other regions are for later modes). */
export function southPoleSites(sites: readonly Site[]): Site[] {
  return sites.filter((s) => s.region === 'south_pole');
}

/** How many sites' timeseries the game loads per deal attempt (each one is ~500 KB for a year). */
export const SUBSET_SIZE = 12;
/** Deal attempts (each with a fresh subset) before reporting "no valid mission". */
export const MAX_DEAL_ATTEMPTS = 3;
/** Landing starts simulated per deal, sampled from the daily starts of the series. */
export const MAX_STARTS = 40;

/**
 * Seeded random subset of `size` sites (all of them if there are fewer). `attempt` gives a
 * different, still deterministic, subset for the same seed.
 */
export function pickSubset<T>(
  sites: readonly T[],
  seed: number,
  attempt = 0,
  size = SUBSET_SIZE,
): T[] {
  // Mix the attempt into the seed so attempts are independent streams.
  const rnd = mulberry32((seed ^ Math.imul(attempt + 1, 0x9e3779b1)) >>> 0);
  return shuffle([...sites], rnd).slice(0, size);
}

/**
 * Up to `max` distinct landing starts (multiples of 24 h) whose `hours`-long window fits in a
 * series of `length` samples, in seeded random order.
 */
export function sampleStarts(
  length: number,
  hours: number,
  rnd: () => number,
  max = MAX_STARTS,
): number[] {
  const starts: number[] = [];
  for (let i = 0; i + hours <= length; i += 24) starts.push(i);
  return shuffle(starts, rnd).slice(0, max);
}

/**
 * Deals `size` cards with at least one winner and one loser, for one shared landing time.
 * Simulates at most `maxStarts` sampled starts; prefers a hand whose losers fail for different
 * reasons, otherwise the first valid one. Returns null if no sampled start has a winner plus
 * enough losers. Deterministic for a given seed.
 */
export function deal(
  sites: Site[],
  series: Record<string, Timeseries>,
  seed: number,
  req: MissionRequirements = DEFAULT_REQUIREMENTS,
  size = 4,
  maxStarts = MAX_STARTS,
): Hand | null {
  const rnd = mulberry32(seed);
  const eligible = sites.filter((s) => series[s.id] !== undefined);
  if (eligible.length < size) return null;

  const hours = req.surface_days * 24;
  const length = Math.min(...eligible.map((s) => series[s.id]!.t_utc.length));
  let fallback: Hand | null = null;

  for (const startIndex of sampleStarts(length, hours, rnd, maxStarts)) {
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

    // Rolled 1 or 2 winners, but more when there are too few losers to fill the hand.
    const rolled = 1 + Math.floor(rnd() * 2);
    const nWin = Math.min(winners.length, size - 1, Math.max(rolled, size - losers.length));
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
    const hand: Hand = { startIndex, landingUtc, cards };
    const lossCauses = new Set(cards.filter((c) => !c.verdict.win).map((c) => c.verdict.cause));
    if (lossCauses.size >= 2) return hand;
    fallback ??= hand;
  }
  return fallback;
}
