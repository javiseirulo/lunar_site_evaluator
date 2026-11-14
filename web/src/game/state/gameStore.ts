/**
 * Mission game store: the phase machine behind the "Mission" mini-game.
 *
 * Local to `web/src/game/`; it does NOT touch the shared app store. Illegal transitions are
 * silent no-ops. Actions that set the deadline accept an optional `now` (epoch ms) so tests
 * can control time.
 *
 *   const phase = useGame((s) => s.phase);
 *   useGame.getState().start();
 */
import { create } from 'zustand';
import type { Difficulty } from '../engine/bars';
import type { Hand } from '../engine/deal';
import { mulberry32 } from '../engine/random';
import emergencies from '../content/emergencies.json';

export type Phase =
  | 'menu'
  | 'intro'
  | 'alert'
  | 'dealing'
  | 'choosing'
  | 'travel'
  | 'timelapse'
  | 'verdict'
  | 'timeout';

/** Time the player has to decide, in milliseconds. */
export const COUNTDOWN_MS = 180_000;

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  seed: number;
  emergencyId: string | null;
  hand: Hand | null;
  chosenSlot: number | null;
  /** Epoch ms at which the countdown ends. */
  deadline: number;

  setDifficulty: (d: Difficulty) => void;
  /** menu → intro. */
  start: (seed?: number) => void;
  /** intro → alert. */
  endIntro: (now?: number) => void;
  skipIntro: (now?: number) => void;
  /** alert → dealing (the caller has already dealt the hand). */
  beginDealing: (hand: Hand) => void;
  /** dealing → choosing. */
  revealed: () => void;
  /** choosing → travel. */
  choose: (slot: number) => void;
  /** travel → timelapse. */
  landed: () => void;
  /** timelapse → verdict. */
  finish: () => void;
  /** alert | dealing | choosing → timeout. */
  timeUp: () => void;
  /** verdict | timeout → choosing, same hand, fresh deadline. */
  retry: (now?: number) => void;
  /** verdict | timeout → alert with a fresh seed. */
  newGame: (seed?: number, now?: number) => void;
}

function pickEmergency(seed: number): string {
  const i = Math.floor(mulberry32(seed)() * emergencies.length);
  return emergencies[i]!.id;
}

export const useGame = create<GameState>()((set, get) => {
  const enterAlert = (now: number) =>
    set((s) => ({
      phase: 'alert',
      emergencyId: pickEmergency(s.seed),
      deadline: now + COUNTDOWN_MS,
    }));

  const leaveIntro = (now: number) => {
    if (get().phase === 'intro') enterAlert(now);
  };

  return {
    phase: 'menu',
    difficulty: 'normal',
    seed: 0,
    emergencyId: null,
    hand: null,
    chosenSlot: null,
    deadline: 0,

    setDifficulty: (difficulty) => set({ difficulty }),

    start: (seed = Date.now()) => {
      if (get().phase !== 'menu') return;
      set({ phase: 'intro', seed, emergencyId: null, hand: null, chosenSlot: null });
    },

    endIntro: (now = Date.now()) => leaveIntro(now),
    skipIntro: (now = Date.now()) => leaveIntro(now),

    beginDealing: (hand) => {
      if (get().phase === 'alert') set({ phase: 'dealing', hand });
    },

    revealed: () => {
      if (get().phase === 'dealing') set({ phase: 'choosing' });
    },

    choose: (slot) => {
      if (get().phase === 'choosing') set({ phase: 'travel', chosenSlot: slot });
    },

    landed: () => {
      if (get().phase === 'travel') set({ phase: 'timelapse' });
    },

    finish: () => {
      if (get().phase === 'timelapse') set({ phase: 'verdict' });
    },

    timeUp: () => {
      const p = get().phase;
      if (p === 'alert' || p === 'dealing' || p === 'choosing') set({ phase: 'timeout' });
    },

    retry: (now = Date.now()) => {
      const { phase, hand } = get();
      if ((phase !== 'verdict' && phase !== 'timeout') || !hand) return;
      set({ phase: 'choosing', chosenSlot: null, deadline: now + COUNTDOWN_MS });
    },

    newGame: (seed = Date.now(), now = Date.now()) => {
      const p = get().phase;
      if (p !== 'verdict' && p !== 'timeout') return;
      set({ seed, hand: null, chosenSlot: null });
      enterAlert(now);
    },
  };
});
