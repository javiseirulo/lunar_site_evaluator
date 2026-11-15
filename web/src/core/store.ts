/**
 * The single shared app store (owner: Javi).
 *
 * Modules share the contract state (selection, optional free point, UTC, layers,
 * mode and mission configuration). Read selectors and change it through actions:
 *
 *   const siteId = useAppStore((s) => s.selectedSiteId);
 *   const selectSite = useAppStore((s) => s.selectSite);
 *
 * Outside React: useAppStore.getState().setTime(iso)
 */
import { create } from 'zustand';
import type { AppEvents, AppMode, LayersManifest, MissionConfig } from '@lunar/contracts';
import { DEFAULT_MISSION_CONFIG } from '@/scoring/defaults';

export const DEFAULT_TIME_UTC = '2027-01-01T00:00:00Z';

/** What the user picked: a catalogue site, or a free ground point (lat/lon). `name` is for display. */
export type SelectionTarget =
  | { kind: 'site'; id: string; name: string }
  | { kind: 'point'; lat: number; lon: number; name: string };

/** A switch waiting for "End simulation?". `after` runs once the selection is applied. */
export interface PendingSelection {
  target: SelectionTarget;
  after?: () => void;
}

export interface AppState extends AppEvents {
  /** Internal intent counter: late data loading must not replace a chosen time. */
  timeRevision: number;
  selectedPoint: { lat: number; lon: number } | null;
  /**
   * Normal mode: true once Simulate was pressed for the current selection. Reset to false whenever
   * the selected site or free point changes (not when the same selection is set again).
   */
  simulationStarted: boolean;
  setSimulationStarted: (started: boolean) => void;
  /** A site/point switch the user must confirm first (Normal mode, simulation running). */
  pendingSelection: PendingSelection | null;
  /** Bumped by `resetClock`; TimeBar observes it to stop its own playback loop. */
  clockResetNonce: number;
  setSelectedPoint: (point: { lat: number; lon: number } | null) => void;
  /** Per-layer opacity 0–1 (layer UI state, read by the map/globe when drawing). */
  layerOpacity: Record<string, number>;
  /** True once layer defaults from layers.json have been applied. */
  layersInitialised: boolean;
  /** Pro mode: technical names, UTC times, coordinates and fine layer controls. Off = student view. */
  proMode: boolean;
  /**
   * Mission timing + requirements shared by Explore (sliders, time mode) and Mission (scenarios).
   * Fifth shared field, agreed by the team (docs/10 §5 Javi, J0 #2). Defaults: `@/scoring`.
   */
  missionConfig: MissionConfig;

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
  /** Shallow merge; `requirements` / `weights`, if given, replace the whole object. */
  setMissionConfig: (patch: Partial<MissionConfig>) => void;
  /**
   * The one entry point for UI selection changes. Applies at once unless a simulation is running in
   * Normal mode and the target is a different site/point; then it waits in `pendingSelection`.
   * `null` deselects and never asks. `after` runs when the selection is applied.
   */
  requestSelection: (target: SelectionTarget | null, after?: () => void) => void;
  /** End the running simulation (clock paused and back to `startUtc`), then apply the pending switch. */
  confirmPending: (startUtc: string) => void;
  cancelPending: () => void;
  /** Pause-and-rewind helper shared by TimeBar's reset and the end-simulation confirm. */
  resetClock: (startUtc: string) => void;
  /**
   * A pin the Explore side panel asked for (by coordinates). The globe, which owns the camera,
   * drops it, flies there and clears it with `clearPendingPin`. A new object per request, so the
   * same coordinates twice still fire.
   */
  pendingPin: PendingPin | null;
  requestPin: (pin: PendingPin) => void;
  clearPendingPin: () => void;
}

export interface PendingPin {
  name: string;
  lat: number;
  lon: number;
}

const PRO_KEY = 'lse.proMode';
function readPro(): boolean {
  try {
    return globalThis.localStorage?.getItem(PRO_KEY) === '1';
  } catch {
    return false;
  }
}

function isSameSelection(s: AppState, t: SelectionTarget): boolean {
  if (t.kind === 'site') return s.selectedSiteId === t.id;
  return (
    s.selectedSiteId === null && s.selectedPoint?.lat === t.lat && s.selectedPoint?.lon === t.lon
  );
}

export const useAppStore = create<AppState>()((set, get) => {
  /** Apply a selection with the plain actions (no guard). */
  const applyTarget = (t: SelectionTarget) => {
    if (t.kind === 'site') {
      get().selectSite(t.id);
    } else {
      get().selectSite(null);
      get().setSelectedPoint({ lat: t.lat, lon: t.lon });
    }
  };

  return {
    selectedSiteId: null,
    selectedPoint: null,
    simulationStarted: false,
    pendingSelection: null,
    clockResetNonce: 0,
    currentTimeUTC: DEFAULT_TIME_UTC,
    timeRevision: 0,
    activeLayers: [],
    mode: 'explore',
    layerOpacity: {},
    layersInitialised: false,
    proMode: readPro(),
    missionConfig: DEFAULT_MISSION_CONFIG,
    pendingPin: null,

    selectSite: (id) =>
      set((s) =>
        s.selectedSiteId === id && s.selectedPoint === null
          ? s
          : { selectedSiteId: id, selectedPoint: null, simulationStarted: false },
      ),
    setSelectedPoint: (point) => {
      if (
        point &&
        (!Number.isFinite(point.lat + point.lon) ||
          Math.abs(point.lat) > 90 ||
          Math.abs(point.lon) > 180)
      )
        throw new RangeError('Invalid lunar coordinates');
      set((state) =>
        state.selectedPoint?.lat === point?.lat && state.selectedPoint?.lon === point?.lon
          ? state
          : {
              selectedPoint: point ? { lat: point.lat, lon: point.lon } : null,
              simulationStarted: false,
            },
      );
    },
    setSimulationStarted: (started) => set({ simulationStarted: started }),
    requestPin: (pin) => set({ pendingPin: { ...pin } }),
    clearPendingPin: () => set({ pendingPin: null }),
    setTime: (isoUtc) => set((s) => ({ currentTimeUTC: isoUtc, timeRevision: s.timeRevision + 1 })),
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

    setMissionConfig: (patch) => set((s) => ({ missionConfig: { ...s.missionConfig, ...patch } })),

    requestSelection: (target, after) => {
      const s = get();
      if (!target) {
        s.selectSite(null);
        return;
      }
      // Re-picking the current spot changes nothing (and must not end a running simulation).
      if (isSameSelection(s, target)) {
        after?.();
        return;
      }
      if (s.proMode || !s.simulationStarted) {
        applyTarget(target);
        after?.();
        return;
      }
      set({ pendingSelection: { target, after } });
    },

    confirmPending: (startUtc) => {
      const pending = get().pendingSelection;
      if (!pending) return;
      set({ pendingSelection: null });
      get().resetClock(startUtc);
      applyTarget(pending.target);
      pending.after?.();
    },

    cancelPending: () => set({ pendingSelection: null }),

    resetClock: (startUtc) =>
      set((s) => ({
        currentTimeUTC: startUtc,
        timeRevision: s.timeRevision + 1,
        simulationStarted: false,
        clockResetNonce: s.clockResetNonce + 1,
      })),
  };
});
