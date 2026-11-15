/**
 * Polar terrain state — owner: Marta (src/globe). Local, not shared.
 * Nothing is fetched until the user gets close to the south pole or presses the pole marker.
 */
import { create } from 'zustand';
import { dataUrl } from '@/core';
import { useCallback } from 'react';
import { float32LE, terrainLift, type HeightmapHeader } from './terrain';

export type TerrainStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TerrainState {
  status: TerrainStatus;
  header: HeightmapHeader | null;
  heights: Float32Array | null;
  /** Optional validity mask (terrain/valid.u8); without it, NaN heights mark missing data. */
  mask: Uint8Array | null;
  /** The camera is close to the south pole: the patch is drawn (once loaded). */
  shown: boolean;
  /** Vertical exaggeration: 1 (default) or 2 (labelled on screen). */
  exaggeration: 1 | 2;
  setShown: (on: boolean) => void;
  setExaggeration: (x: 1 | 2) => void;
}

export const useTerrain = create<TerrainState>()((set) => ({
  status: 'idle',
  header: null,
  heights: null,
  mask: null,
  shown: false,
  exaggeration: 1,
  setShown: (shown) => set({ shown }),
  setExaggeration: (exaggeration) => set({ exaggeration }),
}));

/** A response is a real binary file (Vite answers missing files with index.html and HTTP 200). */
function isBinary(res: Response): boolean {
  return res.ok && !(res.headers.get('content-type') ?? '').includes('html');
}

/** The patch is loaded and the camera is close enough to draw it. */
export function patchOn(s: Pick<TerrainState, 'status' | 'shown'>): boolean {
  return s.status === 'ready' && s.shown;
}

/**
 * The patch shows within this camera distance (Moon centre, R = 1) — a little farther out than
 * the "South pole" button view (1.3), so it is already there when that flight arrives — and
 * hides beyond it. Same threshold both ways.
 */
export const PATCH_SHOW_DISTANCE = 1.45;
/** …while looking at the south polar region (camera direction's y at or below this). */
const PATCH_SHOW_SOUTH = -0.75;
/** Start downloading a little before the patch is due, so it is ready when it shows. */
export const PATCH_PREFETCH_DISTANCE = 1.8;

/** Whether the patch should be drawn for this camera position. */
export function patchShownAt(camera: readonly [number, number, number]): boolean {
  const d = Math.hypot(camera[0], camera[1], camera[2]);
  return d <= PATCH_SHOW_DISTANCE && camera[1] / d <= PATCH_SHOW_SOUTH;
}

let inflight: Promise<void> | null = null;

/** Loads the heightmap once (again only after an error). */
export function loadTerrain(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (useTerrain.getState().status === 'ready') return Promise.resolve();
  if (inflight) return inflight;
  useTerrain.setState({ status: 'loading' });
  inflight = (async () => {
    const res = await fetchImpl(dataUrl('terrain/heightmap.json'));
    if (!res.ok) throw new Error(`heightmap.json: HTTP ${res.status}`);
    const header = (await res.json()) as HeightmapHeader;
    const count = header.width_px * header.height_px;
    const hRes = await fetchImpl(dataUrl(header.heights.file));
    if (!isBinary(hRes)) throw new Error(`${header.heights.file}: not available`);
    const heights = float32LE(await hRes.arrayBuffer());
    if (heights.length !== count)
      throw new Error(`${header.heights.file}: expected ${count} values`);
    let mask: Uint8Array | null = null;
    if (header.mask?.file) {
      // The mask is optional: without it, NaN heights already mark the holes.
      const mRes = await fetchImpl(dataUrl(header.mask.file)).catch(() => null);
      if (mRes && isBinary(mRes)) {
        const m = new Uint8Array(await mRes.arrayBuffer());
        if (m.length === count) mask = m;
      }
    }
    useTerrain.setState({ status: 'ready', header, heights, mask });
  })()
    .catch(() => useTerrain.setState({ status: 'error', header: null, heights: null, mask: null }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Lift function (lat, lon) → globe units above the sphere; always 0 until the patch is loaded. */
export type LiftFn = (lat: number, lon: number) => number;

/** Stable while the terrain and its exaggeration do not change, so markers can memo on it. */
export function useTerrainLift(): LiftFn {
  const header = useTerrain((s) => (patchOn(s) ? s.header : null));
  const heights = useTerrain((s) => s.heights);
  const mask = useTerrain((s) => s.mask);
  const exaggeration = useTerrain((s) => s.exaggeration);
  return useCallback(
    (lat: number, lon: number) =>
      header && heights ? terrainLift(header, heights, lat, lon, exaggeration, mask) : 0,
    [header, heights, mask, exaggeration],
  );
}
