/**
 * Secondary timelapse view ("Map" tab): the polar map with the selected site, the Sun / Earth
 * link lamps, the dark and blackout run meters, and the end-of-mission stamp.
 */
import { memo, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Moon, SatelliteDish, Snowflake, Sun, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import type { Verdict } from '../../engine/simulate';
import { CAUSE_HEADLINE } from '../content';
import { MissionMap } from '../MissionMap';
import { BAD, GOOD, runColor, WARN } from './palette';

// The map does not depend on the clock: keep it out of the per-frame re-renders.
const StaticMap = memo(MissionMap);

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
  const color = runColor(value, limit);
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

/** End-of-timelapse overlay for the map view: cause stamp on a loss, gold burst on a win. */
function EndOverlay({ verdict, when, days }: { verdict: Verdict; when: string; days: number }) {
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
          <p className="font-mono text-[12px] font-bold">All {days} days survived</p>
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

interface MapViewProps {
  /** Chosen site: drawn as an unnamed marker on the map. */
  siteId: string;
  sunUp: boolean | null;
  linkUp: boolean | null;
  darkRun: number;
  darkLimit: number;
  blackoutRun: number;
  blackoutLimit: number;
  ended: boolean;
  verdict: Verdict;
  when: string;
  days: number;
}

export function MapView({
  siteId,
  sunUp,
  linkUp,
  darkRun,
  darkLimit,
  blackoutRun,
  blackoutLimit,
  ended,
  verdict,
  when,
  days,
}: MapViewProps) {
  const lost = ended && !verdict.win;
  return (
    <div className="relative flex flex-1 flex-col gap-3 md:flex-row">
      <StaticMap
        siteId={siteId}
        className={clsx(
          'w-full max-w-[420px] self-center transition-[filter] md:w-[46%]',
          lost && 'grayscale',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
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
            value={darkRun}
            limit={darkLimit}
          />
          <RunMeter
            icon={<WifiOff className="size-3.5" aria-hidden />}
            label="Comms blackout"
            value={blackoutRun}
            limit={blackoutLimit}
          />
        </div>
      </div>
      {ended && <EndOverlay verdict={verdict} when={when} days={days} />}
    </div>
  );
}
