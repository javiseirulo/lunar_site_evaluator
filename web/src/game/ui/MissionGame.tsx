/** The Mission mini-game: one screen per phase of `useGame`. */
import { useEffect, type ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { useGame, type Phase } from '../state/gameStore';
import { AlertScreen } from './AlertScreen';
import { ExitControl } from './ExitControl';
import { parseGameParams } from './gameParams';
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

export function MissionGame() {
  const phase = useGame((s) => s.phase);
  const dealStatus = useDealHand();

  // Optional reproducible-run params (?seed=…&skipIntro=1&difficulty=expert). Without params
  // this resets the config to the defaults (clock seeds, intro), i.e. no change of behaviour.
  useEffect(() => {
    const { difficulty, ...config } = parseGameParams(window.location.search);
    useGame.getState().configure(config, difficulty);
  }, []);

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
      <div className="mission-root bg-navy-950 text-ink relative flex min-h-[544px] w-full flex-col overflow-hidden font-sans">
        {EXIT_PHASES.includes(phase) && (
          <div className="flex items-center justify-between gap-2 pb-1.5">
            <span className="font-mono text-[10px] tracking-[0.3em] text-ink-faint uppercase">
              Mission in progress
            </span>
            <ExitControl />
          </div>
        )}
        {screen}
      </div>
    </MotionConfig>
  );
}
