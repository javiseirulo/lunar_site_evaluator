/**
 * The Mission mini-game: one screen per phase of `useGame`, over a background globe.
 *
 * The background `GameGlobe` stays mounted from the menu to the descent (one WebGL context, no
 * reload between shots, and the camera flies on from shot to shot): it spins behind the menu,
 * intro, alert and briefing, flies to the pole for the approach (ending it), stays there behind
 * the cards, and dives to the chosen site in the descent (ending it). From recon on it unmounts.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { clsx } from 'clsx';
import { useAppStore, useData } from '@/core';
import { useGameAudio } from '../audio/useGameAudio';
import { useGame, type Phase } from '../state/gameStore';
import { AlertScreen } from './AlertScreen';
import { MENU_BG } from './assets';
import { ExitControl } from './ExitControl';
import { ApproachScreen, DescentScreen } from './FlightScreens';
import { GameGlobe } from './GameGlobe';
import { parseGameParams } from './gameParams';
import { backgroundShot } from './globeShots';
import { SiteRecon } from './SiteRecon';
import { SoundControls } from './SoundControls';
import { sharedSelectionFor } from './reveal';
import { IntroScreen } from './IntroScreen';
import { MenuScreen } from './MenuScreen';
import { MissionFx } from './MissionFx';
import { TimelapseScreen } from './TimelapseScreen';
import { TimeoutScreen } from './TimeoutScreen';
import { useDealHand } from './useDealHand';
import { VerdictScreen } from './VerdictScreen';

/** Screens that show the in-game exit (X); the menu and end screens have their own buttons. */
const EXIT_PHASES: readonly Phase[] = [
  'intro',
  'alert',
  'briefing',
  'approach',
  'dealing',
  'choosing',
  'descent',
  'recon',
  'timelapse',
];

/** Phases whose screen lets the globe show through (darkened a little for readable text). */
const DIM_PHASES: readonly Phase[] = ['menu', 'intro'];

/** alert, briefing, dealing and choosing are one screen (content changes in place). */
function screenKey(phase: Phase): string {
  return phase === 'briefing' || phase === 'dealing' || phase === 'choosing' ? 'alert' : phase;
}

export function MissionGame() {
  const phase = useGame((s) => s.phase);
  const deal = useDealHand();
  const rootRef = useRef<HTMLDivElement>(null);
  useGameAudio(rootRef);

  // Optional reproducible-run params (?seed=…&skipIntro=1&difficulty=expert). Without params
  // this resets the config to the defaults (clock seeds, intro), i.e. no change of behaviour.
  useEffect(() => {
    const { difficulty, ...config } = parseGameParams(window.location.search);
    useGame.getState().configure(config, difficulty);
  }, []);

  // Leaving the page ends the game: a later visit starts from the menu (fresh deadline, and
  // the ?seed params apply again) instead of resuming a stale mission.
  useEffect(() => () => useGame.getState().quit(), []);

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

  // Background globe shot for this phase (numbered, anonymous markers only).
  const cards = useGame((s) => s.hand?.cards);
  const chosenSlot = useGame((s) => s.chosenSlot);
  const sites = useData((s) => s.sites);
  const shot = backgroundShot(phase, cards ?? [], chosenSlot, sites);
  const onShotDone = useCallback(() => {
    const g = useGame.getState();
    if (g.phase === 'approach') g.approached();
    else if (g.phase === 'descent') g.landed();
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
    case 'briefing':
    case 'dealing':
    case 'choosing':
      screen = <AlertScreen dealStatus={deal.status} onRetry={deal.retry} />;
      break;
    case 'approach':
      screen = <ApproachScreen />;
      break;
    case 'descent':
      screen = <DescentScreen />;
      break;
    case 'recon':
      screen = <SiteRecon />;
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
        {shot && (
          <div className="absolute inset-0">
            <GameGlobe
              shot={shot}
              onShotDone={onShotDone}
              fallbackSrc={phase === 'menu' ? MENU_BG : undefined}
            />
            <div
              aria-hidden
              className={clsx(
                'pointer-events-none absolute inset-0 transition-colors duration-500',
                DIM_PHASES.includes(phase) ? 'bg-black/35' : 'bg-transparent',
              )}
            />
          </div>
        )}
        <div className="relative flex min-h-10 items-center justify-between gap-2 pb-1.5">
          <span className="text-ink-faint min-w-0 truncate font-mono text-[10px] tracking-[0.3em] uppercase">
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
          className="relative flex min-w-0 flex-1 flex-col"
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
