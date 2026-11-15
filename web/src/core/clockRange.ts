/**
 * The window the Mission Clock, the chart and the check follow (issue #154).
 *
 * - Default mission window (2027-10-12 + 7 d): the published 2027 data range, as before.
 * - Any other landing date or stay: exactly [landing, landing + surface_days), computed client-side.
 *
 * The catalogue's `score`/`valid` and the static timeseries exist only for the default window, so
 * `useScoresStale()` tells the UI when those numbers must not be shown as if they were for the new date.
 */
import { useMemo } from 'react';
import type { MissionConfig } from '@lunar/contracts';
import { DEFAULT_MISSION_CONFIG } from '@/scoring/defaults';
import { missionWindow, type SiteLocation } from '@/scoring/arrival';
import { useAppStore } from './store';
import { useData, useSelectedSite } from './data';

export interface ClockRange {
  start_utc: string;
  /** Exclusive, like the manifest's. */
  end_utc: string;
  step_s: number;
  /** True when this is a mission window rather than the published data range. */
  custom: boolean;
}

const DEFAULT_WINDOW = missionWindow(DEFAULT_MISSION_CONFIG);

/** True when the config's mission window is the one the catalogue was precomputed for. */
export function isDefaultWindow(config: MissionConfig, site?: SiteLocation | null): boolean {
  const w = missionWindow(config, site);
  return w.start_utc === DEFAULT_WINDOW.start_utc && w.end_utc === DEFAULT_WINDOW.end_utc;
}

export function clockRangeFor(
  manifestRange: { start_utc: string; end_utc: string; step_s: number },
  config: MissionConfig,
  site?: SiteLocation | null,
): ClockRange {
  if (isDefaultWindow(config, site)) return { ...manifestRange, custom: false };
  const w = missionWindow(config, site);
  return { start_utc: w.start_utc, end_utc: w.end_utc, step_s: 3600, custom: true };
}

/** Null while the manifest loads. */
export function useClockRange(): ClockRange | null {
  const range = useData((s) => s.manifest?.time_range);
  const config = useAppStore((s) => s.missionConfig);
  const site = useSelectedSite();
  const start = range?.start_utc;
  const end = range?.end_utc;
  const step = range?.step_s;
  return useMemo(
    () =>
      start && end && step
        ? clockRangeFor({ start_utc: start, end_utc: end, step_s: step }, config, site)
        : null,
    // The site only matters in Mission time mode (landing computed per site).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [start, end, step, config, site?.id],
  );
}

/** True when the catalogue score/valid (default window only) do not describe the chosen window. */
export function useScoresStale(): boolean {
  const config = useAppStore((s) => s.missionConfig);
  const site = useSelectedSite();
  return !isDefaultWindow(config, site);
}

export const STALE_SCORES_NOTE = 'Scores shown are for the default window (2027-10-12, 7 days).';
