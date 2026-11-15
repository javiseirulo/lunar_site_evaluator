/**
 * Mission game store: the phase machine behind the "Mission" mini-game.
 *
 * Local to `web/src/game/`; it does NOT touch the shared app store. Illegal transitions are
 * silent no-ops. Actions that set the deadline accept an optional `now` (epoch ms) so tests
 * can control time. The decision clock starts when the cards are revealed (`revealed`), not
 * while the site data loads; it pauses while the exit dialog is open (`pause`/`resume`) and
 * while the descent animation plays (`heldAt`, from `choose` to `landed`).
 *
 * Order (#100): menu → intro → alert → briefing → approach → dealing → choosing → descent →
 * recon → timelapse → verdict (or timeout from `choosing` / `recon`). The hand is dealt in the
 * background during `alert` / `briefing` (`dealt`); `recon` can go back to `choosing`.
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
  | 'briefing'
  | 'approach'
  | 'dealing'
  | 'choosing'
  | 'descent'
  | 'recon'
  | 'timelapse'
  | 'verdict'
  | 'timeout';

/** Phases with a game in progress (everything but the menu). */
export const IN_GAME_PHASES: readonly Phase[] = [
  'intro',
  'alert',
  'briefing',
  'approach',
  'dealing',
  'choosing',
  'descent',
  'recon',
  'timelapse',
  'verdict',
  'timeout',
];

/** Phases in which the hand may be dealt (in the background, before the approach). */
export const DEAL_PHASES: readonly Phase[] = ['alert', 'briefing'];

/** Phases in which the countdown may run out. */
const TIMEOUT_PHASES: readonly Phase[] = ['choosing', 'recon'];

/** Optional run settings (from `?seed=…&skipIntro=1`, see `ui/gameParams.ts`). */
export interface GameConfig {
  /** Seed of the first game; later games follow `nextSeed`. null = seeds from the clock. */
  seed: number | null;
  /** `start()` goes straight to the alert. */
  skipIntro: boolean;
}

/** Time the player has to decide, in milliseconds. */
export const COUNTDOWN_MS = 60_000;

/** Length of the descent shot (globe dive to the chosen site), in milliseconds. */
export const DESCENT_MS = 3500;
/** The same with prefers-reduced-motion (the camera jumps, then holds briefly). */
export const DESCENT_REDUCED_MS = 600;

export interface GameState {
  phase: Phase;
  difficulty: Difficulty;
  seed: number;
  emergencyId: string | null;
  hand: Hand | null;
  chosenSlot: number | null;
  /** Slot clicked during `choosing` whose pick animation is playing; locks out `timeUp`. */
  pendingSlot: number | null;
  /** Epoch ms at which the countdown ends; 0 = the clock has not started (no cards yet). */
  deadline: number;
  /** Epoch ms at which the clock was paused (exit dialog open), or null while it runs. */
  pausedAt: number | null;
  /** Epoch ms at which the descent started (clock held until touchdown), or null. */
  heldAt: number | null;
  /** Increments on every new deal (each alert with a fresh hand): keys per-deal UI state. */
  dealId: number;
  config: GameConfig;

  setDifficulty: (d: Difficulty) => void;
  /** Replaces the run settings (and the difficulty if given). Only in the menu. */
  configure: (config: GameConfig, difficulty?: Difficulty | null) => void;
  /** menu → intro (→ alert straight away with `config.skipIntro`). */
  start: (seed?: number) => void;
  /** intro → alert. */
  endIntro: () => void;
  skipIntro: () => void;
  /** Stores the hand dealt in the background (only during `alert` / `briefing`, once). */
  dealt: (hand: Hand) => void;
  /** alert → briefing. */
  endAlert: () => void;
  /** briefing → approach (needs the hand: the approach shows its sites). */
  endBriefing: () => void;
  /** approach → dealing (the globe reached the pole). */
  approached: () => void;
  /** dealing → choosing; starts the decision clock. */
  revealed: (now?: number) => void;
  /** During `choosing`: lock in a slot so the countdown can no longer expire. */
  pick: (slot: number) => void;
  /** choosing → descent; holds the clock during the descent. */
  choose: (slot: number, now?: number) => void;
  /** descent → recon (touchdown); the clock runs again, the hold pushed the deadline back. */
  landed: (now?: number) => void;
  /** recon → choosing, same hand and clock, the choice cleared. */
  chooseAgain: () => void;
  /** recon → timelapse. */
  simulate: () => void;
  /** timelapse → verdict. */
  finish: () => void;
  /** choosing | recon → timeout (ignored while a pick is pending, the clock is paused or no hand). */
  timeUp: () => void;
  /** Freeze the decision clock (exit dialog open). */
  pause: (now?: number) => void;
  /** Unfreeze it, pushing the deadline back by the time it was paused. */
  resume: (now?: number) => void;
  /** verdict | timeout → choosing, same hand, fresh deadline. */
  retry: (now?: number) => void;
  /** verdict | timeout → alert with a fresh seed. */
  newGame: (seed?: number) => void;
  /** Any in-game phase → alert with a fresh seed and hand (the in-game "Restart mission"). */
  restart: (seed?: number) => void;
  /** Any phase → menu, dropping the current hand (keeps difficulty). */
  quit: () => void;
}

function pickEmergency(seed: number): string {
  // Decorrelated from deal()'s first draw on the same seed.
  const i = Math.floor(mulberry32((seed ^ 0xa5a5a5a5) >>> 0)() * emergencies.length);
  return emergencies[i]!.id;
}

