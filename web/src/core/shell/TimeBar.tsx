/**
 * Shared time control bound to `currentTimeUTC`. Any mode can drop it in.
 * When a site is selected it also shows that site's sunlight and Earth-visibility windows.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { useData } from '../data';
import { useActiveSeries } from '@/ephem/activeSeries';
import { formatHours, formatUtc } from '../format';
import {
  changeLead,
  changeWhen,
  nextChange,
  sampleAt,
  seriesSpanLabel,
  type NextChange,
} from '../timeseries';
import { dayOfWindow, friendlyHours } from '../metrics';
import { EARTH_BAND, SUN_BAND, windowsGradient } from '../timeline';

const SPEEDS = [
  { label: '1 hour / sec', pro: '1 h/s', hoursPerSec: 1 },
  { label: '6 hours / sec', pro: '6 h/s', hoursPerSec: 6 },
  { label: '1 day / sec', pro: '1 d/s', hoursPerSec: 24 },
  { label: '2 days / sec', pro: '2 d/s', hoursPerSec: 48 },
  { label: '5 days / sec', pro: '5 d/s', hoursPerSec: 120 },
  { label: '10 days / sec', pro: '10 d/s', hoursPerSec: 240 },
];
const DEFAULT_SPEED = 3; // 2 days / sec
const clampSpeed = (i: number) => (Number.isInteger(i) && SPEEDS[i] ? i : DEFAULT_SPEED);

export function TimeBar({ className }: { className?: string }) {
  const range = useData((s) => s.manifest?.time_range);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const setTime = useAppStore((s) => s.setTime);
  const active = useActiveSeries();
  const ts = active.ts;
  const proMode = useAppStore((s) => s.proMode);
  const [playing, setPlaying] = useState(false);
  const simulationStarted = useAppStore((s) => s.simulationStarted);
  const setSimulationStarted = useAppStore((s) => s.setSimulationStarted);
  const clockResetNonce = useAppStore((s) => s.clockResetNonce);
  const resetClock = useAppStore((s) => s.resetClock);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  const t0 = range ? Date.parse(range.start_utc) : 0;
  // end_utc is exclusive (contracts/README v1.1): the last sample is one step earlier.
  const t1 = range ? Date.parse(range.end_utc) - range.step_s * 1000 : 0;
  const now = Date.parse(currentTimeUTC);

  // A reset from outside (end-simulation confirm) stops playback at once: adjust during render.
  const [seenReset, setSeenReset] = useState(clockResetNonce);
  if (seenReset !== clockResetNonce) {
    setSeenReset(clockResetNonce);
    setPlaying(false);
  }

  // Playback loop: advance the shared clock while playing.
  const raf = useRef(0);
  useEffect(() => {
    if (!playing || !range) return;
    const nonce = useAppStore.getState().clockResetNonce;
    let last = performance.now();
    const tick = (frame: number) => {
      if (useAppStore.getState().clockResetNonce !== nonce) return;
      const dt = (frame - last) / 1000;
      last = frame;
      const { currentTimeUTC: cur, setTime: set } = useAppStore.getState();
      const next = Date.parse(cur) + dt * SPEEDS[clampSpeed(speed)]!.hoursPerSec * 3_600_000;
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
  const toSunChange = nextChange(ts, ts?.lit, currentTimeUTC);
  const toEarthChange = nextChange(ts, ts?.earth_visible, currentTimeUTC);

  if (!range) return null;
  const pct = t1 > t0 ? ((Math.min(t1, Math.max(t0, now)) - t0) / (t1 - t0)) * 100 : 0;
  const day = dayOfWindow(currentTimeUTC, range.start_utc, range.end_utc);
  const span = ts ? seriesSpanLabel(ts) : '';
  // Normal mode asks for Simulate first; Expert keeps Play / Pause.
  const label = playing ? 'Pause' : proMode ? 'Play' : simulationStarted ? 'Resume' : 'Simulate';
  const when = (n: NextChange) =>
    changeWhen(n, span, (h) => (proMode ? formatHours(h) : friendlyHours(h)));

  return (
    <section
      className={cn('box relative overflow-hidden px-4 py-3', className)}
      aria-label="Mission clock"
    >
      {playing && <div className="clock-scan" aria-hidden />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-heading text-[17px] font-medium">Mission Clock</h2>
        <span
          className={cn(
            'font-mono text-[11px] tracking-[0.12em] uppercase',
            playing ? 'text-[#ffcc4d]' : 'text-ink-faint',
          )}
          role="status"
        >
          <span className={cn('mr-1.5 inline-block', playing && 'clock-dot')} aria-hidden>
            ●
          </span>
          {playing ? 'Running' : 'Paused'}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {proMode && (
            <button
              type="button"
              className="btn btn-quiet w-[32px] px-0"
              onClick={() => resetClock(range.start_utc)}
              aria-label="Back to day 1"
              title="Back to day 1"
            >
              <SkipBack className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            className="btn btn-go w-[88px]"
            onClick={() => {
              // Normal: the first press on Simulate marks the simulation as started for this selection.
              if (!proMode && !playing) setSimulationStarted(true);
              setPlaying((p) => !p);
            }}
            aria-label={label}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {label}
          </button>
          <select
            className="field"
            value={clampSpeed(speed)}
            onChange={(e) => setSpeed(clampSpeed(Number(e.target.value)))}
            aria-label="Speed"
          >
            {SPEEDS.map((s, i) => (
              <option key={s.label} value={i}>
                {proMode ? s.pro : s.label}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
        <span className="num text-heading text-[22px] leading-tight font-medium">
          {proMode ? formatUtc(currentTimeUTC, { seconds: true }) : `Day ${day.day}`}
        </span>
        <span className="num text-ink-muted text-[13px]">
          {proMode ? `Day ${day.day} of ${day.total}` : `of ${day.total}`}
        </span>
      </div>

      {/* Timeline: sunlit (orange) / Earth in view (blue) bands under the slider. */}
      <div className="relative mt-3">
        <div className="pointer-events-none mx-[8px] overflow-hidden rounded-full" aria-hidden>
          <div className="h-[5px] bg-white/5" style={{ background: sun ?? undefined }} />
          <div className="mt-[2px] h-[5px] bg-white/5" style={{ background: earth ?? undefined }} />
        </div>
        <div
          className="bg-heading pointer-events-none absolute -top-1 -bottom-1 w-[2px]"
          style={{ left: `calc(8px + ${pct / 100} * (100% - 16px))` }}
          aria-hidden
        />
        <input
          type="range"
          className="range range-progress relative -mt-1"
          style={{ ['--pct' as string]: `${pct}%` }}
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
      <div className="text-ink-faint mt-1 flex flex-wrap items-center justify-between gap-x-3 text-[12px]">
        {ts ? (
          <span className="flex items-center gap-3">
            <span>
              <span className="text-sun">●</span> sunny
            </span>
            {ts.earth_visible && (
              <span>
                <span className="text-earth">●</span> Earth in view
              </span>
            )}
          </span>
        ) : (
          <span>
            {active.kind === 'point'
              ? active.error
                ? 'Ephemeris unavailable for this point'
                : 'Computing…'
              : 'Pick a site to see when it gets sun and sees Earth'}
          </span>
        )}
        {proMode && sample && (
          <span>
            {changeLead(sample.lit ? 'Sunset' : 'Sunrise', toSunChange)}{' '}
            <b className="text-heading">{when(toSunChange)}</b>
            {sample.earthVisible !== null && (
              <>
                {', '}
                {changeLead(sample.earthVisible ? 'Earthset' : 'Earthrise', toEarthChange)}{' '}
                <b className="text-heading">{when(toEarthChange)}</b>
              </>
            )}
          </span>
        )}
      </div>
    </section>
  );
}
