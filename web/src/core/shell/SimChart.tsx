/**
 * Live simulation chart, shown under the Mission Clock in Explore: the selected site's year at a
 * glance (Sun elevation, sunlit and Earth-in-view bands) with a cursor that follows the clock.
 * The heavy SVG layers are memoised per site/mode; only the cursor, the dimming of the future and the
 * readouts change each frame. Nothing here animates, so reduced-motion needs no special casing.
 */
import { useMemo, useState, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { useTimeseries } from '../data';
import { formatUtc } from '../format';
import { indexAt } from '../timeseries';
import { friendlyHours } from '../metrics';
import { buildRunningStats, downsampleMinMax, monthTicks, onRuns, statsAt } from '../simChart';

const W = 720;
const PAD_L = 38;
const PAD_R = 10;
const PLOT_W = W - PAD_L - PAD_R;
const BUCKETS = Math.round(PLOT_W / 2); // one min/max pair per 2 px
const SUN = '#ffb43c';
const EARTH = '#5ab4ff';
const NOW = '#ffcc4d';

const hoursText = (h: number, pro: boolean) =>
  pro ? (h < 48 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1)} d`) : friendlyHours(h);

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-ink-faint font-mono text-[10px] tracking-[0.12em] uppercase">
        {label}
      </div>
      <div className="num text-heading text-[15px] leading-tight font-medium">{children}</div>
    </div>
  );
}

export function SimChart({ className }: { className?: string }) {
  const siteId = useAppStore((s) => s.selectedSiteId);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const proMode = useAppStore((s) => s.proMode);
  const ts = useTimeseries(siteId);
  const [hover, setHover] = useState<number | null>(null);

  const n = ts?.t_utc.length ?? 0;
  const stats = useMemo(() => (ts ? buildRunningStats(ts.lit) : null), [ts]);

  // Layout: Normal = two thick bands; Expert = elevation plot + thin bands + month axis.
  const bandH = proMode ? 9 : 22;
  const plotH = proMode ? 130 : 0;
  const plotTop = 8;
  const bandsTop = plotTop + plotH + (proMode ? 10 : 0);
  const hasEarth = !!ts?.earth_visible;
  const bandsH = hasEarth ? bandH * 2 + 4 : bandH;
  const axisTop = bandsTop + bandsH + 4;
  const H = axisTop + (proMode ? 18 : 16);

  const layers = useMemo(() => {
    if (!ts || n < 2) return null;
    const x = (i: number) => PAD_L + (i / (n - 1)) * PLOT_W;
    const els: ReactNode[] = [];

    // --- elevation plot (Expert) ---
    if (proMode) {
      const sunDs = downsampleMinMax(ts.sun_el, BUCKETS);
      const earthDs = downsampleMinMax(ts.earth_el, BUCKETS);
      let lo = Math.min(...sunDs.min, ...earthDs.min, 0);
      let hi = Math.max(...sunDs.max, ...earthDs.max, 0);
      lo = Math.floor(lo / 10) * 10;
      hi = Math.ceil(hi / 10) * 10;
      const y = (v: number) => plotTop + (1 - (v - lo) / (hi - lo || 1)) * plotH;
      const bx = (k: number) => PAD_L + ((k + 0.5) / sunDs.min.length) * PLOT_W;
      const step = hi - lo > 60 ? 30 : 10;
      for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
        els.push(
          <line
            key={`g${v}`}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(v)}
            y2={y(v)}
            stroke={v === 0 ? '#8cc4ff' : '#24406e'}
            strokeWidth={v === 0 ? 1 : 0.6}
            strokeDasharray={v === 0 ? '4 3' : undefined}
          />,
          <text
            key={`t${v}`}
            x={PAD_L - 5}
            y={y(v) + 3.5}
            textAnchor="end"
            fontSize={10}
            fill="#7f93b5"
            className="num"
          >
            {v}°
          </text>,
        );
      }
      const area = (ds: { min: number[]; max: number[] }) =>
        ds.max.map((v, k) => `${k ? 'L' : 'M'}${bx(k).toFixed(1)},${y(v).toFixed(1)}`).join('') +
        ds.min
          .map(
            (_v, k) =>
              `L${bx(ds.min.length - 1 - k).toFixed(1)},${y(ds.min[ds.min.length - 1 - k]!).toFixed(1)}`,
          )
          .join('') +
        'Z';
      els.push(
        <path
          key="earth-el"
          d={area(earthDs)}
          fill={EARTH}
          fillOpacity={0.25}
          stroke={EARTH}
          strokeWidth={0.8}
        />,
        <path
          key="sun-el"
          d={area(sunDs)}
          fill={SUN}
          fillOpacity={0.3}
          stroke={SUN}
          strokeWidth={0.8}
        />,
        <text key="l-sun" x={PAD_L + 4} y={plotTop + 11} fontSize={10} fill={SUN}>
          Sun elevation
        </text>,
        <text key="l-earth" x={PAD_L + 84} y={plotTop + 11} fontSize={10} fill={EARTH}>
          Earth elevation
        </text>,
      );
    }

    // --- bands ---
    const band = (
      flags: readonly number[],
      top: number,
      color: string,
      key: string,
      label: string,
    ) => {
      els.push(
        <rect
          key={`${key}-bg`}
          x={PAD_L}
          y={top}
          width={PLOT_W}
          height={bandH}
          rx={2}
          fill="#ffffff"
          fillOpacity={0.06}
        />,
        ...onRuns(flags).map(([a, b]) => (
          <rect
            key={`${key}${a}`}
            x={x(a)}
            y={top}
            width={Math.max(0.8, x(b) - x(a))}
            height={bandH}
            fill={color}
            fillOpacity={0.9}
          />
        )),
        <text
          key={`${key}-l`}
          x={PAD_L - 5}
          y={top + bandH / 2 + 3.5}
          textAnchor="end"
          fontSize={10}
          fill={color}
        >
          {label}
        </text>,
      );
    };
    band(ts.lit, bandsTop, SUN, 'sun', 'Sun');
    if (ts.earth_visible) band(ts.earth_visible, bandsTop + bandH + 4, EARTH, 'earth', 'Earth');

    // --- month axis ---
    const ticks = monthTicks(ts.t_utc);
    const every = proMode ? 1 : 2;
    ticks.forEach((t, k) => {
      if (k % every) return;
      els.push(
        <line
          key={`m${t.index}`}
          x1={x(t.index)}
          x2={x(t.index)}
          y1={axisTop - 3}
          y2={axisTop + 1}
          stroke="#4c74b4"
          strokeWidth={0.8}
        />,
        <text
          key={`mt${t.index}`}
          x={x(t.index)}
          y={axisTop + 12}
          textAnchor="middle"
          fontSize={10}
          fill="#7f93b5"
        >
          {t.label}
        </text>,
      );
    });
    return els;
  }, [ts, n, proMode, bandH, plotH, bandsTop, axisTop]);

  if (!siteId || !ts) {
    return (
      <section className={cn('box px-4 py-4', className)} aria-label="Live simulation">
        <h2 className="text-heading text-[17px] font-medium">Site year</h2>
        <p className="text-ink-faint mt-1 text-[13px]">
          {siteId ? 'Loading this site’s year…' : 'Pick a site to see its year'}
        </p>
      </section>
    );
  }

  const idx = Math.max(0, indexAt(ts, currentTimeUTC));
  const cx = PAD_L + (n > 1 ? (idx / (n - 1)) * PLOT_W : 0);
  const sunUp = ts.lit[idx] === 1;
  const earthIn = ts.earth_visible ? ts.earth_visible[idx] === 1 : null;
  const st = stats ? statsAt(stats, idx, ts.step_s) : { litFraction: 0, longestDarkHours: 0 };

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!proMode) return;
    const r = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * W;
    const f = (vx - PAD_L) / PLOT_W;
    setHover(f < 0 || f > 1 ? null : Math.round(f * (n - 1)));
  };
  const hx = hover !== null ? PAD_L + (hover / (n - 1)) * PLOT_W : 0;

  return (
    <section className={cn('box px-4 py-3', className)} aria-label="Live simulation">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-heading text-[17px] font-medium">Site year</h2>
        <span className="text-ink-faint text-[12px]">
          {proMode
            ? 'Sun elevation, sunlight and Earth visibility'
            : 'When the sun shines and Earth is in view'}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 block w-full touch-none select-none"
        role="img"
        aria-label={`Sunlight and Earth visibility over the year. Now: Sun ${sunUp ? 'up' : 'down'}${
          earthIn === null ? '' : `, Earth ${earthIn ? 'in view' : 'hidden'}`
        }.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {layers}
        {/* future = not simulated yet: dimmed */}
        <rect
          x={cx}
          y={plotTop - 2}
          width={Math.max(0, W - PAD_R - cx)}
          height={bandsTop + bandsH - plotTop + 4}
          fill="#061022"
          fillOpacity={0.62}
          pointerEvents="none"
        />
        {hover !== null && (
          <line
            x1={hx}
            x2={hx}
            y1={plotTop - 2}
            y2={bandsTop + bandsH + 2}
            stroke="#e6edf7"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
        )}
        <line
          x1={cx}
          x2={cx}
          y1={plotTop - 4}
          y2={bandsTop + bandsH + 4}
          stroke={NOW}
          strokeWidth={2}
        />
        <circle cx={cx} cy={plotTop - 4} r={3} fill={NOW} />
      </svg>

      {proMode && (
        <p className="num text-ink-muted mt-1 min-h-[18px] text-[12px]" aria-live="off">
          {hover !== null ? (
            <>
              {formatUtc(ts.t_utc[hover]!)} · Sun {ts.sun_el[hover]!.toFixed(1)}°
              {ts.lit[hover] === 1 ? ' (lit)' : ' (dark)'} · Earth {ts.earth_el[hover]!.toFixed(1)}°
              {ts.earth_visible ? (ts.earth_visible[hover] === 1 ? ' (in view)' : ' (hidden)') : ''}
            </>
          ) : (
            <span className="text-ink-faint">Hover the chart for the values at any moment.</span>
          )}
        </p>
      )}

      <div className="border-edge mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-2 sm:grid-cols-4">
        <Readout label="Sun">
          <span className={sunUp ? 'text-sun' : 'text-ink-muted'}>{sunUp ? 'Up' : 'Down'}</span>
          {proMode && <span className="text-ink-muted"> {ts.sun_el[idx]!.toFixed(1)}°</span>}
        </Readout>
        {earthIn !== null && (
          <Readout label="Earth">
            <span className={earthIn ? 'text-earth' : 'text-ink-muted'}>
              {earthIn ? 'In view' : 'Hidden'}
            </span>
            {proMode && <span className="text-ink-muted"> {ts.earth_el[idx]!.toFixed(1)}°</span>}
          </Readout>
        )}
        <Readout label={proMode ? 'Lit so far' : 'Sunny so far'}>
          {Math.round(st.litFraction * 100)}%
        </Readout>
        <Readout label={proMode ? 'Longest dark' : 'Longest night'}>
          {st.longestDarkHours > 0 ? hoursText(st.longestDarkHours, proMode) : 'none yet'}
        </Readout>
      </div>
    </section>
  );
}
