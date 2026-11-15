/**
 * The emergency stage for `alert`, `dealing` and `choosing`: red alarm frame (flashing while
 * the alert is fresh), emergency briefing, countdown, and the card table once a hand is dealt.
 */
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useGame } from '../state/gameStore';
import { emergencyImage, scientistImage } from './assets';
import { emergencyById } from './content';
import { CardTable } from './CardTable';
import { Countdown } from './Countdown';
import { GameImage } from './GameImage';
import type { DealStatus } from './useDealHand';

export function AlertScreen({ dealStatus }: { dealStatus: DealStatus }) {
  const phase = useGame((s) => s.phase);
  const emergency = emergencyById(useGame((s) => s.emergencyId));
  const quit = useGame((s) => s.quit);

  if (phase === 'alert' && dealStatus !== 'loading') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="text-bad size-10" aria-hidden />
        <p className="font-mono text-lg font-bold tracking-wider text-white uppercase">
          {dealStatus === 'empty'
            ? 'No valid mission in this data window'
            : 'Could not load the site data'}
        </p>
        <p className="text-ink-muted max-w-md text-[12px]">
          {dealStatus === 'empty'
            ? 'None of the landing times in the loaded data gives a hand with both a safe and an unsafe site.'
            : 'The landing-site data failed to load. Check your connection and try again.'}
        </p>
        <button type="button" className="btn" onClick={quit}>
          Back to menu
        </button>
      </div>
    );
  }

  return (
    <div
      data-flash={phase === 'alert'}
      className="mission-frame mission-scan flex flex-1 flex-col gap-3 border-4 bg-[#12060a] p-3"
    >
      <header className="flex flex-wrap items-center gap-3">
        <AlertTriangle className="text-bad size-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[15px] leading-tight font-bold tracking-wider text-white uppercase">
            {emergency?.title ?? 'Emergency'}
          </h2>
          <p
            role="alert"
            className="mission-blink text-bad font-mono text-[12px] font-bold tracking-widest"
          >
            {emergency?.alarm ?? 'DIVERT NOW'}
          </p>
        </div>
        <Countdown />
      </header>

      <div className="flex items-start gap-3 border-2 border-black bg-black/60 p-2">
        <GameImage
          src={scientistImage('alarm')}
          alt="Dr. Regolith, alarmed"
          label="Dr. Regolith"
          className="size-14 shrink-0 border-2 border-black"
        />
        <p className="text-ink text-[12.5px] leading-snug">
          <span className="text-warn font-mono font-bold">DR. REGOLITH: </span>
          {emergency?.briefing}
        </p>
      </div>

      {phase === 'alert' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <GameImage
            src={emergencyImage(emergency?.id ?? null)}
            alt={emergency ? `${emergency.title} scene` : 'Emergency scene'}
            label="Emergency scene pending"
            className="h-40 w-full max-w-lg border-4 border-black"
          />
          <p className="text-ink-muted flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Computing reachable landing sites…
          </p>
        </div>
      ) : (
        <CardTable />
      )}
    </div>
  );
}
