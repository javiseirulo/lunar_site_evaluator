/**
 * Which of the user's own pins is selected on the globe — owner: Marta (src/globe).
 * GlobeCanvas writes it (the focus is local state there); the right-hand card (SiteDetail) reads it,
 * so a clicked pin shows its statistics next to the globe, like the catalogue sites do.
 */
import { create } from 'zustand';

interface PinSelectionState {
  pinId: string | null;
  setPinId: (id: string | null) => void;
}

export const usePinSelection = create<PinSelectionState>()((set) => ({
  pinId: null,
  setPinId: (pinId) => set({ pinId }),
}));
