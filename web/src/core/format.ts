import type { SiteReason } from '@lunar/contracts';

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
