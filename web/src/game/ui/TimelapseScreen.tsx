/**
 * `timelapse` phase: plays the 7-day surface mission in ~25 s by driving the shared clock
 * (`setTime`) from the landing time. Map on the left, HUD on the right. It freezes at the
 * verdict's `failHour` (red freeze + cause stamp) or runs to the last hour (gold burst), holds
 * for a moment, then calls `finish()`.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FastForward, Moon, SatelliteDish, Snowflake, Sun, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import { sampleAt, useAppStore, useTimeseries } from '@/core';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import type { Verdict } from '../engine/simulate';
import { useGame } from '../state/gameStore';
import { CAUSE_HEADLINE } from './content';
import { MissionMap } from './MissionMap';
import {
  dayOfMission,
  isLinkUp,
  isoAtHour,
  missionHourAt,
  missionRuns,
  stopHourFor,
  TIMELAPSE_MS,
} from './timelapse';

const REQ = DEFAULT_REQUIREMENTS;
const DAYS = REQ.surface_days;
const MISSION_HOURS = DAYS * 24;
const DARK_LIMIT = REQ.max_dark_h.threshold;
const BLACKOUT_LIMIT = REQ.max_blackout_h.threshold;
/** How long the frozen end state stays on screen before the verdict. */
const HOLD_MS = 2500;

const GOOD = '#3ddc84';
const WARN = '#ffd23f';
const BAD = '#ff3b30';

function StatusRow({ on, icon, label }: { on: boolean | null; icon: ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-2 border-2 border-black bg-black/50 px-2 py-1.5 font-mono text-[12px] font-bold uppercase"
      style={{ color: on === null ? undefined : on ? GOOD : BAD }}
    >
      {icon}
      {label}
    </div>
  );
}

