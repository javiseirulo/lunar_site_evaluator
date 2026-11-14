/** mm:ss until the store's `deadline`; calls `timeUp()` once when it reaches zero. */
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { clsx } from 'clsx';
import { useGame } from '../state/gameStore';
import { formatClock } from './format';

const TICK_MS = 200;
const LOW_MS = 30_000;

export function Countdown() {
  const deadline = useGame((s) => s.deadline);
  // A locked-in pick freezes the clock (the store also ignores timeUp then).
  const locked = useGame((s) => s.pendingSlot !== null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (locked) return;
    let fired = false;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
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
      className={clsx(
        'mission-pixel flex shrink-0 items-center gap-2 border-2 border-black px-3 py-1 font-mono',
        low ? 'bg-[#3a0606] text-bad' : 'bg-black text-warn',
      )}
    >
      <Timer className="size-4" aria-hidden />
      <span
        className={clsx('text-2xl leading-none font-bold tabular-nums', low && 'mission-blink')}
      >
        {formatClock(left)}
      </span>
    </div>
  );
}
