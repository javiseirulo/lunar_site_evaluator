import { describe, expect, it } from 'vitest';
import type { Card } from '../engine/deal';
import { bestSlot, buildBoard, countVotes, pointsFor, rankOf } from './scoring';
import { generateToken } from './scoring';
import { normalizeToken, TOKEN_LENGTH } from './token';

const card = (slot: number, win: boolean, score: number): Card =>
  ({ slot, siteId: `s${slot}`, verdict: { win, score } }) as unknown as Card;

describe('pointsFor', () => {
  it('gives 1000 instantly, 500 at the buzzer, 0 when wrong', () => {
    expect(pointsFor(true, 0)).toBe(1000);
    expect(pointsFor(true, 180_000)).toBe(500);
    expect(pointsFor(true, 999_999)).toBe(500);
    expect(pointsFor(false, 0)).toBe(0);
  });
});

describe('bestSlot', () => {
  it('picks the winner with the highest score', () => {
    expect(
      bestSlot([card(1, false, 0.9), card(2, true, 0.4), card(3, true, 0.7), card(4, false, 0)]),
    ).toBe(3);
  });
  it('breaks ties by lowest slot', () => {
    expect(bestSlot([card(1, true, 0.5), card(2, true, 0.5)])).toBe(1);
  });
});

describe('votes and board', () => {
  it('counts votes per slot and ignores out-of-range choices', () => {
    expect(
      countVotes({
        a: { choice: 1, t: 0 },
        b: { choice: 3, t: 0 },
        c: { choice: 3, t: 0 },
        d: { choice: 9, t: 0 },
      }),
    ).toEqual([1, 0, 2, 0]);
  });
  it('ranks by score then name', () => {
    const board = buildBoard(
      { a: { name: 'Zed' }, b: { name: 'Amy' }, c: { name: 'Bo' } },
      { a: 900, b: 900, c: 100 },
    );
    expect(board.map((r) => r.sid)).toEqual(['b', 'a', 'c']);
    expect(rankOf(board, 'c')).toBe(3);
    expect(rankOf(board, 'x')).toBeNull();
  });
});

describe('tokens', () => {
  it('generates tokens that normalize to themselves', () => {
    const t = generateToken();
    expect(t).toHaveLength(TOKEN_LENGTH);
    expect(normalizeToken(t.toLowerCase())).toBe(t);
  });
  it('rejects short or malformed input', () => {
    expect(normalizeToken('ab')).toBeNull();
    expect(normalizeToken('')).toBeNull();
  });
});
