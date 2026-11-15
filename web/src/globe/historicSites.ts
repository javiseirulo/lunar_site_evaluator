/**
 * Past lunar landings and impacts for the globe ("Past landings") — owner: Marta (src/globe).
 * Reads web/public/data/historic_sites.json (contract `HistoricSitesFile`, contracts/README v1.1).
 * Local state, not shared: these are not candidates and never touch `selectedSiteId`.
 * If the file cannot be loaded the globe keeps working and the switch shows "unavailable".
 */
import { create } from 'zustand';
import type { HistoricKind, HistoricOutcome, HistoricSite } from '@lunar/contracts';
import { dataUrl } from '@/core';

export type HistoricStatus = 'idle' | 'loading' | 'ready' | 'error';

interface HistoricState {
  status: HistoricStatus;
  sites: HistoricSite[];
  /** "Past landings" switch; off by default. */
  visible: boolean;
  setVisible: (on: boolean) => void;
}

export const useHistoric = create<HistoricState>()((set) => ({
  status: 'idle',
  sites: [],
  visible: false,
  setVisible: (visible) => set({ visible }),
}));

const OUTCOMES: HistoricOutcome[] = ['success', 'partial', 'failed'];

/** Checks the file's shape and returns its sites; throws with a short reason if it is not usable. */
export function parseHistoricSites(json: unknown): HistoricSite[] {
  const file = json as { version?: unknown; sites?: unknown };
  if (!file || file.version !== 1 || !Array.isArray(file.sites)) {
    throw new Error('historic_sites.json: expected { version: 1, sites: [...] }');
  }
  return file.sites.filter((s): s is HistoricSite => {
    const h = s as Partial<HistoricSite>;
    return (
      typeof h.id === 'string' &&
      typeof h.name === 'string' &&
      typeof h.lat === 'number' &&
      Number.isFinite(h.lat) &&
      typeof h.lon === 'number' &&
      Number.isFinite(h.lon) &&
      Math.abs(h.lat) <= 90 &&
      Math.abs(h.lon) <= 180 &&
      OUTCOMES.includes(h.outcome as HistoricOutcome)
    );
  });
}

let inflight: Promise<void> | null = null;

/** Loads the file once per session (again only after an error). */
export function loadHistoricSites(fetchImpl: typeof fetch = fetch): Promise<void> {
  const { status } = useHistoric.getState();
  if (status === 'ready') return Promise.resolve();
  if (inflight) return inflight;
  useHistoric.setState({ status: 'loading' });
  inflight = fetchImpl(dataUrl('historic_sites.json'))
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    })
    .then((json) => useHistoric.setState({ status: 'ready', sites: parseHistoricSites(json) }))
    .catch(() => useHistoric.setState({ status: 'error', sites: [] }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Latitude that separates the south polar region (docs/10 §10: lat ≤ −80 is south_pole). */
export const SOUTH_POLE_LAT = -80;

export interface HistoricSummary {
  total: number;
  southOf80: number;
  byOutcome: Record<HistoricOutcome, number>;
}

/** Counts computed from the data (never written by hand), for the legend. */
export function historicSummary(sites: HistoricSite[]): HistoricSummary {
  const byOutcome: Record<HistoricOutcome, number> = { success: 0, partial: 0, failed: 0 };
  let southOf80 = 0;
  for (const s of sites) {
    byOutcome[s.outcome] += 1;
    if (s.lat < SOUTH_POLE_LAT) southOf80 += 1;
  }
  return { total: sites.length, southOf80, byOutcome };
}

/** "25 landings shown · 2 south of 80°S" */
export function summaryText(s: HistoricSummary): string {
  return `${s.total} landing${s.total === 1 ? '' : 's'} shown · ${s.southOf80} south of 80°S`;
}

/** Marker colours by outcome (distinct from the gold of candidate sites). */
export const OUTCOME_COLORS: Record<HistoricOutcome, string> = {
  success: '#6fd38f',
  partial: '#ffb43c',
  failed: '#ff6b5b',
};

export const OUTCOME_LABELS: Record<HistoricOutcome, string> = {
  success: 'Landed',
  partial: 'Partial success',
  failed: 'Crashed',
};

export const KIND_LABELS: Record<HistoricKind, string> = {
  lander: 'Robotic lander',
  rover: 'Lander with rover',
  crewed: 'Crewed landing',
  sample_return: 'Sample return',
  impact: 'Crash site',
};
