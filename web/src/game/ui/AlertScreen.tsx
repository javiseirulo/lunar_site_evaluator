/**
 * The emergency stage for `alert`, `briefing`, `dealing` and `choosing`: red alarm frame
 * (flashing while the alert is fresh), countdown, and per phase:
 * - `alert`: the animated emergency scene (`EmergencyScene`); moves on to the briefing by itself
 *   (or "Continue").
 * - `briefing`: Dr. Regolith, shaking, blurts out what happened and what to do (fast typing);
 *   the end of his dialogue plots the approach once the hand is dealt (it deals in the background
 *   since the alert; if it is not ready yet, the approach starts as soon as it is).
 * - `dealing` / `choosing`: the briefing line and the card table, over the faint polar globe.
 */
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Loader2, Navigation } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '@/core';
import { useGame } from '../state/gameStore';
import { scientistImage } from './assets';
import { emergencyById } from './content';
import { alarmAsEmergency } from '../historic/data';
import { useCurrentMission } from '../historic/useCurrentMission';
import { NarratorPortrait } from './NarratorPortrait';
import { CardTable } from './CardTable';
import { DialogueBox } from './DialogueBox';
import { EmergencyScene } from './EmergencyScene';
import { briefingLines, PANIC_CPS } from './emergencyFx';
import { Countdown } from './Countdown';
import { GameImage } from './GameImage';
import type { DealStatus } from './useDealHand';

/** How long the alarm and emergency scene play before the briefing. */
const ALERT_MS = 3500;