/** Current run of hours vs. its limit, as a bar that warms up towards the limit. */
function RunMeter({
  icon,
  label,
  value,
  limit,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  limit: number;
}) {
  const color = value > limit ? BAD : value >= limit * 0.75 ? WARN : GOOD;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase">
        <span className="text-ink-muted flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-bold" style={{ color }}>
          {value} h / {limit} h
        </span>
      </div>
      <div className="h-3 border-2 border-black bg-black/60">
        <div
          className="h-full"
          style={{ width: `${Math.min(100, (value / limit) * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** End-of-timelapse overlay: cause stamp on a loss, gold burst on a win. */
function EndOverlay({ verdict, hour }: { verdict: Verdict; hour: number }) {
  const when = `Day ${dayOfMission(hour, DAYS)} · hour ${hour}`;
  if (verdict.win) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.div
          className="absolute size-40 rounded-full"
          style={{
            background: `radial-gradient(circle, ${WARN} 0%, ${WARN}80 40%, transparent 70%)`,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 6, opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <motion.div
          role="status"
          className="mission-pixel relative border-4 border-black bg-[#ffd23f] px-5 py-3 text-center text-black"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        >
          <p className="font-mono text-xl font-bold tracking-widest uppercase">Mission complete</p>
          <p className="font-mono text-[12px] font-bold">All {DAYS} days survived</p>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#ff3b30]/15">
      <motion.div
        role="status"
        className="mission-pixel max-w-sm border-4 border-[#ff3b30] bg-[#14060a] px-5 py-3 text-center"
        initial={{ scale: 2.2, opacity: 0, rotate: -14 }}
        animate={{ scale: 1, opacity: 1, rotate: -6 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      >
        <p className="font-mono text-xl font-bold tracking-widest text-[#ff3b30] uppercase">
          Mission failed
        </p>
        <p className="text-[14px] font-bold text-white">
          {verdict.cause ? CAUSE_HEADLINE[verdict.cause] : 'The mission did not survive.'}
        </p>
        <p className="text-ink-muted font-mono text-[11px] uppercase">{when}</p>
      </motion.div>
    </div>
  );
}

export function TimelapseScreen() {
  const hand = useGame((s) => s.hand);
  const chosenSlot = useGame((s) => s.chosenSlot);
  const card = hand?.cards.find((c) => c.slot === chosenSlot);
  const reduced = useReducedMotion() ?? false;
  const ts = useTimeseries(card?.siteId);

  /** Whole mission hour on screen (the shared clock moves smoothly in between). */
  const [hour, setHour] = useState(0);
  const [ended, setEnded] = useState(false);
  const skipRef = useRef(false);
  const finishedRef = useRef(false);

  const landingUtc = hand?.landingUtc;
  const stop = card ? stopHourFor(card.verdict.failHour, MISSION_HOURS) : 0;

  useEffect(() => {
    // Nothing to play (should not happen): go straight to the verdict screen.
    if (!landingUtc || !card) {
      useGame.getState().finish();
      return;
    }
    let raf = 0;
    let hold = 0;
    const t0 = performance.now();

    const settle = () => {
      useAppStore.getState().setTime(isoAtHour(landingUtc, stop));
      setHour(stop);
      setEnded(true);
      hold = window.setTimeout(() => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        useGame.getState().finish();
      }, HOLD_MS);
    };

    const tick = (now: number) => {
      // Reduced motion: no playback, show the end state straight away.
      const h =
        reduced || skipRef.current
          ? stop
          : missionHourAt(now - t0, TIMELAPSE_MS, MISSION_HOURS, stop);
      if (h >= stop) {
        settle();
        return;
      }
      useAppStore.getState().setTime(isoAtHour(landingUtc, h));
      setHour(Math.floor(h));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hold);
    };
  }, [landingUtc, card, stop, reduced]);

  const runs = useMemo(
    () =>
      ts && hand ? missionRuns(ts, hand.startIndex, MISSION_HOURS, REQ.antenna_margin_deg) : null,
    [ts, hand],
  );

  if (!card || !landingUtc) return null;

  const sample = ts ? sampleAt(ts, isoAtHour(landingUtc, hour)) : null;
  const sunUp = sample ? sample.lit : null;
  const linkUp = sample
    ? isLinkUp(sample.earthVisible, sample.earth_el, REQ.antenna_margin_deg)
    : null;
  const day = dayOfMission(hour, DAYS);
  const lost = ended && !card.verdict.win;

  return (
    <div
      className={clsx(
        'mission-scan relative flex flex-1 flex-col gap-3 border-4 bg-[#05070f] p-3 md:flex-row',
        lost ? 'border-[#ff3b30]' : ended ? 'border-[#ffd23f]' : 'border-black',
      )}
    >
      <MissionMap
        className={clsx(
          'w-full max-w-[420px] self-center transition-[filter] md:w-[46%]',
          lost && 'grayscale',
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header>
          <p className="text-warn font-mono text-[11px] font-bold tracking-widest uppercase">
            Landing site {card.slot} · surface mission
          </p>
          <p className="font-mono text-3xl font-bold tracking-wider text-white uppercase">
            Day {day} of {DAYS}
          </p>
          <p className="text-ink-muted font-mono text-[11px] uppercase">
            Hour {hour} of {MISSION_HOURS}
          </p>
          <div className="mt-1 h-2 border-2 border-black bg-black/60">
            <div
              className="h-full bg-[#8fd3ff]"
              style={{ width: `${((hour + 1) / MISSION_HOURS) * 100}%` }}
            />
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <StatusRow
            on={sunUp}
            icon={
              sunUp === false ? (
                <Moon className="size-4" aria-hidden />
              ) : (
                <Sun className="size-4" aria-hidden />
              )
            }
            label={sunUp === null ? 'Sun —' : sunUp ? 'Sun up' : 'Sun down'}
          />
          <StatusRow
            on={linkUp}
            icon={
              linkUp === false ? (
                <WifiOff className="size-4" aria-hidden />
              ) : (
                <SatelliteDish className="size-4" aria-hidden />
              )
            }
            label={linkUp === null ? 'Earth link —' : linkUp ? 'Earth link up' : 'Earth link down'}
          />
        </div>

        <div className="flex flex-col gap-2 border-2 border-black bg-black/40 p-2">
          <RunMeter
            icon={<Snowflake className="size-3.5" aria-hidden />}
            label="Battery night"
            value={runs?.dark[hour] ?? 0}
            limit={DARK_LIMIT}
          />
          <RunMeter
            icon={<WifiOff className="size-3.5" aria-hidden />}
            label="Comms blackout"
            value={runs?.blackout[hour] ?? 0}
            limit={BLACKOUT_LIMIT}
          />
        </div>

        <div className="mt-auto flex justify-end">
          <button
            type="button"
            className="btn h-8 px-3 text-[12px]"
            disabled={ended}
            onClick={() => {
              skipRef.current = true;
            }}
          >
            <FastForward className="size-4" aria-hidden />
            Skip
          </button>
        </div>
      </div>

      {ended && <EndOverlay verdict={card.verdict} hour={stop} />}
    </div>
  );
}
