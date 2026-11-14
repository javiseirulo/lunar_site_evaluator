/**
 * The single shared app store (owner: Javi2).
 *
 * The four contract fields (selectedSiteId, currentTimeUTC, activeLayers, mode) are the
 * ONLY interface between web modules. Read them with selectors, change them with actions:
 *
 *   const siteId = useAppStore((s) => s.selectedSiteId);
 *   const selectSite = useAppStore((s) => s.selectSite);
 *
 * Outside React: useAppStore.getState().setTime(iso)
 */
import { create } from 'zustand';
import type { AppEvents, AppMode, LayersManifest } from '@lunar/contracts';

export const DEFAULT_TIME_UTC = '2027-01-01T00:00:00Z';

export interface AppState extends AppEvents {
  /** Per-layer opacity 0–1 (layer UI state, read by the map/globe when drawing). */
  layerOpacity: Record<string, number>;
  /** True once layer defaults from layers.json have been applied. */
  layersInitialised: boolean;
  /** Pro mode: technical names, UTC times, coordinates and fine layer controls. Off = student view. */
  proMode: boolean;

  selectSite: (id: string | null) => void;
  setTime: (isoUtc: string) => void;
  setMode: (mode: AppMode) => void;
  toggleLayer: (id: string) => void;
  setLayerActive: (id: string, active: boolean) => void;
  /** Move a layer within the draw order; +1 = up (drawn later, on top), -1 = down. */
  moveLayer: (id: string, direction: 1 | -1) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  initLayers: (manifest: LayersManifest) => void;
  setProMode: (on: boolean) => void;
}

const PRO_KEY = 'lse.proMode';
function readPro(): boolean {
  try {
    return globalThis.localStorage?.getItem(PRO_KEY) === '1';
  } catch {
    return false;
  }
}

export const useAppStore = create<AppState>()((set, get) => ({
  selectedSiteId: null,
  currentTimeUTC: DEFAULT_TIME_UTC,
  activeLayers: [],
  mode: 'explore',
  layerOpacity: {},
  layersInitialised: false,
  proMode: readPro(),

  selectSite: (id) => set({ selectedSiteId: id }),
  setTime: (isoUtc) => set({ currentTimeUTC: isoUtc }),
  setMode: (mode) => set({ mode }),

  toggleLayer: (id) => get().setLayerActive(id, !get().activeLayers.includes(id)),

  setLayerActive: (id, active) =>
    set((s) => {
      const isActive = s.activeLayers.includes(id);
      if (active === isActive) return s;
      return {
        activeLayers: active ? [...s.activeLayers, id] : s.activeLayers.filter((l) => l !== id),
      };
    }),

  moveLayer: (id, direction) =>
    set((s) => {
      const i = s.activeLayers.indexOf(id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= s.activeLayers.length) return s;
      const next = [...s.activeLayers];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return { activeLayers: next };
    }),

  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layerOpacity: { ...s.layerOpacity, [id]: Math.min(1, Math.max(0, opacity)) },
    })),

  setProMode: (on) => {
    try {
      globalThis.localStorage?.setItem(PRO_KEY, on ? '1' : '0');
    } catch {
      /* private mode: keep it in memory only */
    }
    set({ proMode: on });
  },

  initLayers: (manifest) =>
    set((s) => {
      if (s.layersInitialised) return s;
      return {
        layersInitialised: true,
        activeLayers: manifest.layers.filter((l) => l.default_visible).map((l) => l.id),
        layerOpacity: Object.fromEntries(manifest.layers.map((l) => [l.id, l.default_opacity])),
      };
    }),
}));
