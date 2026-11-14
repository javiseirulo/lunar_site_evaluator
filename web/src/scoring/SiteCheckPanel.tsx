/**
 * Site check (owner: Javi; docs/10 J7): VALID/INVALID verdict of the selected site — or of any
 * lat/lon typed in — for the current mission win, with each requirement's margin, the score
 * breakdown and the temporal robustness (±3 days). Sky computed client-side from `@/ephem`.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore, useSelectedSite } from '@/core';
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
      {custom && (
        <div className="flex gap-2 text-[11px]">
          <label>
            Lat{' '}
            <input
              className="w-20 bg-transparent border px-1"
              value={custom.lat}
              onChange={(e) => setCustom({ ...custom, lat: e.target.value })}
            />
          </label>
          <label>
            Lon{' '}
            <input
              className="w-20 bg-transparent border px-1"
              value={custom.lon}
              onChange={(e) => setCustom({ ...custom, lon: e.target.value })}
            />
          </label>
        </div>
      )}
      {!point ? (
        <p className="text-[11px] opacity-70">Select a site or enter a valid lat/lon.</p>
      ) : ephem.error ? (
        <p className="text-[11px] opacity-70">{ephem.error}</p>
      ) : !result ? (
        <p className="text-[11px] opacity-70">Computing…</p>
      ) : (
        <div className="text-[11px]">
          <div className="flex items-baseline gap-2">
            <strong className={result.ev.valid ? 'text-green-400' : 'text-red-400'}>
              {result.ev.valid ? 'VALID' : 'INVALID'}
            </strong>
            <span>{point.name}</span>
            <span className="ml-auto">score {fmt(result.ev.score, 3)}</span>
          </div>
          <div className="opacity-70">
            {win.start_utc.slice(0, 16)}Z → {win.end_utc.slice(0, 16)}Z · {result.horizonSource}
          </div>
          <table className="mt-1 w-full">
            <thead>
              <tr className="opacity-70">
                <th className="text-left">Requirement</th>
                <th className="text-right">Value</th>
                <th className="text-right">Threshold</th>
                <th className="text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {result.ev.checks.map((c) => (
                <tr key={c.key} className={c.pending ? 'opacity-60' : c.ok ? '' : 'text-red-400'}>
                  <td>{c.key}</td>
                  <td className="text-right">{c.pending ? 'pending' : fmt(c.value)}</td>
                  <td className="text-right">{fmt(c.threshold)}</td>
                  <td className="text-right">
                    {c.margin === null ? '—' : `${(c.margin * 100).toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1">
            Score breakdown:{' '}
            {result.ev.contributions.length === 0
              ? '—'
              : result.ev.contributions
                  .map((c) => `${c.key} ${fmt(c.share, 3)} (u=${fmt(c.utility)})`)
                  .join(' · ')}
          </div>
          <div>
            Robustness (±3 d):{' '}
            {result.rob.total > 0
              ? `${result.rob.valid_count}/${result.rob.total} shifts valid`
              : '—'}
          </div>
        </div>
      )}
    </section>
  );
}
