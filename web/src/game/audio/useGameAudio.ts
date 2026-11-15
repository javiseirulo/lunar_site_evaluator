/**
 * Binds the Mission audio to the game: unlocks the AudioContext on the first click/keypress in
 * the game, follows the mute/music prefs, suspends on a hidden tab and on unmount, plays the
 * phase-change effects (klaxon, engine burn, fanfare, …) and sets the music mood per phase.
 * UI clicks and hovers are delegated from `rootRef`: any <button> clicks, and elements marked
 * `data-sfx="hover"` tick on mouse hover.
 */
import { useEffect, type RefObject } from 'react';
import { DESCENT_MS, DESCENT_REDUCED_MS, useGame, type GameState } from '../state/gameStore';
import { deactivate, setHidden, setMuted, unlock } from './engine';
import { setMood, setMusicEnabled, startMusic, stopMusic } from './music';
import { useSoundPrefs } from './prefs';
import { sfx } from './sfx';
import { moodFor, rateLimiter } from './theory';

function chosenWin(s: GameState): boolean | null {
  const card = s.hand?.cards.find((c) => c.slot === s.chosenSlot);
  return card ? card.verdict.win : null;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function onPhase(s: GameState, prev: GameState) {
  if (s.phase !== prev.phase) {
    switch (s.phase) {
      case 'alert':
        sfx.klaxon();
        break;
      case 'descent': {
        // Seconds until touchdown (the globe dive's length).
        const reduced = prefersReducedMotion();
        const flight = (reduced ? DESCENT_REDUCED_MS : DESCENT_MS) / 1000;
        if (!reduced) sfx.whoosh(flight * 0.6);
        sfx.rumble(flight);
        sfx.thud(flight);
        break;
      }
      case 'verdict':
        if (chosenWin(s)) sfx.fanfare();
        break;
      case 'timeout':
        sfx.timeout();
        break;
    }
    setMood(moodFor(s.phase, chosenWin(s)));
  }
  if (s.pendingSlot !== null && prev.pendingSlot === null) sfx.lockIn();
}

export function useGameAudio(rootRef: RefObject<HTMLElement | null>): void {
  const muted = useSoundPrefs((s) => s.muted);
  const musicOn = useSoundPrefs((s) => s.musicOn);

  useEffect(() => setMuted(muted), [muted]);
  useEffect(() => setMusicEnabled(musicOn), [musicOn]);

  useEffect(() => {
    const root = rootRef.current;
    const gesture = () => unlock();
    const visibility = () => setHidden(document.visibilityState === 'hidden');
    const hoverGate = rateLimiter(70);
    const click = (e: Event) => {
      const el = e.target instanceof Element ? e.target.closest('button') : null;
      if (el && !el.disabled && !el.hasAttribute('data-sfx-silent')) sfx.click();
    };
    const hover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target instanceof Element ? e.target.closest('[data-sfx="hover"]') : null;
      // Only when the pointer enters the element, not when it moves between its children.
      if (!el || el.contains(e.relatedTarget as Node | null)) return;
      if (hoverGate(performance.now())) sfx.hover();
    };

    root?.addEventListener('pointerdown', gesture, true);
    root?.addEventListener('keydown', gesture, true);
    root?.addEventListener('click', click);
    root?.addEventListener('pointerover', hover);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    setMood(moodFor(useGame.getState().phase, chosenWin(useGame.getState())));
    startMusic();
    const unsub = useGame.subscribe(onPhase);

    return () => {
      unsub();
      root?.removeEventListener('pointerdown', gesture, true);
      root?.removeEventListener('keydown', gesture, true);
      root?.removeEventListener('click', click);
      root?.removeEventListener('pointerover', hover);
      document.removeEventListener('visibilitychange', visibility);
      stopMusic();
      deactivate();
    };
  }, [rootRef]);
}
