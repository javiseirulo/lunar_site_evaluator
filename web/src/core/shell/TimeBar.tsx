/**
 * Shared time control bound to `currentTimeUTC`. Any mode can drop it in.
 * When a site is selected it also shows that site's sunlight and Earth-visibility windows.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { useData, useTimeseries } from '../data';
import { formatHours, formatUtc } from '../format';
import { hoursUntilChange, sampleAt } from '../timeseries';

const SPEEDS = [
  { label: '1 h/s', hoursPerSec: 1 },
  { label: '6 h/s', hoursPerSec: 6 },
  { label: '1 d/s', hoursPerSec: 24 },
];

/** CSS gradient with a solid band wherever `flags` is 1. */
function windowsGradient(flags: (0 | 1)[], color: string): string {
  const n = flags.length;
  if (n === 0) return 'transparent';
  const stops: string[] = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    const on = i < n && flags[i] === 1;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const a = (start / n) * 100;
      const b = (i / n) * 100;
      stops.push(`transparent ${a}%`, `${color} ${a}%`, `${color} ${b}%`, `transparent ${b}%`);
      start = -1;
    }
  }
  return stops.length ? `linear-gradient(to right, ${stops.join(', ')})` : 'transparent';
}

export function TimeBar({ className }: { className?: string }) {
  const range = useData((s) => s.manifest?.time_range);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const setTime = useAppStore((s) => s.setTime);
  const siteId = useAppStore((s) => s.selectedSiteId);
  const ts = useTimeseries(siteId);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const t0 = range ? Date.parse(range.start_utc) : 0;
  const t1 = range ? Date.parse(range.end_utc) : 0;
  const now = Date.parse(currentTimeUTC);

  // Playback loop: advance the shared clock while playing.
  const raf = useRef(0);
  useEffect(() => {
    if (!playing || !range) return;
    let last = performance.now();
    const tick = (frame: number) => {
      const dt = (frame - last) / 1000;
      last = frame;
      const { currentTimeUTC: cur, setTime: set } = useAppStore.getState();
      const next = Date.parse(cur) + dt * SPEEDS[speed]!.hoursPerSec * 3_600_000;
      if (next >= t1) {
        set(new Date(t1).toISOString());
        setPlaying(false);
        return;
      }
      set(new Date(next).toISOString());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, range, t1]);

  const sun = useMemo(() => (ts ? windowsGradient(ts.lit, 'rgb(255 180 60 / 0.85)') : null), [ts]);
  const earth = useMemo(
    () => (ts?.earth_visible ? windowsGradient(ts.earth_visible, 'rgb(90 180 255 / 0.8)') : null),
    [ts],
  );
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSunChange = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarthChange = ts?.earth_visible
    ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC)
    : null;

  if (!range) return null;
  const pct = t1 > t0 ? ((Math.min(t1, Math.max(t0, now)) - t0) / (t1 - t0)) * 100 : 0;

  return (
    <section className={cn('box', className)} aria-label="Mission clock">
      <div className="box-head">
        Mission Clock
        <span className="num ml-auto font-sans font-normal tracking-normal normal-case">
          {formatUtc(currentTimeUTC)}
        </span>
      </div>
      <div className="box-body flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn w-7 px-0"
              onClick={() => {
                setPlaying(false);
                setTime(range.start_utc);
              }}
              aria-label="Back to start"
              title="Back to start"
            >
              <SkipBack className="size-3" />
            </button>
            <button
              type="button"
              className="btn btn-go w-16"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
          <label className="flex items-center gap-1.5">
            <span className="label">Speed</span>
            <select
              className="field"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {SPEEDS.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {sample && (
            <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'size-2 border border-black',
                    sample.lit ? 'bg-sun' : 'bg-navy-600',
                  )}
                />
                {sample.lit ? 'Sunset in' : 'Sunrise in'}{' '}
                <b className="num text-ink">
                  {toSunChange === null ? 'after this window' : formatHours(toSunChange)}
                </b>
              </span>
              {sample.earthVisible !== null && (
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-2 border border-black',
                      sample.earthVisible ? 'bg-earth' : 'bg-navy-600',
                    )}
                  />
                  {sample.earthVisible ? 'Earthset in' : 'Earthrise in'}{' '}
                  <b className="num text-ink">
                    {toEarthChange === null ? 'after this window' : formatHours(toEarthChange)}
                  </b>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timeline: sunlit / Earth-in-view bands under a draggable slider. */}
        <div className="border-edge-lo bg-navy-950 relative border px-1 pt-1 pb-0.5">
          <div className="pointer-events-none mx-[4px]" aria-hidden>
            <div className="h-[6px]" style={{ background: sun ?? 'transparent' }} />
            <div className="h-[6px]" style={{ background: earth ?? 'transparent' }} />
          </div>
          <div
            className="bg-accent pointer-events-none absolute top-0 bottom-0 w-px"
            style={{ left: `calc(4px + ${pct / 100} * (100% - 8px))` }}
            aria-hidden
          />
          <input
            type="range"
            className="range relative"
            min={t0}
            max={t1}
            step={3_600_000}
            value={Math.min(t1, Math.max(t0, now))}
            onChange={(e) => {
              setPlaying(false);
              setTime(new Date(Number(e.target.value)).toISOString());
            }}
            aria-label="Time"
            aria-valuetext={formatUtc(currentTimeUTC)}
          />
        </div>
        <div className="text-ink-faint flex justify-between text-[10px]">
          <span className="num">{range.start_utc.slice(0, 10)}</span>
          {ts ? (
            <span className="flex gap-3">
              <span>
                <span className="text-sun">■</span> sunlit
              </span>
              {ts.earth_visible && (
                <span>
                  <span className="text-earth">■</span> Earth in view
                </span>
              )}
            </span>
          ) : (
            <span className="hidden sm:inline">
              Select a site to see its sunlight and Earth windows
            </span>
          )}
          <span className="num">{range.end_utc.slice(0, 10)}</span>
        </div>
      </div>
    </section>
  );
}
