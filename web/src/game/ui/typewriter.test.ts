import { describe, expect, it } from 'vitest';
import intro from '../content/intro.json';
import { SCIENTIST_PALETTE, SCIENTIST_PIXELS } from './pixelScientistArt';
import { TYPE_CPS, advanceAction, charsShown, isAdvanceKey, typingMs } from './typewriter';

describe('charsShown', () => {
  it('types at TYPE_CPS characters per second', () => {
    expect(TYPE_CPS).toBe(35);
    expect(charsShown(0, 100)).toBe(0);
    expect(charsShown(1000, 100)).toBe(35);
    expect(charsShown(2000, 100)).toBe(70);
    expect(charsShown(1000 / 35 - 1, 100)).toBe(0);
    expect(charsShown(1000 / 35 + 1, 100)).toBe(1);
  });

  it('never exceeds the line length and handles bad input', () => {
    expect(charsShown(60_000, 12)).toBe(12);
    expect(charsShown(-50, 12)).toBe(0);
    expect(charsShown(Number.NaN, 12)).toBe(0);
    expect(charsShown(1000, 0)).toBe(0);
  });

  it('shows the whole line exactly after typingMs', () => {
    for (const len of [1, 7, 35, 120]) {
      expect(charsShown(typingMs(len), len)).toBe(len);
      expect(charsShown(typingMs(len) - 30, len)).toBeLessThan(len);
    }
  });
});

describe('advanceAction', () => {
  it('completes a line that is still typing', () => {
    expect(advanceAction(0, 3, 10, 2)).toBe('complete');
    expect(advanceAction(1, 0, 10, 2)).toBe('complete');
  });

  it('goes to the next line, then ends after the last one', () => {
    expect(advanceAction(0, 10, 10, 2)).toBe('next');
    expect(advanceAction(1, 10, 10, 2)).toBe('done');
    expect(advanceAction(0, 0, 0, 1)).toBe('done');
  });
});

describe('isAdvanceKey', () => {
  it('accepts Enter and Space only', () => {
    expect(isAdvanceKey('Enter')).toBe(true);
    expect(isAdvanceKey(' ')).toBe(true);
    expect(isAdvanceKey('Escape')).toBe(false);
    expect(isAdvanceKey('a')).toBe(false);
  });
});

describe('intro content', () => {
  it('has a speaker and non-empty lines', () => {
    expect(intro.speaker).toBe('Dr. Regolith');
    expect(intro.lines.length).toBeGreaterThan(0);
    for (const line of intro.lines) expect(line.trim().length).toBeGreaterThan(0);
  });
});

describe('pixel scientist art', () => {
  it('is a 16×16 grid that only uses palette colours', () => {
    expect(SCIENTIST_PIXELS).toHaveLength(16);
    for (const row of SCIENTIST_PIXELS) {
      expect(row).toHaveLength(16);
      for (const ch of row) expect(ch === '.' || ch in SCIENTIST_PALETTE).toBe(true);
    }
  });
});
