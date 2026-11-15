/** The Mission mini-game: one screen per phase of `useGame`. */
import { useEffect, useRef, type ReactNode } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { useAppStore } from '@/core';
import { useGameAudio } from '../audio/useGameAudio';
import { useGame, type Phase } from '../state/gameStore';
import { AlertScreen } from './AlertScreen';
import { ExitControl } from './ExitControl';
import { parseGameParams } from './gameParams';
import { SoundControls } from './SoundControls';
import { sharedSelectionFor } from './reveal';
import { IntroScreen } from './IntroScreen';
import { MenuScreen } from './MenuScreen';
import { MissionFx } from './MissionFx';
import { TimelapseScreen } from './TimelapseScreen';
import { TimeoutScreen } from './TimeoutScreen';
import { TravelScreen } from './TravelScreen';
import { useDealHand } from './useDealHand';
import { VerdictScreen } from './VerdictScreen';

/** Screens that show the in-game exit (X); the menu and end screens have their own buttons. */
const EXIT_PHASES: readonly Phase[] = [
  'intro',
  'alert',
  'dealing',
  'choosing',
  'travel',
  'timelapse',
];

/** alert, dealing and choosing are one screen (the cards deal in place). */
function screenKey(phase: Phase): string {
  return phase === 'dealing' || phase === 'choosing' ? 'alert' : phase;
}

export function MissionGame() {
  const phase = useGame((s) => s.phase);
  const dealStatus = useDealHand();
  const rootRef = useRef<HTMLDivElement>(null);
  useGameAudio(rootRef);

  // Optional reproducible-run params (?seed=…&skipIntro=1&difficulty=expert). Without params
  // this resets the config to the defaults (clock seeds, intro), i.e. no change of behaviour.
  useEffect(() => {
    const { difficulty, ...config } = parseGameParams(window.location.search);
    useGame.getState().configure(config, difficulty);
  }, []);

  // Keep the real site name secret until the verdict: the site-wide header prints the name of
  // the selected site, so the selection is cleared during play and set at the verdict.
  const chosenSiteId = useGame(
    (s) => s.hand?.cards.find((c) => c.slot === s.chosenSlot)?.siteId ?? null,
  );
  useEffect(() => {
    const want = sharedSelectionFor(phase, chosenSiteId);
    if (want === undefined) return;
    const app = useAppStore.getState();
    if (app.selectedSiteId !== want) app.selectSite(want);
  }, [phase, chosenSiteId]);

  let screen: ReactNode;
  switch (phase) {
    case 'menu':
      screen = <MenuScreen />;
      break;
    case 'intro':
      screen = <IntroScreen />;
      break;
    case 'alert':
    case 'dealing':
    case 'choosing':
      screen = <AlertScreen dealStatus={dealStatus} />;
      break;
    case 'travel':
      screen = <TravelScreen />;
      break;
    case 'timelapse':
      screen = <TimelapseScreen />;
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
      <div
        ref={rootRef}
        className="mission-root bg-navy-950 text-ink relative flex min-h-[544px] w-full flex-col overflow-hidden font-sans"
      >
        <div className="flex min-h-10 items-center justify-between gap-2 pb-1.5">
          <span className="min-w-0 truncate font-mono text-[10px] tracking-[0.3em] text-ink-faint uppercase">
            {EXIT_PHASES.includes(phase) ? 'Mission in progress' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <SoundControls />
            {EXIT_PHASES.includes(phase) && <ExitControl />}
          </div>
        </div>
        {/* Enter-only transition: the old screen leaves at once (an exit animation would
            re-render it with the next phase's state), the new one fades and rises in. */}
        <motion.div
          key={screenKey(phase)}
          className="flex min-w-0 flex-1 flex-col"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {screen}
        </motion.div>
      </div>
    </MotionConfig>
  );
}
