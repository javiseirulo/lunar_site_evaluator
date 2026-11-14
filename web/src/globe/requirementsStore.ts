/**
 * Explore mission requirements — owner: Marta (src/globe). Local state, not shared.
 * Everything starts empty: no requirement → no candidate sites (custom pins still show).
 */
import { create } from 'zustand';
import type { RequirementField, Requirements, SortBy, WindowInput } from './missionStats';

interface RequirementsState {
  /** Requirement fields the user added, in the order they were added (may still be empty). */
  added: RequirementField[];
  req: Requirements;
  window: WindowInput;
  sortBy: SortBy;
  showNonMatching: boolean;

  addField: (field: RequirementField) => void;
  removeField: (field: RequirementField) => void;
  setValue: (field: RequirementField, value: number | undefined) => void;
  setWindow: (patch: Partial<WindowInput>) => void;
  setSortBy: (sortBy: SortBy) => void;
  setShowNonMatching: (on: boolean) => void;
  clearAll: () => void;
}

const EMPTY_WINDOW: WindowInput = { startUtc: null, durationDays: null };

export const useRequirements = create<RequirementsState>()((set) => ({
  added: [],
  req: {},
  window: EMPTY_WINDOW,
  sortBy: 'battery_margin',
  showNonMatching: false,

  addField: (field) => set((s) => (s.added.includes(field) ? s : { added: [...s.added, field] })),
  removeField: (field) =>
    set((s) => {
      const req = { ...s.req };
      delete req[field];
      return { added: s.added.filter((f) => f !== field), req };
    }),
  setValue: (field, value) =>
    set((s) => {
      const req = { ...s.req };
      if (value === undefined || !Number.isFinite(value)) delete req[field];
      else req[field] = value;
      return { req };
    }),
  setWindow: (patch) => set((s) => ({ window: { ...s.window, ...patch } })),
  setSortBy: (sortBy) => set({ sortBy }),
  setShowNonMatching: (showNonMatching) => set({ showNonMatching }),
  clearAll: () => set({ added: [], req: {}, window: EMPTY_WINDOW }),
}));
