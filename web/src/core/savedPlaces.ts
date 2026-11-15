/**
 * Saved places shared by the globe and Street View through core.
 * Marta's storage key, IDs and pin shape are preserved. Saving a place never
 * changes scientific site identity or synthesizes terrain metrics.
 * Saved in localStorage as a per-browser convenience; works without it.
 */
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { validMoonPoint } from './surfaceNavigation';

export interface CustomPin {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface CustomPinsState {
  pins: CustomPin[];
  addPin: (pin: Omit<CustomPin, 'id' | 'name'> & { name?: string }) => CustomPin;
  removePin: (id: string) => void;
}

/** localStorage that never throws (private mode, blocked storage, tests). */
const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* not persisted: fine */
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

let counter = 0;

export const useCustomPins = create<CustomPinsState>()(
  persist(
    (set, get) => ({
      pins: [],
      addPin: ({ lat, lon, name }) => {
        if (!validMoonPoint({ lat, lon })) throw new RangeError('Invalid lunar coordinates');
        const n = get().pins.length + 1;
        const pin: CustomPin = {
          id: `custom-${Date.now().toString(36)}-${counter++}`,
          name: name?.trim().slice(0, 80) || `Custom pin ${n}`,
          lat,
          lon,
        };
        set((s) => ({ pins: [...s.pins, pin] }));
        return pin;
      },
      removePin: (id) => set((s) => ({ pins: s.pins.filter((p) => p.id !== id) })),
    }),
    {
      name: 'lunar-globe-custom-pins',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ pins: s.pins }),
    },
  ),
);
