/**
 * Data loading for everything under public/data (owner: Javi2).
 *
 * Usage in any module:
 *   const sites = useData((s) => s.sites);          // Site[] | null while loading
 *   const site  = useSelectedSite();                // Site | null
 *   const ts    = useTimeseries(siteId);            // Timeseries | null (fetched + cached)
 *   const url   = dataUrl('layers/elevation.png');
 *
 * `loadCoreData()` is called once by the app shell; modules never need to call it.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import type { DataManifest, LayersManifest, Site, SitesFile, Timeseries } from '@lunar/contracts';
import { useAppStore } from './store';

export const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(dataUrl(path));
  if (!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface DataState {
  status: Status;
  error: string | null;
  manifest: DataManifest | null;
  sitesFile: SitesFile | null;
  sites: Site[] | null;
  layers: LayersManifest | null;
  /** True if any loaded file is still a placeholder. */
  isMock: boolean;
  timeseries: Record<string, Timeseries>;
  timeseriesErrors: Record<string, string>;
}

export const useData = create<DataState>()(() => ({
  status: 'idle',
  error: null,
  manifest: null,
  sitesFile: null,
  sites: null,
  layers: null,
  isMock: false,
  timeseries: {},
  timeseriesErrors: {},
}));

export async function loadCoreData(): Promise<void> {
  if (useData.getState().status !== 'idle') return;
  useData.setState({ status: 'loading', error: null });
  try {
    const [manifest, sitesFile, layers] = await Promise.all([
      fetchJson<DataManifest>('manifest.json'),
      fetchJson<SitesFile>('sites.json'),
      fetchJson<LayersManifest>('layers.json'),
    ]);
    useData.setState({
      status: 'ready',
      manifest,
      sitesFile,
      sites: sitesFile.sites,
      layers,
      isMock: manifest.mock || sitesFile.mock || layers.mock,
    });
    const app = useAppStore.getState();
    app.initLayers(layers);
    // Start the shared clock at the beginning of the data window.
    if (
      app.currentTimeUTC < manifest.time_range.start_utc ||
      app.currentTimeUTC > manifest.time_range.end_utc
    ) {
      app.setTime(manifest.time_range.start_utc);
    }
  } catch (err) {
    useData.setState({ status: 'error', error: err instanceof Error ? err.message : String(err) });
  }
}

const inflight = new Map<string, Promise<void>>();

export function loadTimeseries(siteId: string): Promise<void> {
  const state = useData.getState();
  if (state.timeseries[siteId]) return Promise.resolve();
  const existing = inflight.get(siteId);
  if (existing) return existing;
  const p = fetchJson<Timeseries>(`timeseries/${encodeURIComponent(siteId)}.json`)
    .then((ts) => {
      useData.setState((s) => ({ timeseries: { ...s.timeseries, [siteId]: ts } }));
    })
    .catch((err: unknown) => {
      useData.setState((s) => ({
        timeseriesErrors: {
          ...s.timeseriesErrors,
          [siteId]: err instanceof Error ? err.message : String(err),
        },
      }));
    })
    .finally(() => inflight.delete(siteId));
  inflight.set(siteId, p);
  return p;
}

/** Timeseries for a site, fetched on first use and cached for the session. */
export function useTimeseries(siteId: string | null | undefined): Timeseries | null {
  const ts = useData((s) => (siteId ? s.timeseries[siteId] : undefined));
  useEffect(() => {
    if (siteId) void loadTimeseries(siteId);
  }, [siteId]);
  return ts ?? null;
}

export function useSite(siteId: string | null | undefined): Site | null {
  return useData((s) => s.sites?.find((site) => site.id === siteId) ?? null);
}

export function useSelectedSite(): Site | null {
  const id = useAppStore((s) => s.selectedSiteId);
  return useSite(id);
}
