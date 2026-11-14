import { beforeEach, describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/random';
import type { Hand } from '../engine/deal';
import emergencies from '../content/emergencies.json';
import { COUNTDOWN_MS, useGame } from './gameStore';

const hand: Hand = { startIndex: 0, landingUtc: '2027-01-01T00:00:00Z', cards: [] };

function reset() {
  useGame.setState(useGame.getInitialState(), true);
}

describe('useGame phase machine', () => {
  beforeEach(reset);

  it('starts in menu with normal difficulty', () => {
    expect(useGame.getState().phase).toBe('menu');
    expect(useGame.getState().difficulty).toBe('normal');
  });

  it('ignores illegal transitions', () => {
    useGame.getState().choose(2);
    expect(useGame.getState().phase).toBe('menu');
    useGame.getState().revealed();
    useGame.getState().landed();
    useGame.getState().finish();
    useGame.getState().retry();
    expect(useGame.getState().phase).toBe('menu');
  });

  it('walks the happy path', () => {
    const g = () => useGame.getState();
    g().start(7);
    expect(g().phase).toBe('intro');
    g().endIntro(1000);
    expect(g().phase).toBe('alert');
    expect(g().deadline).toBe(1000 + COUNTDOWN_MS);
    expect(COUNTDOWN_MS).toBe(180_000);
    g().beginDealing(hand);
    expect(g().phase).toBe('dealing');
    g().revealed();
    expect(g().phase).toBe('choosing');
    g().choose(3);
    expect(g().phase).toBe('travel');
    expect(g().chosenSlot).toBe(3);
    g().landed();
    expect(g().phase).toBe('timelapse');
    g().finish();
    expect(g().phase).toBe('verdict');
  });

  it('skipIntro also goes to alert with emergency and deadline', () => {
    useGame.getState().start(7);
    useGame.getState().skipIntro(0);
    const s = useGame.getState();
    expect(s.phase).toBe('alert');
    expect(s.emergencyId).toBe(emergencies[Math.floor(mulberry32(7)() * emergencies.length)]!.id);
    expect(s.deadline).toBe(COUNTDOWN_MS);
  });

  it('timeUp works from alert, dealing, choosing only', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().timeUp();
    expect(g().phase).toBe('timeout');

    reset();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().timeUp();
    expect(g().phase).toBe('timeout');

    reset();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().revealed();
    g().timeUp();
    expect(g().phase).toBe('timeout');

    reset();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().revealed();
    g().choose(0);
    g().landed();
    g().timeUp();
    expect(g().phase).toBe('timelapse');
  });

  it('retry keeps the hand, clears the choice, resets the deadline', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro(0);
    g().beginDealing(hand);
    g().revealed();
    g().choose(1);
    g().landed();
    g().finish();
    g().retry(5000);
    expect(g().phase).toBe('choosing');
    expect(g().hand).toBe(hand);
    expect(g().chosenSlot).toBeNull();
    expect(g().deadline).toBe(5000 + COUNTDOWN_MS);
  });

  it('retry works from timeout', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().timeUp();
    g().retry(0);
    expect(g().phase).toBe('choosing');
    expect(g().hand).toBe(hand);
  });

  it('newGame changes the seed, clears hand and goes to alert', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().timeUp();
    g().newGame(99, 0);
    expect(g().phase).toBe('alert');
    expect(g().seed).toBe(99);
    expect(g().hand).toBeNull();
    expect(g().chosenSlot).toBeNull();
    expect(g().deadline).toBe(COUNTDOWN_MS);
  });

  it('newGame is a no-op outside verdict/timeout', () => {
    useGame.getState().newGame(5);
    expect(useGame.getState().phase).toBe('menu');
  });

  it('endIntro/skipIntro are no-ops outside intro', () => {
    useGame.getState().endIntro();
    useGame.getState().skipIntro();
    expect(useGame.getState().phase).toBe('menu');
  });

  it('retry is a no-op when there is no hand', () => {
    useGame.setState({ phase: 'timeout', hand: null });
    useGame.getState().retry();
    expect(useGame.getState().phase).toBe('timeout');
  });

  it('setDifficulty updates difficulty', () => {
    useGame.getState().setDifficulty('expert');
    expect(useGame.getState().difficulty).toBe('expert');
  });
});
