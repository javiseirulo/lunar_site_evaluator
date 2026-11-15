/** The countdown hit zero before a site was chosen: the emergency's catastrophe plays out. */
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useGame } from '../state/gameStore';
import { verdictImage } from './assets';
import { emergencyById } from './content';
import { alarmAsEmergency } from '../historic/data';
import { useCurrentMission } from '../historic/useCurrentMission';
import { GameButtons } from './GameButtons';
import { GameImage } from './GameImage';

export function TimeoutScreen() {
  const emergencyId = useGame((s) => s.emergencyId);
  const mission = useCurrentMission();
  const emergency = mission ? alarmAsEmergency(mission) : emergencyById(emergencyId);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mission-scan flex flex-1 flex-col items-center justify-center gap-4 border-4 border-bad bg-[#14060a] p-6 text-center"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        role="alert"
        className="text-bad font-mono text-3xl outline-none font-bold tracking-[0.15em] [text-shadow:4px_4px_0_#000] sm:text-4xl sm:tracking-[0.2em]"
      >
        OUT OF TIME
      </h2>
      <GameImage
        src={verdictImage('timeout')}
        alt="Lander lost after the countdown ran out"
        label="Scene pending"
        className="mission-pixel h-44 w-full max-w-lg border-4 border-black"
      />
      <p className="max-w-xl text-[13px] text-ink">
        {emergency?.catastrophe ?? 'The clock ran out before a landing site was chosen.'}
      </p>
      <p className="text-ink-muted font-mono text-[11px] tracking-wider uppercase">
        In an emergency, a good decision on time beats a perfect one too late.
      </p>
      <GameButtons />
    </motion.div>
  );
}
