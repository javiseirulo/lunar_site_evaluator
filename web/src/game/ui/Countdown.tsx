/**
 * mm:ss until the store's `deadline`; calls `timeUp()` once when it reaches zero. Ticks each
 * of the last 10 seconds, buzzes at zero, turns red and pulses in the last 30 s, and announces
 * 60 / 30 / 10 seconds left to screen readers.
 */
import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { clsx } from 'clsx';
import { sfx } from '../audio/sfx';
import { countdownCue } from '../audio/theory';
import { useGame } from '../state/gameStore';
import { formatClock } from './format';

const TICK_MS = 200;
const LOW_MS = 30_000;
const ANNOUNCE_AT = [60, 30, 10];

export function Countdown() {
  const deadline = useGame((s) => s.deadline);
  // A locked-in pick freezes the clock (the store also ignores timeUp then).
  const locked = useGame((s) => s.pendingSlot !== null);
  const [now, setNow] = useState(() => Date.now());
  const [announce, setAnnounce] = useState('');
  const lastSecond = useRef<number | null>(null);

  useEffect(() => {
    if (locked) return;
    let fired = false;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const secs = Math.max(0, Math.ceil((deadline - t) / 1000));
      if (lastSecond.current !== null && secs < lastSecond.current) {
        const cue = countdownCue(secs);
        if (cue === 'tick') sfx.tick(secs <= 3);
        else if (cue === 'zero') sfx.zero();
        if (ANNOUNCE_AT.includes(secs)) setAnnounce(`${secs} seconds left`);
      }
      lastSecond.current = secs;
      if (!fired && t >= deadline) {
        fired = true;
        window.clearInterval(id);
        useGame.getState().timeUp();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [deadline, locked]);

  const left = Math.max(0, deadline - now);
  const low = left <= LOW_MS;

  return (
    <div
      role="timer"
      aria-label={`Time left ${formatClock(left)}`}
      data-low={low}
      className={clsx(
        'mission-pixel mission-timer flex shrink-0 items-center gap-2 border-2 border-black px-3 py-1 font-mono transition-colors duration-500',
        low ? 'bg-[#3a0606] text-bad' : 'bg-black text-warn',
      )}
    >
      <Timer className="size-4" aria-hidden />
      <span className="text-2xl leading-none font-bold tabular-nums">{formatClock(left)}</span>
      <span className="sr-only" aria-live="assertive">
        {announce}
      </span>
    </div>
  );
}
