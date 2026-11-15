import { describe, expect, it } from 'vitest';
import { nextSeed } from '../engine/random';
import { parseGameParams } from './gameParams';

describe('parseGameParams', () => {
  it('no params: no change of behaviour', () => {
    expect(parseGameParams('')).toEqual({ seed: null, skipIntro: false, difficulty: null });
    expect(parseGameParams('?foo=bar')).toEqual({ seed: null, skipIntro: false, difficulty: null });
  });

  it('reads seed, skipIntro and difficulty', () => {
    expect(parseGameParams('?seed=42&skipIntro=1&difficulty=expert')).toEqual({
      seed: 42,
      skipIntro: true,
      difficulty: 'expert',
    });
    expect(parseGameParams('seed=0&skipIntro=true&difficulty=Normal')).toEqual({
      seed: 0,
      skipIntro: true,
      difficulty: 'normal',
    });
  });

  it('ignores invalid values', () => {
    for (const s of ['abc', '-1', '1.5', '1e3', '', '4294967296', '99999999999']) {
      expect(parseGameParams(`?seed=${s}`).seed, s).toBeNull();
    }
    expect(parseGameParams('?seed=4294967295').seed).toBe(4294967295);
    expect(parseGameParams('?skipIntro=0').skipIntro).toBe(false);
    expect(parseGameParams('?difficulty=hard').difficulty).toBeNull();
  });
});

describe('nextSeed', () => {
  it('is deterministic, uint32 and moves on', () => {
    expect(nextSeed(7)).toBe(nextSeed(7));
    expect(nextSeed(7)).not.toBe(7);
    expect(nextSeed(7)).not.toBe(nextSeed(8));
    const s = nextSeed(123);
    expect(Number.isInteger(s) && s >= 0 && s <= 4294967295).toBe(true);
  });
});
