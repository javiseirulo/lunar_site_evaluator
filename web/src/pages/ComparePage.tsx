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
import { choiceGroups } from '@/core/siteChoices';
import { SiteMoon } from './CompareMoons';

/** Great-circle separation, in degrees. Neighbours at the south pole are only a couple of degrees apart. */
function angularSepDeg(a: Site, b: Site): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h))) * 180) / Math.PI;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i]!;
    out[i] = out[j]!;
    out[j] = swap;
  }
  return out;
}

/**
 * Three sites you can tell apart: one from each region when possible, and never two
 * that sit within 25° of each other. The highest-scoring defaults are all on the same rim.
 */
function randomSpread(sites: Site[], count = 3): Site[] {
  const minSep = 25;
  const byRegion = new Map<string, Site[]>();
  for (const site of sites) {
    const key = site.region ?? 'other';
    const list = byRegion.get(key);
    if (list) list.push(site);
    else byRegion.set(key, [site]);
  }
  const picked: Site[] = [];
  const farEnough = (site: Site) => picked.every((chosen) => angularSepDeg(site, chosen) >= minSep);
  for (const region of shuffle([...byRegion.keys()])) {
    if (picked.length >= count) break;
    const choice = shuffle(byRegion.get(region)!).find(farEnough);
    if (choice) picked.push(choice);
  }
  if (picked.length < count) {
    const rest = shuffle(sites).filter((site) => !picked.some((chosen) => chosen.id === site.id));
    rest.sort((a, b) => {
      const away = (site: Site) => Math.min(...picked.map((chosen) => angularSepDeg(site, chosen)));
      return away(b) - away(a);
    });
    for (const site of rest) {
      if (picked.length >= count) break;
      if (farEnough(site)) picked.push(site);
    }
  }
  return picked.slice(0, count);
}

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

  const groups = useMemo(() => choiceGroups(sites ?? []), [sites]);

  if (!sites) return null;
  const chosen = ids.flatMap((id) => sites.find((s) => s.id === id) ?? []);

  const setSlot = (slot: number, id: string) => {
    const next = [...ids];
    if (id) next[slot] = id;
    else next.splice(slot, 1);
    setParams({ ids: [...new Set(next.filter(Boolean))].join(',') }, { replace: true });
  };

  return (
    <div className="border-edge-hi flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden border-2 p-2">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-mono text-[13px] font-bold tracking-[0.12em] text-heading uppercase">
          Compare
        </h1>
        <button
          type="button"
          className="btn"
          onClick={() =>
            setParams(
              {
                ids: randomSpread(sites)
                  .map((site) => site.id)
                  .join(','),
              },
              { replace: true },
            )
          }
        >
          Randomize
        </button>
        {[0, 1, 2].map((slot) => (
          <label key={slot} className="flex items-center gap-1.5">
            <span className="label">Site {slot + 1}</span>
            <select
              className="field w-44"
              value={ids[slot] ?? ''}
              onChange={(e) => setSlot(slot, e.target.value)}
              disabled={slot > ids.length}
            >
              <option value="">{slot < 2 ? 'Choose…' : '— none —'}</option>
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.sites.map((s) => (
                    <option
                      key={s.id}
                      value={s.id}
                      disabled={ids.includes(s.id) && ids[slot] !== s.id}
                    >
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
      </div>

      {chosen.length > 0 && (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-3">
          {chosen.map((site, index) => (
            <SiteColumn key={index} site={site} />
          ))}
        </div>
      )}

      {chosen.length > 0 && (
        <section className="box shrink-0">
          <div className="text-heading flex items-center gap-2 px-3 pt-1.5 pb-0.5 font-mono text-[11px] tracking-[0.12em] uppercase">
            Sunlight &amp; Earth
            <span className="text-ink-muted ml-auto font-sans text-[10px] font-normal tracking-normal normal-case">
              <span className="text-sun">■</span> sunlit, <span className="text-earth">■</span>{' '}
              Earth in view
            </span>
          </div>
          <div className="space-y-0.5 px-3 pb-1.5">
            {chosen.map((s) => (
              <TimelineRow key={s.id} site={s} />
            ))}
          </div>
        </section>
      )}

      <TimeBar compact className="shrink-0" />
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
    {
      label: 'Score',
      value: Math.round(site.score * 100),
      text: String(Math.round(site.score * 100)),
    },
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
    <article className="border-edge-hi flex min-h-0 flex-col gap-2 border-2 bg-black p-2">
      <div className="relative min-h-[140px] flex-1">
        <SiteMoon lat={site.lat} lon={site.lon} sunEl={sunEl} label={site.name} />
      </div>
      <div>
        <h3 className="truncate text-[14px] font-medium text-heading">{site.name}</h3>
        <p className="text-ink-muted text-[12px]">
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
      <ul className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1">
        {bars.map((bar) => (
          <li key={bar.label}>
            <div className="text-ink-muted flex items-baseline justify-between gap-2 text-[10px]">
              <span>{bar.label}</span>
              <span className="num text-ink">{bar.text}</span>
            </div>
            <div className="bg-navy-950 h-1" aria-hidden>
              <div
                className="bg-sun h-full"
                style={{ width: `${Math.min(100, Math.max(0, bar.value))}%` }}
              />
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
    <div className="grid items-center gap-x-2 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,14rem)]">
      <span className="truncate text-[11px] font-medium text-heading">{site.name}</span>
      <div className="border-edge-lo bg-navy-950 relative border p-px">
        <div className="h-[4px]" style={{ background: sun ?? 'transparent' }} />
        <div className="mt-px h-[4px]" style={{ background: earth ?? 'transparent' }} />
        <div
          className="bg-accent absolute top-0 bottom-0 w-px"
          style={{ left: `calc(3px + ${pos} * (100% - 6px))` }}
          aria-hidden
        />
      </div>
      <span className="text-ink-muted truncate text-[10px]">
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
