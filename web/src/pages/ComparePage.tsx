/**
 * Side-by-side comparison of up to three sites (the challenge's core task): key figures with the
 * best value in each row marked, and aligned sunlight / Earth-in-view timelines on the shared clock.
 * Selection lives in the URL (?ids=a,b,c) so a comparison can be shared as a link.
 */
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { Site } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import {
  EARTH_BAND,
  SUN_BAND,
  formatHours,
  formatLatLon,
  hoursUntilChange,
  pct,
  sampleAt,
  useAppStore,
  useData,
  useTimeseries,
  windowsGradient,
} from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { scoreColor } from '@/layers';

type Better = 'high' | 'low' | null;
const ROWS: {
  label: string;
  value: (s: Site) => number;
  fmt: (s: Site) => string;
  better: Better;
  tone?: string;
}[] = [
  {
    label: 'Score',
    value: (s) => s.score,
    fmt: (s) => String(Math.round(s.score * 100)),
    better: 'high',
  },
  {
    label: 'Sunlight',
    value: (s) => s.metrics.illum_pct,
    fmt: (s) => pct(s.metrics.illum_pct),
    better: 'high',
    tone: 'text-sun',
  },
  {
    label: 'Earth in view',
    value: (s) => s.metrics.earth_vis_pct,
    fmt: (s) => pct(s.metrics.earth_vis_pct),
    better: 'high',
    tone: 'text-earth',
  },
  {
    label: 'Longest night',
    value: (s) => s.metrics.max_dark_hours,
    fmt: (s) => `${s.metrics.max_dark_hours} h`,
    better: 'low',
  },
  {
    label: 'Slope',
    value: (s) => s.metrics.slope_deg,
    fmt: (s) => `${s.metrics.slope_deg.toFixed(1)}°`,
    better: 'low',
  },
  {
    label: 'To shadowed crater',
    value: (s) => s.metrics.psr_dist_km,
    fmt: (s) => `${s.metrics.psr_dist_km} km`,
    better: null,
    tone: 'text-psr',
  },
  {
    label: 'Elevation',
    value: (s) => s.elev_m,
    fmt: (s) => `${s.elev_m.toLocaleString('en')} m`,
    better: null,
  },
];

