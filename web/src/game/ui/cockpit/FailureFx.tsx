/**
 * End-of-mission effects drawn over the cockpit window: frost and dimmed lights for `cold`,
 * an "Earth lost" indicator for `blackout`, a warm glow for a win, and the cause stamp.
 * Motion only fades/scales; with reduced motion the final state shows straight away.
 */
import { motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { useMissionRules } from '../../state/useMissionRules';
import { CAUSE_HEADLINE } from '../content';
import type { CockpitFx } from './faults';

/** Frost crystals growing from the window corners. */
function Frost() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2.2, ease: 'easeOut' }}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#c8e6ff66_70%,#eef8ffdd_100%)]" />
      <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <g stroke="#f2fbff" strokeWidth="1.5" fill="none" opacity="0.85">
          {[
            [0, 0, 1, 1],
            [400, 0, -1, 1],
            [0, 200, 1, -1],
            [400, 200, -1, -1],
          ].map(([x, y, dx, dy], i) => (
            <g key={i}>
              <path d={`M${x},${y} l${dx! * 60},${dy! * 34} l${dx! * 14},${dy! * -10}`} />
              <path d={`M${x},${y} l${dx! * 26},${dy! * 52} l${dx! * 12},${dy! * 4}`} />
              <path d={`M${x! + dx! * 30},${y! + dy! * 17} l${dx! * 4},${dy! * 16}`} />
              <path d={`M${x},${y} l${dx! * 80},${dy! * 12}`} />
            </g>
          ))}
        </g>
      </svg>
    </motion.div>
  );
}

export function WindowFx({ fx }: { fx: CockpitFx }) {
  if (fx === 'cold') return <Frost />;
  if (fx === 'blackout') {
    return (
      // Top-centre: the illustrated cabin frame covers the glass's top corners (the window is
      // a trapezoid, narrower at the top), so a corner badge would be hidden.
      <div className="pointer-events-none absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 border-2 border-[#ff3b30] bg-black/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-[#ff3b30] uppercase">
        <WifiOff className="mission-blink size-3.5" aria-hidden />
        Earth lost
      </div>
    );
  }
  if (fx === 'win') {
    return (
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_70%,#ffd27a66_0%,#ff9a3c22_45%,transparent_75%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
    );
  }
  return null;
}

/** The result stamp in the middle of the window. */
export function CauseStamp({ fx, when }: { fx: CockpitFx; when: string }) {
  const DAYS = useMissionRules().surface_days;
  if (fx === null) return null;
  const win = fx === 'win';
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
      <motion.div
        role="status"
        className="mission-pixel max-w-[90%] border-4 px-3 py-2 text-center"
        style={{
          borderColor: win ? '#3ddc84' : '#ff3b30',
          background: win ? '#04170c' : '#14060a',
        }}
        initial={{ scale: 2, opacity: 0, rotate: win ? 0 : -12 }}
        animate={{ scale: 1, opacity: 1, rotate: win ? 0 : -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: win ? 0.2 : 0.6 }}
      >
        <p
          className="font-mono text-[15px] leading-tight font-bold tracking-widest uppercase sm:text-lg"
          style={{ color: win ? '#3ddc84' : '#ff3b30' }}
        >
          {win ? 'All systems nominal' : 'Mission failed'}
        </p>
        <p className="text-[12px] font-bold text-white sm:text-[14px]">
          {fx === 'win' ? `${DAYS} days survived` : CAUSE_HEADLINE[fx]}
        </p>
        <p className="font-mono text-[10px] text-[#9fb2d0] uppercase">{when}</p>
      </motion.div>
    </div>
  );
}
