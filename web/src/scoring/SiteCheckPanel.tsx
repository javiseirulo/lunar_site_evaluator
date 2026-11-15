/**
 * Site check (owner: Javi; docs/10 J7): VALID/INVALID verdict of the selected site — or of any
 * lat/lon typed in — for the current mission win, with each requirement's margin, the score
 * breakdown and the temporal robustness (±3 days). Sky computed client-side from `@/ephem`.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatUtc, useAppStore, useSelectedSite } from '@/core';
import {
  buildTimeseries,
  earthMoonDistanceKmAt,
  useEphem,
  useEphemVersion,
  useHorizon,
} from '@/ephem';
import { evaluateWindow, type EvaluableSite } from './evaluate';
import { missionWindow } from './arrival';
import { robustnessRange, temporalRobustness } from './robustness';

const fmt = (v: number | null | undefined, d = 2) =>
  typeof v === 'number' && Number.isFinite(v) ? v.toFixed(d) : '—';

/** Plain-language label and unit per requirement key. */
const LABEL: Record<string, { label: string; unit: 'pct' | 'h' | 'deg' | 'km' }> = {
  illum_pct: { label: 'Sunlight', unit: 'pct' },
  earth_vis_pct: { label: 'Earth in view', unit: 'pct' },
  max_dark_hours: { label: 'Longest night', unit: 'h' },
  max_blackout_hours: { label: 'Longest Earth blackout', unit: 'h' },
  sun_el_mean_deg: { label: 'Mean Sun height', unit: 'deg' },
  sun_earth_pct: { label: 'Sun and Earth together', unit: 'pct' },
  slope_deg: { label: 'Slope', unit: 'deg' },
  psr_dist_km: { label: 'To icy craters', unit: 'km' },
};
const label = (k: string) => LABEL[k]?.label ?? k;
function show(k: string, v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  switch (LABEL[k]?.unit) {
    case 'pct':
      return `${Math.round(v * 100)}%`;
    case 'h':
      return `${Math.round(v)} h`;
    case 'deg':
      return `${v.toFixed(1)}°`;
    case 'km':
      return `${v.toFixed(1)} km`;
    default:
      return fmt(v);
  }
}

export function SiteCheckPanel({ className }: { className?: string }) {
  const config = useAppStore((s) => s.missionConfig);
  const selected = useSelectedSite();
  const [custom, setCustom] = useState<{ lat: string; lon: string } | null>(null);

  const point = useMemo(() => {
    if (custom) {
      const lat = Number(custom.lat);
      const lon = Number(custom.lon);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      )
        return null;
      return { id: 'custom', name: 'Custom point', lat, lon, elev_m: 0 } as const;
    }
    return selected
      ? {
          id: selected.id,
          name: selected.name,
          lat: selected.lat,
          lon: selected.lon,
          elev_m: selected.elev_m,
        }
      : null;
  }, [custom, selected]);

  const opts = { earthMoonKm: (d: Date) => earthMoonDistanceKmAt(d.getTime()) };
  const win = missionWindow(config, point, opts);
  const range = robustnessRange(win, 3);
  const ephem = useEphem(point ? range.start_utc : null, point ? range.end_utc : null);
  const ephemVersion = useEphemVersion();
  const horizon = useHorizon(point && !custom ? point.id : null);

  const result = useMemo(() => {
    if (!point || !ephem.ready) return null;
    if (!custom && horizon.status === 'loading') return null;
    const ts = buildTimeseries(point, horizon.horizon, range.start_utc, range.end_utc, {
      antennaMarginDeg: config.antenna_margin_deg ?? 0,
    });
    if (!ts) return null;
    const site: EvaluableSite =
      !custom && selected
        ? { metrics: selected.metrics, pending_metrics: selected.pending_metrics }
        : { pending_metrics: ['slope_deg', 'psr_dist_km'] };
    return {
      ev: evaluateWindow(site, ts, config, win),
      rob: temporalRobustness(site, ts, config, win, 3),
      horizonSource: ts.horizon_source,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, ephem.ready, ephemVersion, horizon, config, win.start_utc, win.end_utc]);

  return (
    <section className={cn('box', className)} aria-label="Site check">
      <div className="box-head">
        Site Check
        <button
          type="button"
          className="ml-auto border px-1.5 text-[10px] leading-[14px]"
          onClick={() =>
            setCustom(
              custom ? null : { lat: String(point?.lat ?? -89.5), lon: String(point?.lon ?? 0) },
            )
          }
        >
          {custom ? 'Use selected site' : 'Any lat/lon'}
        </button>
      </div>
      <div className="box-body flex flex-col gap-2 text-[11px]">
        {custom && (
          <div className="flex gap-2">
            <label>
              Lat{' '}
              <input
                className="field num w-20"
                value={custom.lat}
                onChange={(e) => setCustom({ ...custom, lat: e.target.value })}
              />
            </label>
            <label>
              Lon{' '}
              <input
                className="field num w-20"
                value={custom.lon}
                onChange={(e) => setCustom({ ...custom, lon: e.target.value })}
              />
            </label>
          </div>
        )}
        {!point ? (
          <p className="text-ink-faint text-[10px]">
            Select a site, or press “Any lat/lon” to check any point of the Moon for the current
            mission window.
          </p>
        ) : ephem.error ? (
          <p className="text-ink-faint text-[10px]">{ephem.error}</p>
        ) : !result ? (
          <p className="text-ink-faint text-[10px]">Computing…</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <strong
                className={cn(
                  'shrink-0 border px-1.5 text-[11px] whitespace-nowrap',
                  result.ev.valid
                    ? 'border-green-600 text-green-700'
                    : 'border-red-600 text-red-700',
                )}
              >
                {result.ev.valid ? 'VALID' : 'NOT VALID'}
              </strong>
              <span className="min-w-0 truncate">{point.name}</span>
              <span className="num ml-auto shrink-0">
                score {Math.round(result.ev.score * 100)}/100
              </span>
            </div>
            <p className="text-ink-faint text-[10px]">
              Mission window <span className="num">{formatUtc(win.start_utc)}</span> →{' '}
              <span className="num">{formatUtc(win.end_utc)}</span> · horizon:{' '}
              {result.horizonSource}
            </p>
            <ul className="border-edge-lo flex flex-col border-t">
              {result.ev.checks.map((c) => {
                const less = ['max_dark_hours', 'max_blackout_hours', 'slope_deg', 'psr_dist_km'];
                const op = less.includes(c.key) ? '≤' : '≥';
                return (
                  <li
                    key={c.key}
                    className={cn(
                      'border-edge-lo border-b py-1',
                      c.pending ? 'text-ink-faint' : c.ok ? '' : 'text-red-700',
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <span>
                        {c.pending ? '–' : c.ok ? '✔' : '✖'} {label(c.key)}
                      </span>
                      <span className="num">
                        {c.pending ? 'pending terrain' : show(c.key, c.value)}
                      </span>
                    </div>
                    <div className="text-ink-faint text-[10px]">
                      needs {op} {show(c.key, c.threshold)}
                      {c.margin !== null && ` · margin ${Math.round(c.margin * 100)}%`}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-ink-faint text-[10px]">
              Score points (of 100):{' '}
              {result.ev.contributions.length === 0
                ? '—'
                : result.ev.contributions
                    .map((c) => `${label(c.key)} ${Math.round(c.share * 100)}`)
                    .join(' · ')}
            </p>
            <p className="text-ink-faint text-[10px]">
              If the landing slips ±3 days:{' '}
              {result.rob.total > 0
                ? `valid in ${result.rob.valid_count} of ${result.rob.total} shifted windows`
                : '—'}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