export default function ComparePage() {
  const sites = useData((s) => s.sites);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const [params, setParams] = useSearchParams();

  const ids = useMemo(() => {
    const fromUrl = (params.get('ids') ?? '').split(',').filter(Boolean);
    if (fromUrl.length || !sites) return fromUrl.slice(0, 3);
    // Default: the selected site plus the best-scoring valid sites.
    const ranked = [...sites]
      .filter((s) => s.valid)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.id);
    return [...new Set([selectedSiteId, ...ranked].filter((x): x is string => !!x))].slice(0, 3);
  }, [params, sites, selectedSiteId]);

  if (!sites) return null;
  const chosen = ids.flatMap((id) => sites.find((s) => s.id === id) ?? []);
  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name));

  const setSlot = (slot: number, id: string) => {
    const next = [...ids];
    if (id) next[slot] = id;
    else next.splice(slot, 1);
    setParams({ ids: [...new Set(next.filter(Boolean))].join(',') }, { replace: true });
  };

  const best = (row: (typeof ROWS)[number]) => {
    if (!row.better || chosen.length < 2) return null;
    const values = chosen.map(row.value);
    const target = row.better === 'high' ? Math.max(...values) : Math.min(...values);
    return values.filter((v) => v === target).length === values.length ? null : target;
  };

  return (
    <div className="flex flex-col gap-3">
      <section className="box">
        <div className="box-head">Compare Sites</div>
        <div className="box-body">
          <p className="text-ink-muted mb-3 max-w-[75ch]">
            A mission slips and you need an alternative nearby? Put up to three sites side by side.
            The best value in each row is marked <b className="text-accent">★</b>. Drag the Mission
            Clock below to see which site has the Sun and Earth up at any moment.
          </p>
          <div className="mb-4 flex flex-wrap gap-3">
            {[0, 1, 2].map((slot) => (
              <label key={slot} className="flex items-center gap-1.5">
                <span className="label">Site {slot + 1}</span>
                <select
                  className="field w-48"
                  value={ids[slot] ?? ''}
                  onChange={(e) => setSlot(slot, e.target.value)}
                  disabled={slot > ids.length}
                >
                  <option value="">{slot < 2 ? 'Choose…' : '— none —'}</option>
                  {sorted.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={ids.includes(s.id) && ids[slot] !== s.id}
                    >
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {chosen.length > 0 && (
            <div className="overflow-x-auto">
              <table className="border-edge w-full min-w-[560px] border-collapse border text-[12px]">
                <thead>
                  <tr className="bg-navy-700">
                    <th className="w-40 px-3 py-2" />
                    {chosen.map((s) => (
                      <th key={s.id} className="px-3 py-2 text-left">
                        <span className="block text-[13px] text-white">{s.name}</span>
                        <span className="text-ink-faint num block text-[10px] font-normal">
                          {formatLatLon(s.lat, s.lon)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => {
                    const target = best(row);
                    return (
                      <tr
                        key={row.label}
                        className={cn(
                          'border-edge border-t',
                          i % 2 ? 'bg-navy-850' : 'bg-navy-900',
                        )}
                      >
                        <th className="text-ink-muted px-3 py-2 text-left font-normal">
                          {row.label}
                        </th>
                        {chosen.map((s) => {
                          const isBest = target !== null && row.value(s) === target;
                          return (
                            <td
                              key={s.id}
                              className={cn('num px-3 py-2', row.tone, isBest && 'font-bold')}
                            >
                              {row.label === 'Score' ? (
                                <span
                                  className="inline-block min-w-8 border border-black px-1 text-center font-bold text-black"
                                  style={{ background: scoreColor(s.score) }}
                                >
                                  {row.fmt(s)}
                                </span>
                              ) : (
                                row.fmt(s)
                              )}
                              {isBest && <span className="text-accent ml-1">★</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-edge border-t">
                    <th className="text-ink-muted px-3 py-2 text-left font-normal">Hard filters</th>
                    {chosen.map((s) => (
                      <td
                        key={s.id}
                        className={cn('px-3 py-2 font-bold', s.valid ? 'text-good' : 'text-bad')}
                      >
                        {s.valid ? '✔ Pass' : '✖ Fail'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {chosen.length > 0 && (
        <section className="box">
          <div className="box-head">
            Sunlight &amp; Earth Windows
            <span className="ml-auto font-sans font-normal tracking-normal normal-case">
              <span className="text-sun">■</span> sunlit · <span className="text-earth">■</span>{' '}
              Earth in view
            </span>
          </div>
          <div className="box-body space-y-3">
            {chosen.map((s) => (
              <TimelineRow key={s.id} site={s} />
            ))}
          </div>
        </section>
      )}

      <TimeBar />
    </div>
  );
}

function TimelineRow({ site }: { site: Site }) {
  const ts = useTimeseries(site.id);
  const range = useData((s) => s.manifest?.time_range);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const sun = useMemo(() => (ts ? windowsGradient(ts.lit, SUN_BAND) : null), [ts]);
  const earth = useMemo(
    () => (ts?.earth_visible ? windowsGradient(ts.earth_visible, EARTH_BAND) : null),
    [ts],
  );
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSun = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarth = ts?.earth_visible ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC) : null;

  const t0 = range ? Date.parse(range.start_utc) : 0;
  const t1 = range ? Date.parse(range.end_utc) : 1;
  const pos = Math.min(1, Math.max(0, (Date.parse(currentTimeUTC) - t0) / (t1 - t0 || 1)));
  const when = (h: number | null) => (h === null ? 'after this window' : formatHours(h));

  return (
    <div className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)_210px]">
      <span className="font-bold text-white">{site.name}</span>
      <div className="border-edge-lo bg-navy-950 relative border p-[3px]">
        <div className="h-[8px]" style={{ background: sun ?? 'transparent' }} />
        <div className="mt-px h-[8px]" style={{ background: earth ?? 'transparent' }} />
        <div
          className="bg-accent absolute top-0 bottom-0 w-px"
          style={{ left: `calc(3px + ${pos} * (100% - 6px))` }}
          aria-hidden
        />
      </div>
      <span className="text-ink-muted text-[11px]">
        {sample ? (
          <>
            <span className="text-sun">{sample.lit ? 'Sunset' : 'Sunrise'}</span> {when(toSun)}
            {sample.earthVisible !== null && (
              <>
                {' · '}
                <span className="text-earth">
                  {sample.earthVisible ? 'Earthset' : 'Earthrise'}
                </span>{' '}
                {when(toEarth)}
              </>
            )}
          </>
        ) : (
          'Loading…'
        )}
      </span>
    </div>
  );
}
