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
import { dayOfWindow, friendlyHours } from '../metrics';
import { Hint } from './Hint';
import { EARTH_BAND, SUN_BAND, windowsGradient } from '../timeline';

const SPEEDS = [
  { label: '1 hour / sec', pro: '1 h/s', hoursPerSec: 1 },
  { label: '6 hours / sec', pro: '6 h/s', hoursPerSec: 6 },
  { label: '1 day / sec', pro: '1 d/s', hoursPerSec: 24 },
];

export function TimeBar({ className }: { className?: string }) {
  const range = useData((s) => s.manifest?.time_range);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const setTime = useAppStore((s) => s.setTime);
  const siteId = useAppStore((s) => s.selectedSiteId);
  const ts = useTimeseries(siteId);
  const proMode = useAppStore((s) => s.proMode);
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

  const sun = useMemo(() => (ts ? windowsGradient(ts.lit, SUN_BAND) : null), [ts]);
  const earth = useMemo(
    () => (ts?.earth_visible ? windowsGradient(ts.earth_visible, EARTH_BAND) : null),
    [ts],
  );
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSunChange = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarthChange = ts?.earth_visible
    ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC)
    : null;

  if (!range) return null;
  const pct = t1 > t0 ? ((Math.min(t1, Math.max(t0, now)) - t0) / (t1 - t0)) * 100 : 0;
  const day = dayOfWindow(currentTimeUTC, range.start_utc, range.end_utc);
  const when = (h: number | null) =>
    h === null ? 'not in this window' : proMode ? formatHours(h) : friendlyHours(h);

  return (
    <section className={cn('box', className)} aria-label="Mission clock">
      <div className="box-head">
        Mission Clock
        <span className="num ml-auto font-sans text-[12.5px] font-bold tracking-normal normal-case">
          {proMode ? formatUtc(currentTimeUTC) : `Day ${day.day} of ${day.total}`}
        </span>
      </div>
      <div className="box-body flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-quiet w-[30px] px-0"
              onClick={() => {
                setPlaying(false);
                setTime(range.start_utc);
              }}
              aria-label="Back to day 1"
              title="Back to day 1"
            >
              <SkipBack className="size-3.5" />
            </button>
            <button
              type="button"
              className="btn btn-go w-[92px] text-[13px]"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
          <label className="flex items-center gap-2">
            <span className="label">Speed</span>
            <select
              className="field"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {SPEEDS.map((s, i) => (
                <option key={s.label} value={i}>
                  {proMode ? s.pro : s.label}
                </option>
              ))}
            </select>
          </label>
          {sample && (
            <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn('size-2.5 rounded-full', sample.lit ? 'bg-sun' : 'bg-edge-hi')}
                />
                {sample.lit ? 'Sunset in' : 'Sunrise in'}{' '}
                <b className="num text-heading">{when(toSunChange)}</b>
              </span>
              {sample.earthVisible !== null && (
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-2.5 rounded-full',
                      sample.earthVisible ? 'bg-earth' : 'bg-edge-hi',
                    )}
                  />
                  {sample.earthVisible ? 'Earthset in' : 'Earthrise in'}{' '}
                  <b className="num text-heading">{when(toEarthChange)}</b>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timeline: sunlit / Earth-in-view bands under a draggable slider. */}
        <div className="bg-panel-2 border-edge relative rounded-[4px] border px-1.5 pt-1.5 pb-0.5 shadow-[0_1px_2px_#17333618_inset]">
          <div className="pointer-events-none mx-[6px] overflow-hidden rounded-[2px]" aria-hidden>
            <div className="h-[7px]" style={{ background: sun ?? 'transparent' }} />
            <div className="mt-px h-[7px]" style={{ background: earth ?? 'transparent' }} />
          </div>
          <div
            className="bg-pink pointer-events-none absolute top-0 bottom-0 w-[2px]"
            style={{ left: `calc(6px + ${pct / 100} * (100% - 12px))` }}
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
            aria-valuetext={proMode ? formatUtc(currentTimeUTC) : `Day ${day.day} of ${day.total}`}
          />
        </div>
        <div className="text-ink-faint flex items-center justify-between gap-3 text-[11.5px]">
          <span className="num">{proMode ? range.start_utc.slice(0, 10) : 'Day 1'}</span>
          {ts ? (
            <span className="flex items-center gap-3">
              <span>
                <span className="text-sun">■</span> sunny
              </span>
              {ts.earth_visible && (
                <span>
                  <span className="text-earth">■</span> Earth in view
                </span>
              )}
              <Hint text="Each band shows when this site has the Sun (top) or Earth (bottom) above its horizon. Drag the slider or press Play to move through time." />
            </span>
          ) : (
            <span className="hidden sm:inline">
              Pick a site to see when it gets sun and can see Earth
            </span>
          )}
          <span className="num">{proMode ? range.end_utc.slice(0, 10) : `Day ${day.total}`}</span>
        </div>
      </div>
    </section>
  );
}
