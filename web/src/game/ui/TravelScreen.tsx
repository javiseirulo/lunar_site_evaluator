/**
 * `travel` phase (~4 s): the lander swings along an orbit ring, descends onto the chosen
 * landing site's marker, then calls `landed()`. The real site name stays hidden.
 */
import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { useAppStore } from '@/core';
import { useGame } from '../state/gameStore';
import { LANDER_ICON } from './assets';
import { GameImage } from './GameImage';

const TRAVEL_MS = 4000;
const TRAVEL_REDUCED_MS = 800;
/** Seconds of lander motion (the rest of TRAVEL_MS is the touchdown beat). */
const FLIGHT_S = 3.4;

// Lander path in % of the scene: part of the orbit ring (ellipse centred at 50%/27%), then the
// descent to the site marker at 50%/76%.
const PATH_LEFT = ['12%', '23%', '50%', '77%', '88%', '77%', '50%', '50%'];
const PATH_TOP = ['27%', '17%', '13%', '17%', '27%', '37%', '41%', '76%'];
const PATH_TIMES = [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.55, 1];
const LANDED = { left: '50%', top: '76%' };

/** Tiny pixel-style lander used until `lander/lander-icon.png` exists. */
function LanderGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-full" shapeRendering="crispEdges" aria-hidden>
      <rect x="5" y="2" width="6" height="6" fill="#e0b040" stroke="#000" strokeWidth="1" />
      <rect x="6" y="3" width="2" height="2" fill="#8fd3ff" />
      <rect x="4" y="8" width="8" height="2" fill="#c9c9c9" stroke="#000" strokeWidth="1" />
      <path d="M5 10 L3 14 M11 10 L13 14" stroke="#000" strokeWidth="1.5" />
      <rect x="2" y="13" width="3" height="1" fill="#000" />
      <rect x="11" y="13" width="3" height="1" fill="#000" />
    </svg>
  );
}

export function TravelScreen() {
  const hand = useGame((s) => s.hand);
  const chosenSlot = useGame((s) => s.chosenSlot);
  const card = hand?.cards.find((c) => c.slot === chosenSlot);
  const reduced = useReducedMotion() ?? false;
  const siteId = card?.siteId;
  const landingUtc = hand?.landingUtc;

  // The pick already shared the choice; only write if something else changed it since.
  useEffect(() => {
    if (!siteId || !landingUtc) return;
    const app = useAppStore.getState();
    if (app.selectedSiteId !== siteId) app.selectSite(siteId);
    if (app.currentTimeUTC !== landingUtc) app.setTime(landingUtc);
  }, [siteId, landingUtc]);

  useEffect(() => {
    const id = window.setTimeout(
      () => useGame.getState().landed(),
      reduced ? TRAVEL_REDUCED_MS : TRAVEL_MS,
    );
    return () => window.clearTimeout(id);
  }, [reduced]);

  const label = chosenSlot !== null ? `Landing site ${chosenSlot}` : 'Landing site';

  return (
    <div className="mission-scan flex flex-1 flex-col gap-2 border-4 border-black bg-[#05070f] p-3">
      <p className="text-ink-muted text-center font-mono text-[11px] tracking-widest uppercase">
        En route to <span className="text-warn font-bold">{label}</span>
      </p>
      <div className="relative flex-1 overflow-hidden" aria-hidden>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
        >
          {/* Lunar surface. */}
          <ellipse cx="50" cy="128" rx="90" ry="44" fill="#2a2d36" stroke="#000" />
          {/* Orbit ring. */}
          <ellipse
            cx="50"
            cy="27"
            rx="38"
            ry="14"
            fill="none"
            stroke="#8fd3ff"
            strokeOpacity="0.5"
            strokeWidth="0.6"
            strokeDasharray="2 1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Site marker and label. */}
        <div className="absolute top-[76%] left-1/2 flex -translate-x-1/2 flex-col items-center pt-7">
          <MapPin className="size-5 text-[#ffd23f]" strokeWidth={2.5} />
          <span className="mission-pixel border-2 border-black bg-[#ffd23f] px-2 py-0.5 font-mono text-[11px] font-bold text-black uppercase">
            {label}
          </span>
        </div>

        {/* Lander. */}
        <motion.div
          className="absolute size-10 -translate-x-1/2 -translate-y-1/2"
          initial={reduced ? LANDED : { left: PATH_LEFT[0], top: PATH_TOP[0] }}
          animate={reduced ? LANDED : { left: PATH_LEFT, top: PATH_TOP }}
          transition={
            reduced ? { duration: 0 } : { duration: FLIGHT_S, times: PATH_TIMES, ease: 'easeInOut' }
          }
        >
          <GameImage
            src={LANDER_ICON}
            alt=""
            className="mission-pixel size-full"
            fallback={<LanderGlyph />}
          />
        </motion.div>

        {/* Touchdown dust. */}
        {!reduced && (
          <motion.div
            className="absolute top-[76%] left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-[#c9c3b0]"
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: [0, 0.7, 0], scaleX: [0.2, 1, 1.4] }}
            transition={{ delay: FLIGHT_S - 0.1, duration: 0.6 }}
          />
        )}
      </div>
      <motion.p
        role="status"
        className="text-center font-mono text-[13px] font-bold tracking-widest text-white uppercase"
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : FLIGHT_S, duration: 0.2 }}
      >
        Touchdown!
      </motion.p>
    </div>
  );
}
