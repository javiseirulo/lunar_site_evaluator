import type { Site, SiteReason } from '@lunar/contracts';

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export function formatUtc(isoUtc: string, opts: { seconds?: boolean } = {}): string {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return isoUtc;
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, opts.seconds ? 19 : 16);
  return `${date} ${time} UTC`;
}

export function formatLatLon(lat: number, lon: number): string {
  const ns = lat < 0 ? 'S' : 'N';
  const ew = lon < 0 ? 'W' : 'E';
  return `${Math.abs(lat).toFixed(2)}°${ns} ${Math.abs(lon).toFixed(2)}°${ew}`;
}

export function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 48) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

const REASON_TEXT: Record<string, string> = {
  slope_ok: 'Gentle slope',
  slope_high: 'Too steep',
  illum_ok: 'Plenty of sunlight',
  illum_low: 'Little sunlight',
  earth_ok: 'Earth often in view',
  earth_low: 'Earth rarely in view',
  dark_ok: 'Short nights',
  dark_long: 'Long nights',
};

export const reasonText = (r: SiteReason) => REASON_TEXT[r] ?? r.replace(/_/g, ' ');
export const reasonIsGood = (r: SiteReason) => r.endsWith('_ok');

const CHECK_LABEL: Record<string, string> = {
  slope_deg: 'steep slope',
  illum_pct: 'little sunlight',
  max_dark_hours: 'long nights',
  earth_vis_pct: 'Earth link',
  max_blackout_hours: 'long Earth blackouts',
  psr_dist_km: 'far from shadowed ice',
  sun_el_mean_deg: 'low Sun',
  sun_earth_pct: 'Sun and Earth rarely together',
};

/** Plain-language names of the requirement checks a site fails (pending metrics are ignored). */
export function failedCheckLabels(site: Pick<Site, 'checks'>): string[] {
  return (site.checks ?? [])
    .filter((c) => !c.ok && !c.pending)
    .map((c) => CHECK_LABEL[c.key] ?? c.key.replace(/_/g, ' '));
}

/** "Low score: Earth link, little sunlight", or null when nothing failed. */
export function lowScoreReason(site: Pick<Site, 'checks'>): string | null {
  const labels = failedCheckLabels(site);
  if (labels.length === 0) return null;
  const text = labels.join(', ');
  return `Low score: ${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** "Score for a 7-day landing on 12 Oct 2027", from sites.json `evaluation`; null when absent. */
export function evaluationLabel(
  ev: { start_utc: string; end_utc: string } | undefined,
): string | null {
  if (!ev) return null;
  const start = new Date(ev.start_utc);
  const end = new Date(ev.end_utc);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const date = start.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Score for a ${days}-day landing on ${date}`;
}