export function AlertScreen({
  dealStatus,
  onRetry,
}: {
  dealStatus: DealStatus;
  onRetry: () => void;
}) {
  const phase = useGame((s) => s.phase);
  const hasHand = useGame((s) => s.hand !== null);
  const emergencyId = useGame((s) => s.emergencyId);
  const mission = useCurrentMission();
  // Historical: the mission's own alarm (if it had one) and its narrator; South Pole: the doctor.
  const emergency = mission ? alarmAsEmergency(mission) : emergencyById(emergencyId);
  const calm = mission !== null && emergency === null;
  const speaker = mission ? mission.narrator.name : 'Dr. Regolith';
  const lines = mission
    ? [...(emergency ? [emergency.briefing] : []), ...mission.briefing]
    : briefingLines(emergency?.briefing);
  const target = mission ? 'Plot approach to the landing area' : 'Plot approach to the south pole';
  const quit = useGame((s) => s.quit);
  // The shared site list itself failed: a deal retry cannot fix that, only a page reload.
  const sitesFailed = useData((s) => s.status === 'error');
  // A brief screen shake when the emergency first appears (not on a retry, which skips the alert).
  const [shake] = useState(() => phase === 'alert');
  // The doctor finished (or was skipped) before the hand was dealt: plot the approach once it is.
  const [wantsApproach, setWantsApproach] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (wantsApproach && hasHand) useGame.getState().endBriefing();
  }, [wantsApproach, hasHand]);

  // The alarm plays for a moment, then the doctor explains.
  useEffect(() => {
    if (phase !== 'alert') return;
    const id = window.setTimeout(() => useGame.getState().endAlert(), ALERT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  const preDeal = phase === 'alert' || phase === 'briefing';
  // Historical: wait for the mission file (small) so the right narrator and alarm show.
  const waitingMission = useGame((s) => s.mode === 'historical') && mission === null;
  if (preDeal && !hasHand && dealStatus !== 'loading') {
    return (
      <div className="bg-navy-950 flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
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
        <div className="flex flex-wrap justify-center gap-2">
          {dealStatus === 'error' && !sitesFailed && (
            <button type="button" className="btn btn-go h-10 px-4" onClick={onRetry}>
              Retry
            </button>
          )}
          <button type="button" className="btn h-10 px-4" onClick={quit}>
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  if (waitingMission) {
    return (
      <div className="bg-navy-950 flex flex-1 items-center justify-center p-6">
        <Loader2
          className="text-ink-muted size-6 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      </div>
    );
  }

  return (
    <motion.div
      data-flash={phase === 'alert'}
      className={clsx(
        'mission-frame mission-scan flex flex-1 flex-col gap-3 border-4 p-3',
        // A historical mission without an alarm: a calm blue console, not the red alarm frame.
        calm && 'border-edge!',
        // Over the cards the polar globe shows through a little.
        calm
          ? preDeal
            ? 'bg-navy-950'
            : 'bg-navy-950/85'
          : preDeal
            ? 'bg-[#12060a]'
            : 'bg-[#12060a]/85',
      )}
      initial={false}
      animate={shake ? { x: [0, -9, 8, -6, 5, -3, 2, 0] } : undefined}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <header className="flex flex-wrap items-center gap-3">
        {calm ? (
          <Navigation className="text-warn size-6 shrink-0" aria-hidden />
        ) : (
          <AlertTriangle className="text-bad size-6 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[15px] leading-tight font-bold tracking-wider text-white uppercase">
            {calm ? `${mission.name} · landing site selection` : (emergency?.title ?? 'Emergency')}
          </h2>
          {calm ? (
            <p className="text-warn font-mono text-[12px] font-bold tracking-widest">
              {`${mission.year} · ${mission.country}`}
            </p>
          ) : (
            <p
              role="alert"
              className="mission-blink text-bad font-mono text-[12px] font-bold tracking-widest"
            >
              {emergency?.alarm ?? 'DIVERT NOW'}
            </p>
          )}
        </div>
        <Countdown />
      </header>

      {phase !== 'alert' && phase !== 'briefing' && (
        <div className="flex items-start gap-3 border-2 border-black bg-black/60 p-2">
          {mission ? (
            <NarratorPortrait
              narrator={mission.narrator}
              mood="neutral"
              className="size-14 shrink-0 border-2 border-black bg-black/60"
            />
          ) : (
            <GameImage
              src={scientistImage('alarm')}
              alt="Dr. Regolith, alarmed"
              label="Dr. Regolith"
              className="size-14 shrink-0 border-2 border-black"
            />
          )}
          <p className="text-ink text-[12.5px] leading-snug">
            <span className="text-warn font-mono font-bold">{speaker.toUpperCase()}: </span>
            {lines.at(-1)}
          </p>
        </div>
      )}

      {phase === 'alert' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <EmergencyScene
            emergencyId={emergency?.id ?? null}
            title={emergency?.title}
            className="max-w-2xl"
          />
          <button
            type="button"
            className="btn h-10 px-4"
            onClick={() => useGame.getState().endAlert()}
          >
            Continue
          </button>
        </div>
      ) : phase === 'briefing' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 sm:flex-row">
          <motion.div
            className="mission-bezel relative shrink-0 p-1.5"
            animate={
              calm
                ? { x: 0, rotate: 0 }
                : typing
                  ? { x: [0, -4, 3, -3, 4, -2, 0], rotate: [0, -2, 2, -1.5, 1.5, 0] }
                  : { x: [0, -1.5, 1.5, 0], rotate: 0 }
            }
            transition={{
              duration: typing ? 0.35 : 0.6,
              repeat: calm ? 0 : Infinity,
              ease: 'linear',
            }}
          >
            <NarratorPortrait
              narrator={mission?.narrator ?? null}
              mood={calm ? 'neutral' : 'alarm'}
              className="size-28 bg-black/60 sm:size-36"
            />
            {!calm && (
              <span
                aria-hidden
                className="mission-blink absolute -top-2 -right-2 border-2 border-black bg-[#ff3b30] px-1 font-mono text-[11px] font-bold text-white"
              >
                !!
              </span>
            )}
          </motion.div>
          <div className="flex w-full max-w-2xl min-w-0 flex-1 flex-col gap-2">
            <DialogueBox
              key={speaker}
              speaker={speaker}
              lines={lines}
              cps={calm ? undefined : PANIC_CPS}
              doneLabel={target}
              onTypingChange={setTyping}
              onDone={() => setWantsApproach(true)}
              onSkip={() => setWantsApproach(true)}
            />
            {wantsApproach && !hasHand && (
              <p className="text-ink-muted flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Computing reachable landing sites…
              </p>
            )}
          </div>
        </div>
      ) : (
        <CardTable />
      )}
    </motion.div>
  );
}
