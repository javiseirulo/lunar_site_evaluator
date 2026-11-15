/**
 * Side-by-side comparison of up to three sites (the challenge's core task): key figures with the
 * best value in each row marked, and aligned sunlight / Earth-in-view timelines on the shared clock.
 * Selection lives in the URL (?ids=a,b,c) so a comparison can be shared as a link.
 */
import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import type { Site } from '@lunar/contracts';
import {
  EARTH_BAND,
  METRICS,
  friendlyHours,
  SUN_BAND,
  formatHours,
  changeLead,
  changeWhen,
  nextChange,
  seriesSpanLabel,
  type NextChange,
  sampleAt,
  useAppStore,
  useData,
  useTimeseries,
  windowsGradient,
} from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { SiteMoon } from './CompareMoons';

/** Compare exists only in Expert mode: in Normal the route quietly goes back to Explore. */
export default function ComparePage() {
  const proMode = useAppStore((s) => s.proMode);
  return proMode ? <CompareView /> : <Navigate to="/explore" replace />;
}

function CompareView() {
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

  return (
    <div className="flex flex-col gap-3">
      <section className="box">
        <div className="box-head">Compare Sites</div>
        <div className="box-body">
          <p className="text-ink-muted mb-3 max-w-[75ch]">
            Put up to three sites side by side. Each Moon turns to face its site, and the Mission
            Clock below moves the sunlight across them. The bars run from 0 to 100.
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
            <div className="grid items-start gap-3 md:grid-cols-3">
              {chosen.map((site) => (
                <SiteColumn key={site.id} site={site} />
              ))}
            </div>
          )}
        </div>
      </section>

      {chosen.length > 0 && (
        <section className="box">
          <div className="box-head">
            Sunlight &amp; Earth Windows
            <span className="ml-auto font-sans font-normal">
              <span className="text-sun">■</span> sunlit, <span className="text-earth">■</span>{' '}
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

function SiteColumn({ site }: { site: Site }) {
  const pro = useAppStore((s) => s.proMode);
  const ts = useTimeseries(site.id);
  const now = useAppStore((s) => s.currentTimeUTC);
  const sample = ts ? sampleAt(ts, now) : null;
  const sunEl = sample ? sample.sun_el : 2;
  const bars = [
    { label: 'Score', value: Math.round(site.score * 100), text: String(Math.round(site.score * 100)) },
    ...METRICS.flatMap((m) => {
      const goodness = m.goodness(site.metrics);
      if (goodness === null) return [];
      return [
        {
          label: pro ? m.proLabel : m.label,
          value: Math.round(goodness * 100),
          text: m.format(site.metrics, pro),
        },
      ];
    }),
  ];

  return (
    <article className="border-edge flex flex-col gap-3 border bg-black p-3">
      <SiteMoon lat={site.lat} lon={site.lon} sunEl={sunEl} label={site.name} />
      <div>
        <h3 className="text-[15px] font-medium text-heading">{site.name}</h3>
        <p className="text-ink-muted mt-1 text-[12px]">
          {sample ? (
            <>
              <span className="text-sun">{sample.lit ? 'Sun up' : 'Sun down'}</span>
              {' · '}
              <span className="text-earth">
                {sample.earthVisible === null
                  ? 'Earth unknown'
                  : sample.earthVisible
                    ? 'Earth in view'
                    : 'Earth hidden'}
              </span>
            </>
          ) : (
            'Loading the sky…'
          )}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {bars.map((bar) => (
          <li key={bar.label}>
            <div className="text-ink-muted mb-1 flex items-baseline justify-between gap-2 text-[11px]">
              <span>{bar.label}</span>
              <span className="num text-ink">{bar.text}</span>
            </div>
            <div className="bg-navy-950 h-1.5" aria-hidden>
              <div className="bg-sun h-full" style={{ width: `${Math.min(100, Math.max(0, bar.value))}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </article>
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
  const toSun = nextChange(ts, ts?.lit, currentTimeUTC);
  const toEarth = nextChange(ts, ts?.earth_visible, currentTimeUTC);

  const t0 = range ? Date.parse(range.start_utc) : 0;
  const t1 = range ? Date.parse(range.end_utc) : 1;
  const pos = Math.min(1, Math.max(0, (Date.parse(currentTimeUTC) - t0) / (t1 - t0 || 1)));
  const proMode = useAppStore((s) => s.proMode);
  const span = ts ? seriesSpanLabel(ts) : '';
  const when = (n: NextChange) =>
    changeWhen(n, span, (h) => (proMode ? formatHours(h) : friendlyHours(h)));

  return (
    <div className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)_210px]">
      <span className="font-bold text-heading">{site.name}</span>
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
            <span className="text-sun">{changeLead(sample.lit ? 'Sunset' : 'Sunrise', toSun)}</span>{' '}
            {when(toSun)}
            {sample.earthVisible !== null && (
              <>
                {', '}
                <span className="text-earth">
                  {changeLead(sample.earthVisible ? 'Earthset' : 'Earthrise', toEarth)}
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
