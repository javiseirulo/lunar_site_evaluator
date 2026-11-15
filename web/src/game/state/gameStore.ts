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
import { mulberry32, nextSeed } from '../engine/random';
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

/** Phases with a game in progress (everything but the menu). */
export const IN_GAME_PHASES: readonly Phase[] = [
  'intro',
  'alert',
  'dealing',
  'choosing',
  'travel',
  'timelapse',
  'verdict',
  'timeout',
];

/** Optional run settings (from `?seed=…&skipIntro=1`, see `ui/gameParams.ts`). */
export interface GameConfig {
  /** Seed of the first game; later games follow `nextSeed`. null = seeds from the clock. */
  seed: number | null;
  /** `start()` goes straight to the alert. */
  skipIntro: boolean;
}

/** Time the player has to decide, in milliseconds. */
export const COUNTDOWN_MS = 180_000;

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  seed: number;
  emergencyId: string | null;
  hand: Hand | null;
  chosenSlot: number | null;
  /** Slot clicked during `choosing` whose pick animation is playing; locks out `timeUp`. */
  pendingSlot: number | null;
  /** Epoch ms at which the countdown ends. */
  deadline: number;
  config: GameConfig;

  setDifficulty: (d: Difficulty) => void;
  /** Replaces the run settings (and the difficulty if given). Only in the menu. */
  configure: (config: GameConfig, difficulty?: Difficulty | null) => void;
  /** menu → intro (→ alert straight away with `config.skipIntro`). */
  start: (seed?: number, now?: number) => void;
  /** intro → alert. */
  endIntro: (now?: number) => void;
  skipIntro: (now?: number) => void;
  /** alert → dealing (the caller has already dealt the hand). */
  beginDealing: (hand: Hand) => void;
  /** dealing → choosing. */
  revealed: () => void;
  /** During `choosing`: lock in a slot so the countdown can no longer expire. */
  pick: (slot: number) => void;
  /** choosing → travel. */
  choose: (slot: number) => void;
  /** travel → timelapse. */
  landed: () => void;
  /** timelapse → verdict. */
  finish: () => void;
  /** alert | dealing | choosing → timeout (ignored while a pick is pending). */
  timeUp: () => void;
  /** verdict | timeout → choosing, same hand, fresh deadline. */
  retry: (now?: number) => void;
  /** verdict | timeout → alert with a fresh seed. */
  newGame: (seed?: number, now?: number) => void;
  /** Any in-game phase → alert with a fresh seed and hand (the in-game "Restart mission"). */
  restart: (seed?: number, now?: number) => void;
  /** Any phase → menu, dropping the current hand (keeps difficulty). */
  quit: () => void;
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

  /** Seed for the next game: the configured sequence, or the clock. */
  const freshSeed = (): number => {
    const { config, seed } = get();
    return config.seed === null ? Date.now() : nextSeed(seed);
  };

  /** New hand from the alert, keeping difficulty and config. */
  const reset = (seed: number, now: number) => {
    set({ seed, hand: null, chosenSlot: null, pendingSlot: null });
    enterAlert(now);
  };

  return {
    phase: 'menu',
    difficulty: 'normal',
    seed: 0,
    emergencyId: null,
    hand: null,
    chosenSlot: null,
    pendingSlot: null,
    deadline: 0,
    config: { seed: null, skipIntro: false },

    setDifficulty: (difficulty) => set({ difficulty }),

    configure: (config, difficulty) => {
      if (get().phase !== 'menu') return;
      set(difficulty ? { config, difficulty } : { config });
    },

    start: (seed, now = Date.now()) => {
      const { phase, config } = get();
      if (phase !== 'menu') return;
      set({
        phase: 'intro',
        seed: seed ?? config.seed ?? Date.now(),
        emergencyId: null,
        hand: null,
        chosenSlot: null,
        pendingSlot: null,
      });
      if (config.skipIntro) enterAlert(now);
    },

    endIntro: (now = Date.now()) => leaveIntro(now),
    skipIntro: (now = Date.now()) => leaveIntro(now),

    beginDealing: (hand) => {
      if (get().phase === 'alert') set({ phase: 'dealing', hand });
    },

    revealed: () => {
      if (get().phase === 'dealing') set({ phase: 'choosing' });
    },

    pick: (slot) => {
      const { phase, pendingSlot } = get();
      if (phase === 'choosing' && pendingSlot === null) set({ pendingSlot: slot });
    },

    choose: (slot) => {
      if (get().phase === 'choosing') set({ phase: 'travel', chosenSlot: slot, pendingSlot: null });
    },

    landed: () => {
      if (get().phase === 'travel') set({ phase: 'timelapse' });
    },

    finish: () => {
      if (get().phase === 'timelapse') set({ phase: 'verdict' });
    },

    timeUp: () => {
      const { phase: p, pendingSlot } = get();
      if (pendingSlot !== null) return;
      if (p === 'alert' || p === 'dealing' || p === 'choosing') set({ phase: 'timeout' });
    },

    retry: (now = Date.now()) => {
      const { phase, hand } = get();
      if ((phase !== 'verdict' && phase !== 'timeout') || !hand) return;
      set({ phase: 'choosing', chosenSlot: null, pendingSlot: null, deadline: now + COUNTDOWN_MS });
    },

    newGame: (seed, now = Date.now()) => {
      const p = get().phase;
      if (p !== 'verdict' && p !== 'timeout') return;
      reset(seed ?? freshSeed(), now);
    },

    restart: (seed, now = Date.now()) => {
      if (!IN_GAME_PHASES.includes(get().phase)) return;
      reset(seed ?? freshSeed(), now);
    },

    quit: () =>
      set({ phase: 'menu', emergencyId: null, hand: null, chosenSlot: null, pendingSlot: null }),
  };
});
