/**
 * Site check (owner: Javi; docs/10 J7): VALID/INVALID verdict of the selected site — or of any
 * lat/lon typed in — for the current mission win, with each requirement's margin, the score
 * breakdown and the temporal robustness (±3 days). Sky computed client-side from `@/ephem`.
 */
import { useId, useMemo, useState } from 'react';
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
import {
  explainEvaluation,
  formatNeed,
  formatRequirementValue,
  requirementLabel,
  type Explanation,
} from './explain';
import { robustnessRange, temporalRobustness } from './robustness';

const label = requirementLabel;
const show = formatRequirementValue;

/** Small 'i' disclosure (inline, not a modal) that explains why the site is valid or not. */
function WhyInfo({ exp }: { exp: Explanation }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Why this result?"
        title="Why this result?"
        onClick={() => setOpen(!open)}
        className={cn(
          'num inline-flex size-[22px] shrink-0 items-center justify-center border text-[11px] leading-none italic',
          open ? 'bg-warn border-black text-black' : 'border-current',
        )}
      >
        i
      </button>
      {open && (
        <div
          id={id}
          role="region"
          aria-label="Why this result"
          className="border-edge-lo bg-panel-2 basis-full border p-2 text-[12px] leading-snug"
        >
          <p>{exp.general}</p>
          <p className="mt-2 font-bold">{exp.headline}</p>
          <ul className="mt-1 list-disc pl-4">
            {exp.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function SiteCheckPanel({
  className,
  simple = false,
}: {
  className?: string;
  /** Normal mode: friendly verdict and requirement rows, without the Expert-only detail. */
  simple?: boolean;
}) {
  const config = useAppStore((s) => s.missionConfig);
  const selected = useSelectedSite();
  const [typed, setCustom] = useState<{ lat: string; lon: string } | null>(null);
  const selectedPoint = useAppStore((s) => s.selectedPoint);
  // A point picked on the globe (e.g. "Go to coordinates") is checked like a typed one.
  const custom = useMemo(
    () =>
      typed ??
      (!selected && selectedPoint
        ? { lat: String(selectedPoint.lat), lon: String(selectedPoint.lon) }
        : null),
    [typed, selected, selectedPoint],
  );

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
        {simple ? 'Does it work for the mission?' : 'Site Check'}
        {!simple && (
          <button
            type="button"
            className="ml-auto border px-1.5 text-[10px] leading-[14px]"
            onClick={() =>
              setCustom(
                typed ? null : { lat: String(point?.lat ?? -89.5), lon: String(point?.lon ?? 0) },
              )
            }
          >
            {custom ? 'Use selected site' : 'Any lat/lon'}
          </button>
        )}
      </div>
      <div className={cn('box-body flex flex-col gap-2', simple ? 'text-[13px]' : 'text-[11px]')}>
        {custom && !simple && (
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
            Select a site, or go to any coordinates, to check it for the current mission window.
          </p>
        ) : ephem.error ? (
          <p className="text-ink-faint text-[10px]">{ephem.error}</p>
        ) : !result ? (
          <p className="text-ink-faint text-[10px]">Computing…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <strong
                className={cn(
                  'shrink-0 border px-1.5 whitespace-nowrap',
                  simple ? 'py-0.5 text-[14px]' : 'text-[11px]',
                  result.ev.valid
                    ? 'border-green-500 text-green-400'
                    : 'border-red-500 text-red-400',
                )}
              >
                {result.ev.valid ? (simple ? 'VALID for this mission' : 'VALID') : 'NOT VALID'}
              </strong>
              {!simple && <span className="min-w-0 truncate">{point.name}</span>}
              <span className={cn('num shrink-0', simple ? 'text-[15px] font-bold' : 'ml-auto')}>
                {simple ? '' : 'score '}
                {Math.round(result.ev.score * 100)}/100
              </span>
              <WhyInfo exp={explainEvaluation(result.ev, config, config.surface_days)} />
            </div>
            {!simple && (
              <p className="text-ink-faint text-[10px]">
                Mission window <span className="num">{formatUtc(win.start_utc)}</span> →{' '}
                <span className="num">{formatUtc(win.end_utc)}</span> · horizon:{' '}
                {result.horizonSource}
              </p>
            )}
            <ul className="border-edge-lo flex flex-col border-t">
              {result.ev.checks.map((c) => {
                return (
                  <li
                    key={c.key}
                    className={cn(
                      'border-edge-lo border-b py-1',
                      c.pending ? 'text-ink-faint' : c.ok ? '' : 'text-red-400',
                    )}
                  >
                    <div className="flex justify-between gap-2">
                      <span>
                        {c.pending ? '–' : c.ok ? '✔' : '✖'} {label(c.key)}
                      </span>
                      <span className="num">
                        {c.pending
                          ? simple
                            ? 'not measured yet'
                            : 'pending terrain'
                          : show(c.key, c.value)}
                      </span>
                    </div>
                    <div className="text-ink-faint text-[10px]">
                      needs {formatNeed(c.key, c.threshold)}
                      {!simple && c.margin !== null && ` · margin ${Math.round(c.margin * 100)}%`}
                    </div>
                  </li>
                );
              })}
            </ul>
            {!simple && (
              <>
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
          </>
        )}
      </div>
    </section>
  );
}
