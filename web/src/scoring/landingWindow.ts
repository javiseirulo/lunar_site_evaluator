/**
 * Pure helpers behind the landing-date control (issue #154): can the Sun/Earth data cover a
 * mission window, and what is the date range the picker may offer?
 */
import type { EphemIndex } from '@lunar/contracts';
import { availableYears, formatYearRanges, missingEphemYears } from '@/ephem';

const DAY_MS = 86_400_000;

/** One sentence for the UI when a window needs a year the ephemeris does not have. */
export function unavailableMessage(idx: Pick<EphemIndex, 'years'>): string {
  return `No Sun/Earth data for that year — available: ${formatYearRanges(availableYears(idx))} (2026–2055 plus the years of past missions).`;
}

/**
 * null when [startUtc, endUtc) is fully covered (both years if it straddles New Year), else the
 * message to show. A window the data cannot cover is never applied.
 */
export function windowIssue(
  idx: Pick<EphemIndex, 'years'> | null,
  startUtc: string,
  endUtc: string,
): string | null {
  if (!idx) return null; // index still loading: the ephemeris hook reports its own error
  const s = Date.parse(startUtc);
  const e = Date.parse(endUtc);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 'Enter a valid date.';
  return missingEphemYears(idx, s, e).length ? unavailableMessage(idx) : null;
}

/** `min`/`max` (YYYY-MM-DD) for the date input: first data day to last day that still fits the stay. */
export function landingBounds(
  idx: Pick<EphemIndex, 'start_utc' | 'end_utc'>,
  surfaceDays: number,
): { min: string; max: string } {
  const lastRow = Date.parse(idx.end_utc);
  const latest = Math.floor((lastRow - surfaceDays * DAY_MS) / DAY_MS) * DAY_MS;
  return { min: idx.start_utc.slice(0, 10), max: new Date(latest).toISOString().slice(0, 10) };
}
