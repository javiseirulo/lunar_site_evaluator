/**
 * `recon` phase: the player has touched down at the chosen site and can look around before
 * committing. PLACEHOLDER for Task 3 of #100 (Pablo's Street View through a `SiteRecon`
 * wrapper). The countdown keeps running here and can run out (→ timeout).
 *
 * "Simulate" → timelapse; "Choose another site" → back to the same cards (choice cleared).
 * The real site name stays hidden: only the card number is shown.
 */
import { Eye, Play, RotateCcw } from 'lucide-react';
import { useGame } from '../state/gameStore';
import { ORBIT_BG } from './assets';
import { Countdown } from './Countdown';
import { GameImage } from './GameImage';

export function ReconScreen() {
  const slot = useGame((s) => s.chosenSlot);
  const simulate = useGame((s) => s.simulate);
  const chooseAgain = useGame((s) => s.chooseAgain);
  const label = slot !== null ? `Landing site ${slot}` : 'Landing site';

  return (
    <div className="mission-scan flex flex-1 flex-col gap-3 border-4 border-black bg-[#05070f] p-3">
      <header className="flex flex-wrap items-center gap-3">
        <Eye className="text-warn size-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[15px] leading-tight font-bold tracking-wider text-white uppercase">
            Surface reconnaissance
          </h2>
          <p className="text-warn font-mono text-[12px] font-bold tracking-widest uppercase">
            {label}
          </p>
        </div>
        <Countdown />
      </header>

      <div className="relative min-h-[260px] flex-1 overflow-hidden border-2 border-black">
        <GameImage src={ORBIT_BG} alt="" className="absolute inset-0 size-full opacity-70" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <p className="max-w-md bg-black/75 px-3 py-2 text-center text-[12.5px] leading-snug text-ink">
            Look around before you commit: will a mountain hide the Sun or the Earth here? The 360°
            surface view is coming next.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn h-11 px-4" onClick={chooseAgain}>
          <RotateCcw className="size-4" aria-hidden />
          Choose another site
        </button>
        <button type="button" autoFocus className="btn btn-go h-11 px-5" onClick={simulate}>
          <Play className="size-4" aria-hidden />
          Simulate
        </button>
      </div>
    </div>
  );
}
