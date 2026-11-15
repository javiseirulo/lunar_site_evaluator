import type { Card } from '../engine/deal';
import { generateToken } from './token';
import type { Answer, BoardRow } from './types';

export { generateToken };

/** Time each question is open (the mission's 3-minute decision window). */
export const QUESTION_MS = 180_000;

/** Kahoot-style points: 1000 for an instant right answer down to 500 at the buzzer, 0 if wrong. */
export function pointsFor(correct: boolean, elapsedMs: number, limitMs = QUESTION_MS): number {
  if (!correct) return 0;
  const f = Math.min(1, Math.max(0, elapsedMs / limitMs));
  return Math.round(1000 * (1 - f / 2));
}

/**
 * The best card of a hand: the winning card with the highest mission score (lowest slot on a
 * tie). deal() guarantees a winner; the first card is only a defensive fallback.
 */
export function bestSlot(cards: readonly Card[]): number {
  let best: Card | undefined;
  for (const c of cards) {
    if (!c.verdict.win) continue;
    if (!best || c.verdict.score > best.verdict.score) best = c;
  }
  return (best ?? cards[0])?.slot ?? 1;
}

/** Votes per slot (index 0 = slot 1) among `slots` choices; answers for unknown slots are ignored. */
export function countVotes(answers: Record<string, Answer>, slots = 4): number[] {
  const counts = new Array<number>(slots).fill(0);
  for (const a of Object.values(answers)) {
    if (a.choice >= 1 && a.choice <= slots) counts[a.choice - 1]! += 1;
  }
  return counts;
}

/** Ranking, best first. Ties keep the name order so the board is stable between refreshes. */
export function buildBoard(
  players: Record<string, { name: string }>,
  totals: Record<string, number>,
): BoardRow[] {
  return Object.entries(players)
    .map(([sid, p]) => ({ sid, name: p.name, score: totals[sid] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** 1-based rank of `sid`, or null if it is not on the board. */
export function rankOf(board: readonly BoardRow[], sid: string): number | null {
  const i = board.findIndex((r) => r.sid === sid);
  return i < 0 ? null : i + 1;
}
