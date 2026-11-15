/** Sound preferences (mute, music on/off), persisted in localStorage (`mission.muted`). */
import { create } from 'zustand';
import { readPrefs, writePrefs, type SoundPrefs } from './theory';

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

interface PrefsState extends SoundPrefs {
  toggleMuted: () => void;
  toggleMusic: () => void;
}

export const useSoundPrefs = create<PrefsState>()((set, get) => {
  const save = (next: SoundPrefs) => {
    writePrefs(storage(), next);
    set(next);
  };
  return {
    ...readPrefs(storage()),
    toggleMuted: () => save({ muted: !get().muted, musicOn: get().musicOn }),
    toggleMusic: () => save({ muted: get().muted, musicOn: !get().musicOn }),
  };
});
