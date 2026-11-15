/**
 * Live Sun-illumination plot, shown in Explore's right column under the site card. A rolling window
 * (about 30 days) of the selected site's Sun elevation: the part already simulated is drawn solid
 * amber up to a cursor that follows the Mission Clock, the future is left empty. Expert adds Earth's
 * elevation as a thin blue line. Plain SVG; each frame slices at most ~720 samples by index.
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { useActiveSeries } from '@/ephem/activeSeries';
import { formatUtc } from '../format';
import { indexAt } from '../timeseries';
import { onRuns, rollingWindow, valueRange } from '../simChart';

const W = 300;
const H = 120;
const PAD_L = 26;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 16;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const SPAN_DAYS = 30;
const SUN = '#ffb43c';
const EARTH = '#5ab4ff';

const shortDate = (iso: string) => formatUtc(iso).slice(0, 10);

export function SimChart({ className }: { className?: string }) {
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const proMode = useAppStore((s) => s.proMode);
  const active = useActiveSeries();
  const ts = active.ts;

  const n = ts?.t_utc.length ?? 0;
  const hasEarth = proMode && !!ts?.earth_el;

  // Fixed y-range for the whole year so the axis does not jump while scrolling.
  const range = useMemo(() => {
    if (!ts) return { lo: 0, hi: 1 };
    return valueRange(hasEarth ? [...ts.sun_el, ...ts.earth_el] : ts.sun_el, 0, 1);
  }, [ts, hasEarth]);

  const idx = ts ? Math.max(0, indexAt(ts, currentTimeUTC)) : 0;

  const view = useMemo(() => {
    if (!ts || n < 2) return null;
    const span = Math.round((SPAN_DAYS * 86400) / ts.step_s);
    const { start, end } = rollingWindow(idx, n, span);
    const len = end - start;
    const x = (i: number) => PAD_L + ((i - start) / (len - 1)) * PLOT_W;
    const y = (v: number) => PAD_T + (1 - (v - range.lo) / (range.hi - range.lo)) * PLOT_H;
    const last = Math.min(idx, end - 1);
    const line = (vals: readonly number[]) => {
      let d = '';
      for (let i = start; i <= last; i++)
        d += `${i === start ? 'M' : 'L'}${x(i).toFixed(1)},${y(vals[i]!).toFixed(1)}`;
      return d;
    };
    const lit = onRuns(ts.lit.slice(start, last + 1)).map(([a, b]) => ({
      x: x(start + a),
      w: Math.max(0.8, x(start + b) - x(start + a)),
    }));
    return {
      start,
      end,
      x,
      y,
      last,
      sun: line(ts.sun_el),
      earth: hasEarth ? line(ts.earth_el) : null,
      lit,
    };
    // idx changes at most once per sample; the slice is tiny, so no per-frame heavy work.
  }, [ts, n, idx, range, hasEarth]);

  if (!active.site) {
    return (
      <section className={cn('box px-4 py-3', className)} aria-label="Live Sun illumination">
        <p className="text-ink-faint font-mono text-[11px] tracking-[0.12em] uppercase">
          Pick a site and press Play
        </p>
      </section>
    );
  }
  if (!ts || !view) {
    return (
      <section className={cn('box px-4 py-3', className)} aria-label="Live Sun illumination">
        <p className="text-ink-faint font-mono text-[11px] tracking-[0.12em] uppercase">
          {active.kind === 'point'
            ? active.error
              ? 'Ephemeris unavailable'
              : 'Computing…'
            : 'Loading…'}
        </p>
      </section>
    );
  }

  const el = ts.sun_el[idx]!;
  const lit = ts.lit[idx] === 1;
  const cx = view.x(view.last);
  const cy = view.y(el);
  const ticks = [range.hi, 0, range.lo].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <section className={cn('box px-4 py-3', className)} aria-label="Live Sun illumination">
      <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] tracking-[0.12em] uppercase">
        <span className="text-ink-faint">Illumination</span>
        <span className="num text-heading" aria-live="off">
          SUN {el.toFixed(1)}° ·{' '}
          <span className={lit ? 'text-sun' : 'text-ink-muted'}>{lit ? 'LIT' : 'DARK'}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 block w-full select-none"
        role="img"
        aria-label={`Sun elevation of the selected site over the last ${SPAN_DAYS} days. Now ${el.toFixed(
          1,
        )} degrees, ${lit ? 'lit' : 'dark'}.`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={view.y(v)}
              y2={view.y(v)}
              stroke={v === 0 ? '#8cc4ff' : '#24406e'}
              strokeWidth={v === 0 ? 0.8 : 0.5}
              strokeDasharray={v === 0 ? '3 3' : undefined}
            />
            <text
              x={PAD_L - 4}
              y={view.y(v) + 3}
              textAnchor="end"
              fontSize={9}
              fill="#7f93b5"
              className="num"
            >
              {v}°
            </text>
          </g>
        ))}
        {/* lit strip along the bottom of the plot */}
        {view.lit.map((r) => (
          <rect
            key={r.x}
            x={r.x}
            y={PAD_T + PLOT_H - 3}
            width={r.w}
            height={3}
            fill={SUN}
            fillOpacity={0.55}
          />
        ))}
        {view.earth && (
          <path d={view.earth} fill="none" stroke={EARTH} strokeWidth={1} strokeOpacity={0.8} />
        )}
        <path d={view.sun} fill="none" stroke={SUN} strokeWidth={1.6} strokeLinejoin="round" />
        <line
          x1={cx}
          x2={cx}
          y1={PAD_T}
          y2={PAD_T + PLOT_H}
          stroke="#ffcc4d"
          strokeOpacity={0.35}
        />
        <circle cx={cx} cy={cy} r={3} fill="#ffcc4d" />
        <text x={PAD_L} y={H - 3} fontSize={9} fill="#7f93b5" className="num">
          {shortDate(ts.t_utc[view.start]!)}
        </text>
        <text x={W - PAD_R} y={H - 3} fontSize={9} fill="#7f93b5" textAnchor="end" className="num">
          {shortDate(ts.t_utc[view.end - 1]!)}
        </text>
      </svg>
      {hasEarth && (
        <p className="text-ink-faint mt-1 font-mono text-[10px] tracking-[0.12em] uppercase">
          <span className="text-sun">— Sun</span> <span className="text-earth">— Earth</span>
        </p>
      )}
      {active.flatHorizon && (
        <p className="text-ink-faint mt-1 text-[11px]">Flat horizon, no terrain.</p>
      )}
    </section>
  );
}
