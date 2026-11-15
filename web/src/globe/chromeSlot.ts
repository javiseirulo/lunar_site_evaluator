/**
 * Where the globe puts its on-map controls (coordinates, Layers, astronaut) — owner: Marta (src/globe).
 * A page whose panels cover the globe (Explore) registers the free area between its panels; the
 * globe portals its controls there so they sit in the corners of the visible map. With no slot the
 * controls stay positioned over the whole globe, as before.
 */
import { create } from 'zustand';

interface ChromeSlotState {
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
}

export const useChromeSlot = create<ChromeSlotState>()((set) => ({
  slot: null,
  setSlot: (slot) => set({ slot }),
}));
