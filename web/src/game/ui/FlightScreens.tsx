/**
 * Captions over the background globe (MissionGame's GameGlobe layer) while it flies:
 * - `approach`: to the south pole, where the hand's sites appear as numbered markers;
 * - `descent`: the dive to the chosen site (the countdown is held meanwhile).
 * The globe ends both shots (`approached()` / `landed()`); these screens only caption them.
 * The real site name stays hidden: only the card number is shown.
 */
import { Timer } from 'lucide-react';
import { useGame } from '../state/gameStore';
import { Countdown } from './Countdown';

function Caption({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mission-pixel mx-auto flex max-w-xl flex-col items-center gap-0.5 border-2 border-black bg-black/75 px-4 py-2 text-center">
      <p className="text-ink-muted font-mono text-[10.5px] tracking-[0.3em] uppercase">{kicker}</p>
      <p className="font-mono text-[15px] font-bold tracking-wider text-white uppercase">{title}</p>
    </div>
  );
}

export function ApproachScreen() {
  const count = useGame((s) => s.hand?.cards.length ?? 0);
  return (
    <div className="flex flex-1 flex-col justify-between gap-3 p-3">
      <Caption kicker="Course plotted" title="Approaching the lunar south pole" />
      <p
        role="status"
        className="mx-auto bg-black/70 px-3 py-1 font-mono text-[12px] tracking-widest text-[#ffd23f] uppercase"
      >
        {count} reachable landing sites
      </p>
    </div>
  );
}

export function DescentScreen() {
  const slot = useGame((s) => s.chosenSlot);
  return (
    <div className="flex flex-1 flex-col justify-between gap-3 p-3">
      <div className="flex flex-wrap items-start justify-center gap-3">
        <Caption
          kicker="Descending"
          title={slot !== null ? `Landing site ${slot}` : 'Landing site'}
        />
        <div className="flex flex-col items-center gap-1">
          <Countdown />
          <span className="flex items-center gap-1 bg-black/70 px-1.5 font-mono text-[10px] tracking-wider text-[#ffcc4d] uppercase">
            <Timer className="size-3" aria-hidden />
            Clock held
          </span>
        </div>
      </div>
    </div>
  );
}
