/** The Mission mini-game: one screen per phase of `useGame`. */
import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useGame } from '../state/gameStore';
import { AlertScreen } from './AlertScreen';
import { MenuScreen } from './MenuScreen';
import { MissionFx } from './MissionFx';
import { TimeoutScreen } from './TimeoutScreen';
import { useDealHand } from './useDealHand';
import { VerdictScreen } from './VerdictScreen';

/** Temporary stand-in for a phase whose real screen is not built yet: shows a label and moves on. */
function AutoAdvance({
  label,
  delayMs,
  onDone,
}: {
  label: string;
  delayMs: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onDone, delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs, onDone]);
  return (
    <div className="flex flex-1 items-center justify-center gap-2 font-mono text-[12px] tracking-widest text-ink-muted uppercase">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {label}
    </div>
  );
}

// Stable callbacks so AutoAdvance's effect does not restart on re-render.
const skipIntro = () => useGame.getState().skipIntro();
const landed = () => useGame.getState().landed();
const finish = () => useGame.getState().finish();

export function MissionGame() {
  const phase = useGame((s) => s.phase);
  const dealStatus = useDealHand();

  let screen: ReactNode;
  switch (phase) {
    case 'menu':
      screen = <MenuScreen />;
      break;
    case 'intro':
      // Replaced in Task 6 (pixel scientist intro).
      screen = (
        <AutoAdvance key="intro" label="Incoming transmission…" delayMs={0} onDone={skipIntro} />
      );
      break;
    case 'alert':
    case 'dealing':
    case 'choosing':
      screen = <AlertScreen dealStatus={dealStatus} />;
      break;
    case 'travel':
      // Replaced in Task 5 (travel + timelapse).
      screen = (
        <AutoAdvance
          key="travel"
          label="Flying to the landing site…"
          delayMs={1000}
          onDone={landed}
        />
      );
      break;
    case 'timelapse':
      // Replaced in Task 5 (travel + timelapse).
      screen = (
        <AutoAdvance
          key="timelapse"
          label="Simulating the mission…"
          delayMs={1000}
          onDone={finish}
        />
      );
      break;
    case 'verdict':
      screen = <VerdictScreen />;
      break;
    case 'timeout':
      screen = <TimeoutScreen />;
      break;
  }

  return (
    <MotionConfig reducedMotion="user">
      <MissionFx />
      <div className="bg-navy-950 text-ink relative flex min-h-[544px] w-full flex-col overflow-hidden font-sans">
        {screen}
      </div>
    </MotionConfig>
  );
}
