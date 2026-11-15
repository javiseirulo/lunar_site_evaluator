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
  /** "Past landings" switch. On when Explore opens. */
  visible: boolean;
  setVisible: (on: boolean) => void;
}

export const useHistoric = create<HistoricState>()((set) => ({
  status: 'idle',
  sites: [],
  visible: true,
  setVisible: (visible) => set({ visible }),
}));

const OUTCOMES: HistoricOutcome[] = ['success', 'partial', 'failed'];
const KINDS: HistoricKind[] = ['lander', 'rover', 'crewed', 'sample_return', 'impact'];
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

/** Checks the file's shape and returns its sites; throws with a short reason if it is not usable. */
export function parseHistoricSites(json: unknown): HistoricSite[] {
  const file = json as { version?: unknown; sites?: unknown };
  if (!file || file.version !== 1 || !Array.isArray(file.sites)) {
    throw new Error('historic_sites.json: expected { version: 1, sites: [...] }');
  }
  const dropped: string[] = [];
  const sites = file.sites.filter((s): s is HistoricSite => {
    const h = s as Partial<HistoricSite>;
    // Everything the card and labels read must be there, so a bad row can never crash the globe.
    const ok =
      text(h.id) &&
      text(h.name) &&
      text(h.agency) &&
      text(h.country) &&
      text(h.note) &&
      typeof h.date_utc === 'string' &&
      !Number.isNaN(Date.parse(h.date_utc)) &&
      typeof h.source === 'string' &&
      /^https:\/\//.test(h.source) &&
      KINDS.includes(h.kind as HistoricKind) &&
      typeof h.lat === 'number' &&
      Number.isFinite(h.lat) &&
      typeof h.lon === 'number' &&
      Number.isFinite(h.lon) &&
      Math.abs(h.lat) <= 90 &&
      Math.abs(h.lon) <= 180 &&
      OUTCOMES.includes(h.outcome as HistoricOutcome);
    if (!ok) dropped.push(String(h.id ?? '?'));
    return ok;
  });
  // Visible in the console so the legend count is never silently short.
  if (dropped.length)
    console.warn(`historic_sites.json: skipped invalid entries: ${dropped.join(', ')}`);
  return sites;
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

/** South polar region boundary (docs/10 §10). The counter counts sites strictly south of it. */
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

/** "32 sites (5 crashes) · 2 south of 80°S" (crash sites are counted, and said so). */
export function summaryText(s: HistoricSummary): string {
  const crashes = s.byOutcome.failed;
  return `${s.total} site${s.total === 1 ? '' : 's'} (${crashes} crash${crashes === 1 ? '' : 'es'}) · ${s.southOf80} south of ${Math.abs(SOUTH_POLE_LAT)}°S`;
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
