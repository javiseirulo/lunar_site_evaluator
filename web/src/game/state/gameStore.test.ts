import { beforeEach, describe, expect, it } from 'vitest';
import { mulberry32, nextSeed } from '../engine/random';
import type { Hand } from '../engine/deal';
import emergencies from '../content/emergencies.json';
import { COUNTDOWN_MS, IN_GAME_PHASES, useGame } from './gameStore';

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
    g().endIntro();
    expect(g().phase).toBe('alert');
    expect(g().deadline).toBe(0); // the clock waits for the cards
    expect(COUNTDOWN_MS).toBe(180_000);
    g().beginDealing(hand);
    expect(g().phase).toBe('dealing');
    expect(g().deadline).toBe(0);
    g().revealed(1000);
    expect(g().phase).toBe('choosing');
    expect(g().deadline).toBe(1000 + COUNTDOWN_MS);
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
    useGame.getState().skipIntro();
    const s = useGame.getState();
    expect(s.phase).toBe('alert');
    const draw = mulberry32((7 ^ 0xa5a5a5a5) >>> 0)();
    expect(s.emergencyId).toBe(emergencies[Math.floor(draw * emergencies.length)]!.id);
    expect(s.deadline).toBe(0);
  });

  it('timeUp only works once the cards are revealed (choosing)', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().timeUp(); // data still loading: no hand, no clock
    expect(g().phase).toBe('alert');

    reset();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().timeUp();
    expect(g().phase).toBe('dealing');

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
    g().endIntro();
    g().beginDealing(hand);
    g().revealed(0);
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
    g().revealed();
    g().timeUp();
    expect(g().phase).toBe('timeout');
    g().retry(0);
    expect(g().phase).toBe('choosing');
    expect(g().hand).toBe(hand);
  });

  it('newGame changes the seed, clears hand and goes to alert', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().revealed();
    g().timeUp();
    const dealId = g().dealId;
    g().newGame(99);
    expect(g().phase).toBe('alert');
    expect(g().seed).toBe(99);
    expect(g().hand).toBeNull();
    expect(g().chosenSlot).toBeNull();
    expect(g().deadline).toBe(0);
    expect(g().dealId).toBe(dealId + 1);
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

  it('a pending pick blocks timeUp and still reaches travel', () => {
    const g = () => useGame.getState();
    useGame.setState({ phase: 'choosing', hand, deadline: 1 });
    g().pick(3);
    expect(g().pendingSlot).toBe(3);
    g().pick(1); // only the first pick counts
    expect(g().pendingSlot).toBe(3);
    g().timeUp();
    expect(g().phase).toBe('choosing');
    g().choose(3);
    expect(g().phase).toBe('travel');
    expect(g().chosenSlot).toBe(3);
    expect(g().pendingSlot).toBeNull();
  });

  it('pick is a no-op outside choosing, and retry clears a pending pick', () => {
    const g = () => useGame.getState();
    g().pick(2);
    expect(g().pendingSlot).toBeNull();
    useGame.setState({ phase: 'timeout', hand, pendingSlot: 2 });
    g().retry(0);
    expect(g().phase).toBe('choosing');
    expect(g().pendingSlot).toBeNull();
    g().timeUp();
    expect(g().phase).toBe('timeout');
  });

  it('quit returns to menu from any phase, dropping the hand but keeping difficulty', () => {
    useGame.setState({ phase: 'choosing', hand, chosenSlot: 2, difficulty: 'expert' });
    useGame.getState().quit();
    const s = useGame.getState();
    expect(s.phase).toBe('menu');
    expect(s.hand).toBeNull();
    expect(s.chosenSlot).toBeNull();
    expect(s.emergencyId).toBeNull();
    expect(s.difficulty).toBe('expert');
  });

  it('restart works from every in-game phase: fresh seed, no hand, no pick, alert', () => {
    for (const phase of IN_GAME_PHASES) {
      reset();
      useGame.setState({ phase, hand, chosenSlot: 2, pendingSlot: 3, seed: 1, pausedAt: 5 });
      useGame.getState().restart(42);
      const s = useGame.getState();
      expect(s.phase, phase).toBe('alert');
      expect(s.seed).toBe(42);
      expect(s.hand).toBeNull();
      expect(s.chosenSlot).toBeNull();
      expect(s.pendingSlot).toBeNull();
      expect(s.deadline).toBe(0);
      expect(s.pausedAt).toBeNull();
      expect(s.emergencyId).not.toBeNull();
    }
  });

  it('restart is a no-op in the menu', () => {
    useGame.getState().restart(42);
    expect(useGame.getState().phase).toBe('menu');
    expect(useGame.getState().seed).toBe(0);
  });

  it('restart keeps difficulty and config', () => {
    useGame.getState().configure({ seed: 5, skipIntro: false }, 'expert');
    useGame.getState().start();
    useGame.getState().restart();
    expect(useGame.getState().difficulty).toBe('expert');
    expect(useGame.getState().config.seed).toBe(5);
  });

  it('a configured seed makes the first game and the next ones deterministic', () => {
    const g = () => useGame.getState();
    g().configure({ seed: 1234, skipIntro: false });
    g().start();
    expect(g().seed).toBe(1234);
    useGame.setState({ phase: 'verdict' });
    g().newGame();
    expect(g().seed).toBe(nextSeed(1234));
    g().restart();
    expect(g().seed).toBe(nextSeed(nextSeed(1234)));
    // Back to the menu and start again: the same first seed.
    g().quit();
    g().start();
    expect(g().seed).toBe(1234);
  });

  it('skipIntro config makes start go straight to the alert', () => {
    useGame.getState().configure({ seed: null, skipIntro: true });
    useGame.getState().start(3);
    expect(useGame.getState().phase).toBe('alert');
    expect(useGame.getState().deadline).toBe(0);
  });

  it('without config, start keeps the intro; configure only works in the menu', () => {
    useGame.getState().start(3);
    expect(useGame.getState().phase).toBe('intro');
    useGame.getState().configure({ seed: 9, skipIntro: true }, 'expert');
    expect(useGame.getState().config).toEqual({ seed: null, skipIntro: false });
    expect(useGame.getState().difficulty).toBe('normal');
  });

  it('timeUp is ignored on a timeout screen reached without a hand, and retry stays a no-op', () => {
    useGame.setState({ phase: 'choosing', hand: null, deadline: 1 });
    useGame.getState().timeUp();
    expect(useGame.getState().phase).toBe('choosing');
  });

  it('pause freezes the clock: timeUp is ignored and resume shifts the deadline', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().beginDealing(hand);
    g().revealed(1000);
    g().pause(5000);
    expect(g().pausedAt).toBe(5000);
    g().pause(6000); // a second pause keeps the first timestamp
    expect(g().pausedAt).toBe(5000);
    g().timeUp();
    expect(g().phase).toBe('choosing');
    g().resume(65_000);
    expect(g().pausedAt).toBeNull();
    expect(g().deadline).toBe(1000 + COUNTDOWN_MS + 60_000);
    g().resume(70_000); // not paused: no-op
    expect(g().deadline).toBe(1000 + COUNTDOWN_MS + 60_000);
  });

  it('a pause before the cards are revealed does not eat into the clock', () => {
    const g = () => useGame.getState();
    g().start(1);
    g().endIntro();
    g().pause(100);
    g().resume(200);
    expect(g().deadline).toBe(0);
    g().beginDealing(hand);
    g().pause(300);
    g().revealed(1000); // revealed under the dialog
    g().resume(4000);
    expect(g().deadline).toBe(1000 + COUNTDOWN_MS + 3000);
  });

  it('every new alert gets a new dealId (quit + start with the same seed included)', () => {
    const g = () => useGame.getState();
    g().configure({ seed: 5, skipIntro: true });
    g().start();
    const first = g().dealId;
    g().quit();
    g().start();
    expect(g().seed).toBe(5);
    expect(g().dealId).toBe(first + 1);
  });
});
