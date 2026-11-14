/** The Mission mini-game: one screen per phase of `useGame`. */
import type { ReactNode } from 'react';
import { MotionConfig } from 'motion/react';
import { useGame } from '../state/gameStore';
import { AlertScreen } from './AlertScreen';
import { IntroScreen } from './IntroScreen';
import { MenuScreen } from './MenuScreen';
import { MissionFx } from './MissionFx';
import { TimelapseScreen } from './TimelapseScreen';
import { TimeoutScreen } from './TimeoutScreen';
import { TravelScreen } from './TravelScreen';
import { useDealHand } from './useDealHand';
import { VerdictScreen } from './VerdictScreen';

export function MissionGame() {
  const phase = useGame((s) => s.phase);
  const dealStatus = useDealHand();

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
      <div className="bg-navy-950 text-ink relative flex min-h-[544px] w-full flex-col overflow-hidden font-sans">
        {screen}
      </div>
    </MotionConfig>
  );
}
