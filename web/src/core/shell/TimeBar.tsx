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

  const sun = useMemo(() => (ts ? windowsGradient(ts.lit, 'rgb(245 183 74 / 0.55)') : null), [ts]);
  const earth = useMemo(
    () => (ts?.earth_visible ? windowsGradient(ts.earth_visible, 'rgb(90 174 255 / 0.55)') : null),
    [ts],
  );
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSunChange = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarthChange = ts?.earth_visible
    ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC)
    : null;

  if (!range) return null;

  return (
    <div className={cn('panel flex flex-col gap-2 px-3 py-2.5 md:px-4', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="hover:bg-space-700 text-ink-muted hover:text-ink rounded-md p-1.5"
            onClick={() => {
              setPlaying(false);
              setTime(range.start_utc);
            }}
            aria-label="Back to start"
          >
            <SkipBack className="size-4" />
          </button>
          <button
            type="button"
            className="bg-ink text-space-950 hover:bg-accent rounded-md p-1.5 transition-colors"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <div
            className="bg-space-800 ml-1 flex rounded-md p-0.5"
            role="group"
            aria-label="Playback speed"
          >
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setSpeed(i)}
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[11px]',
                  speed === i ? 'bg-space-600 text-ink' : 'text-ink-faint hover:text-ink',
                )}
                aria-pressed={speed === i}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <span className="num text-sm">{formatUtc(currentTimeUTC)}</span>
        {sample && (
          <div className="text-ink-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', sample.lit ? 'bg-sun' : 'bg-space-600')} />
              {sample.lit ? 'Sunset in' : 'Sunrise in'}{' '}
              <span className="num text-ink">
                {toSunChange === null ? 'after this window' : formatHours(toSunChange)}
              </span>
            </span>
            {sample.earthVisible !== null && (
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    sample.earthVisible ? 'bg-earth' : 'bg-space-600',
                  )}
                />
                {sample.earthVisible ? 'Earthset in' : 'Earthrise in'}{' '}
                <span className="num text-ink">
                  {toEarthChange === null ? 'after this window' : formatHours(toEarthChange)}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        {(sun || earth) && (
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2"
            aria-hidden
          >
            {sun && <div className="h-1.5 rounded-t-sm" style={{ background: sun }} />}
            {earth && <div className="h-1.5 rounded-b-sm" style={{ background: earth }} />}
          </div>
        )}
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
      <div className="text-ink-faint flex justify-between font-mono text-[10px]">
        <span>{formatUtc(range.start_utc).slice(0, 10)}</span>
        {ts && (
          <span className="flex gap-3">
            <span className="text-sun/80">▬ sunlit</span>
            {ts.earth_visible && <span className="text-earth/80">▬ Earth in view</span>}
          </span>
        )}
        <span>{formatUtc(range.end_utc).slice(0, 10)}</span>
      </div>
    </div>
  );
}
