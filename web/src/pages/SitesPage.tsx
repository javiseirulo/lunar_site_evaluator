/**
 * Site directory: every candidate site in one sortable table. Tick up to three and compare them,
 * or open one in Explore.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Site } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { formatLatLon, pct, useAppStore, useData } from '@/core';
import { scoreColor } from '@/layers';

// contracts/README v1.1: pending_metrics are placeholders until terrain arrives.
const isPending = (s: Site, k: string) => s.pending_metrics?.some((p) => p === k) ?? false;

type Key = 'name' | 'score' | 'illum' | 'earth' | 'slope' | 'dark' | 'psr' | 'elev';

const COLUMNS: {
  key: Key;
  label: string;
  get: (s: Site) => number | string;
  fmt: (s: Site) => string;
  title: string;
}[] = [
  {
    key: 'score',
    label: 'Score',
    get: (s) => s.score,
    fmt: (s) => String(Math.round(s.score * 100)),
    title: 'Weighted score with the default weights',
  },
  {
    key: 'illum',
    label: 'Sunny',
    get: (s) => s.metrics.illum_pct,
    fmt: (s) => pct(s.metrics.illum_pct),
    title: 'Share of the time window with the Sun above the terrain horizon',
  },
  {
    key: 'earth',
    label: 'Earth view',
    get: (s) => s.metrics.earth_vis_pct,
    fmt: (s) => pct(s.metrics.earth_vis_pct),
    title: 'Share of the time window with Earth above the terrain horizon',
  },
  {
    key: 'slope',
    label: 'Steepness',
    get: (s) => (isPending(s, 'slope_deg') ? Infinity : s.metrics.slope_deg),
    fmt: (s) => (isPending(s, 'slope_deg') ? '—' : `${s.metrics.slope_deg.toFixed(1)}°`),
    title: 'Local slope',
  },
  {
    key: 'dark',
    label: 'Longest dark',
    get: (s) => s.metrics.max_dark_hours,
    fmt: (s) => `${s.metrics.max_dark_hours} h`,
    title: 'Longest continuous period without sunlight',
  },
  {
    key: 'psr',
    label: 'Icy craters',
    get: (s) => (isPending(s, 'psr_dist_km') ? Infinity : s.metrics.psr_dist_km),
    fmt: (s) => (isPending(s, 'psr_dist_km') ? '—' : `${s.metrics.psr_dist_km} km`),
    title: 'Distance to the nearest permanently shadowed region',
  },
  {
    key: 'elev',
    label: 'Elevation',
    get: (s) => s.elev_m,
    fmt: (s) => `${s.elev_m.toLocaleString('en')} m`,
    title: 'Height relative to the reference sphere',
  },
];

export default function SitesPage() {
  const sites = useData((s) => s.sites);
  const selectSite = useAppStore((s) => s.selectSite);
  const proMode = useAppStore((s) => s.proMode);
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: 'score', desc: true });
  const [onlyValid, setOnlyValid] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    if (!sites) return [];
    const col = COLUMNS.find((c) => c.key === sort.key);
    const get = sort.key === 'name' ? (s: Site) => s.name : col!.get;
    return [...sites]
      .filter((s) => !onlyValid || s.valid)
      .sort((a, b) => {
        const x = get(a);
        const y = get(b);
        const cmp = typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number);
        return sort.desc ? -cmp : cmp;
      });
  }, [sites, sort, onlyValid]);

  const toggleSort = (key: Key) =>
    setSort((s) =>
      s.key === key
        ? { key, desc: !s.desc }
        : { key, desc: key !== 'name' && key !== 'slope' && key !== 'dark' },
    );
  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 3 ? [...p, id] : p));
  const arrow = (key: Key) => (sort.key === key ? (sort.desc ? ' ▼' : ' ▲') : '');

  return (
    <section className="box">
      <div className="box-head">
        Site Directory
        <span className="ml-auto font-sans font-normal">{rows.length} sites</span>
      </div>
      <div className="box-body">
        <p className="text-ink-muted mb-3 max-w-[75ch]">
          Every candidate site with its key figures over the data window. Click a column to sort, a
          name to open it on the map, or tick up to three sites to compare them side by side.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={onlyValid}
              onChange={(e) => setOnlyValid(e.target.checked)}
            />
            Only sites that pass the hard filters
          </label>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-ink-muted">{picked.length}/3 ticked</span>
            {proMode && (
              <button
                type="button"
                className="btn btn-go"
                disabled={picked.length < 2}
                onClick={() => navigate(`/compare?ids=${picked.map(encodeURIComponent).join(',')}`)}
              >
                Compare ticked
              </button>
            )}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="border-edge w-full min-w-[720px] border-collapse border text-[12px]">
            <thead>
              <tr className="bg-navy-700 text-left">
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2">
                  <button
                    type="button"
                    className="label text-ink hover:underline"
                    onClick={() => toggleSort('name')}
                  >
                    Site{arrow('name')}
                  </button>
                </th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right" title={c.title}>
                    <button
                      type="button"
                      className="label text-ink hover:underline"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      {arrow(c.key)}
                    </button>
                  </th>
                ))}
                <th className="label text-ink px-2 py-2 text-center">Pass</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr
                  key={s.id}
                  className={cn('border-edge border-t', i % 2 ? 'bg-navy-850' : 'bg-navy-900')}
                >
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={picked.includes(s.id)}
                      disabled={!picked.includes(s.id) && picked.length >= 3}
                      onChange={() => togglePick(s.id)}
                      aria-label={`Tick ${s.name} to compare`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="lnk font-bold"
                      onClick={() => {
                        selectSite(s.id);
                        navigate('/explore');
                      }}
                    >
                      {s.name}
                    </button>
                    <span className="text-ink-faint num block text-[10px]">
                      {formatLatLon(s.lat, s.lon)}
                    </span>
                  </td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="num px-2 py-2 text-right">
                      {c.key === 'score' ? (
                        <span
                          className="inline-block min-w-8 border border-black px-1 text-center font-bold text-black"
                          style={{ background: scoreColor(s.score) }}
                        >
                          {c.fmt(s)}
                        </span>
                      ) : (
                        <span
                          className={
                            c.key === 'illum' ? 'text-sun' : c.key === 'earth' ? 'text-earth' : ''
                          }
                        >
                          {c.fmt(s)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td
                    className={cn(
                      'px-2 py-2 text-center font-bold',
                      s.valid ? 'text-good' : 'text-bad',
                    )}
                  >
                    {s.valid ? '✔' : '✖'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
