import { describe, expect, it } from 'vitest';
import { IN_GAME_PHASES } from '../state/gameStore';
import { sharedSelectionFor, survivorsLine, verdictSummary } from './reveal';

describe('sharedSelectionFor', () => {
  it('never exposes a site before the verdict', () => {
    for (const phase of IN_GAME_PHASES) {
      if (phase === 'verdict' || phase === 'timeout') continue;
      expect(sharedSelectionFor(phase, 'shackleton_rim')).toBeNull();
    }
  });

  it('selects the chosen site at the verdict', () => {
    expect(sharedSelectionFor('verdict', 'shackleton_rim')).toBe('shackleton_rim');
    expect(sharedSelectionFor('verdict', null)).toBeUndefined();
  });

  it('leaves the selection alone in the menu and on timeout', () => {
    expect(sharedSelectionFor('menu', 'x')).toBeUndefined();
    expect(sharedSelectionFor('timeout', 'x')).toBeUndefined();
  });
});

describe('verdictSummary', () => {
  it('states the failing hour once, with the mission day', () => {
    expect(verdictSummary('Night lasted over 100 h', 100, 168, 7)).toBe(
      'Night lasted over 100 h. Failed at hour 100 of 168 (day 5).',
    );
  });

  it('handles touchdown, end-of-mission shortfalls and wins', () => {
    expect(verdictSummary('Slope 12.0° > 8° limit', 0, 168, 7)).toBe(
      'Slope 12.0° > 8° limit. Failed on touchdown.',
    );
    expect(verdictSummary('Sunlight 40% < 50% minimum', 167, 168, 7)).toBe(
      'Sunlight 40% < 50% minimum. Judged over the full 7-day mission.',
    );
    expect(verdictSummary('Mission complete: 90% sunlight', null, 168, 7)).toBe(
      'Mission complete: 90% sunlight.',
    );
  });

  it('survivorsLine names the winning landing sites', () => {
    const c = (slot: number, win: boolean) => ({ slot, verdict: { win } });
    expect(survivorsLine([c(1, false), c(2, true), c(3, false)])).toBe(
      'Landing site 2 would have survived.',
    );
    expect(survivorsLine([c(1, true), c(2, false), c(3, true), c(4, true)])).toBe(
      'Landing sites 1, 3 and 4 would have survived.',
    );
    expect(survivorsLine([c(1, false)])).toBeNull();
  });
});