export const useGame = create<GameState>()((set, get) => {
  const enterAlert = () =>
    set((s) => ({
      phase: 'alert',
      emergencyId: pickEmergency(s.seed),
      deadline: 0,
      pausedAt: null,
      heldAt: null,
      dealId: s.dealId + 1,
    }));

  const leaveIntro = () => {
    if (get().phase === 'intro') enterAlert();
  };

  /** Seed for the next game: the configured sequence, or the clock. */
  const freshSeed = (): number => {
    const { config, seed } = get();
    return config.seed === null ? Date.now() : nextSeed(seed);
  };

  /** New hand from the alert, keeping difficulty and config. */
  const reset = (seed: number) => {
    set({ seed, hand: null, chosenSlot: null, pendingSlot: null });
    enterAlert();
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
    pausedAt: null,
    heldAt: null,
    dealId: 0,
    config: { seed: null, skipIntro: false },

    setDifficulty: (difficulty) => set({ difficulty }),

    configure: (config, difficulty) => {
      if (get().phase !== 'menu') return;
      set(difficulty ? { config, difficulty } : { config });
    },

    start: (seed) => {
      const { phase, config } = get();
      if (phase !== 'menu') return;
      set({
        phase: 'intro',
        seed: seed ?? config.seed ?? Date.now(),
        emergencyId: null,
        hand: null,
        chosenSlot: null,
        pendingSlot: null,
        deadline: 0,
        pausedAt: null,
        heldAt: null,
      });
      if (config.skipIntro) enterAlert();
    },

    endIntro: () => leaveIntro(),
    skipIntro: () => leaveIntro(),

    dealt: (hand) => {
      const { phase, hand: current } = get();
      if (DEAL_PHASES.includes(phase) && current === null) set({ hand });
    },

    endAlert: () => {
      if (get().phase === 'alert') set({ phase: 'briefing' });
    },

    endBriefing: () => {
      const { phase, hand } = get();
      if (phase === 'briefing' && hand) set({ phase: 'approach' });
    },

    approached: () => {
      if (get().phase === 'approach') set({ phase: 'dealing' });
    },

    revealed: (now = Date.now()) => {
      const { phase, pausedAt } = get();
      if (phase !== 'dealing') return;
      // Revealed while paused: the paused time so far must not shorten the fresh clock.
      set({
        phase: 'choosing',
        deadline: now + COUNTDOWN_MS,
        pausedAt: pausedAt === null ? null : now,
      });
    },

    pick: (slot) => {
      const { phase, pendingSlot } = get();
      if (phase === 'choosing' && pendingSlot === null) set({ pendingSlot: slot });
    },

    choose: (slot, now = Date.now()) => {
      if (get().phase !== 'choosing') return;
      set({ phase: 'descent', chosenSlot: slot, pendingSlot: null, heldAt: now });
    },

    landed: (now = Date.now()) => {
      const { phase, heldAt, pausedAt, deadline } = get();
      if (phase !== 'descent') return;
      const held = heldAt === null ? 0 : Math.max(0, now - heldAt);
      set({
        phase: 'recon',
        heldAt: null,
        deadline: deadline === 0 ? 0 : deadline + held,
        // Exit dialog still open: its pause counts from now (the hold covered it so far).
        pausedAt: pausedAt === null ? null : now,
      });
    },

    chooseAgain: () => {
      if (get().phase === 'recon') set({ phase: 'choosing', chosenSlot: null, pendingSlot: null });
    },

    simulate: () => {
      if (get().phase === 'recon') set({ phase: 'timelapse' });
    },

    finish: () => {
      if (get().phase === 'timelapse') set({ phase: 'verdict' });
    },

    timeUp: () => {
      const { phase, pendingSlot, pausedAt, heldAt, hand, deadline } = get();
      if (pendingSlot !== null || pausedAt !== null || heldAt !== null) return;
      if (hand === null || deadline === 0) return;
      if (TIMEOUT_PHASES.includes(phase)) set({ phase: 'timeout' });
    },

    pause: (now = Date.now()) => {
      if (get().pausedAt === null) set({ pausedAt: now });
    },

    resume: (now = Date.now()) => {
      const { pausedAt, deadline, heldAt } = get();
      if (pausedAt === null) return;
      // During the descent the hold already covers the paused time: do not count it twice.
      const shift = heldAt !== null || deadline === 0 ? 0 : Math.max(0, now - pausedAt);
      set({ pausedAt: null, deadline: deadline + shift });
    },

    retry: (now = Date.now()) => {
      const { phase, hand } = get();
      if ((phase !== 'verdict' && phase !== 'timeout') || !hand) return;
      set({
        phase: 'choosing',
        chosenSlot: null,
        pendingSlot: null,
        deadline: now + COUNTDOWN_MS,
        pausedAt: null,
        heldAt: null,
      });
    },

    newGame: (seed) => {
      const p = get().phase;
      if (p !== 'verdict' && p !== 'timeout') return;
      reset(seed ?? freshSeed());
    },

    restart: (seed) => {
      if (!IN_GAME_PHASES.includes(get().phase)) return;
      reset(seed ?? freshSeed());
    },

    quit: () =>
      set({
        phase: 'menu',
        emergencyId: null,
        hand: null,
        chosenSlot: null,
        pendingSlot: null,
        deadline: 0,
        pausedAt: null,
        heldAt: null,
      }),
  };
});
