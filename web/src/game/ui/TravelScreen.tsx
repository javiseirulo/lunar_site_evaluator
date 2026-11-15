/**
 * `travel` phase (~4 s): the lander (side view) leaves orbit and descends over the lunar
 * surface (`orbit-bg.png`, slowly zooming in) onto the chosen landing site's marker, then calls
 * `landed()`. The real site name stays hidden.
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { useAppStore } from '@/core';
import { useGame } from '../state/gameStore';
import { LANDER_SIDE, ORBIT_BG } from './assets';
import { GameImage } from './GameImage';

const TRAVEL_MS = 4000;
const TRAVEL_REDUCED_MS = 800;
/** Seconds of lander motion (the rest of TRAVEL_MS is the touchdown beat). */
const FLIGHT_S = 3.4;

// Lander path in % of the scene (feet position): from high orbit on the left, curving down to
// the site marker at 50%/78%, growing as it gets closer.
const PATH_LEFT = ['14%', '32%', '46%', '50%', '50%'];
const PATH_TOP = ['10%', '22%', '42%', '66%', '78%'];
const PATH_SCALE = [0.35, 0.55, 0.75, 0.95, 1];
const PATH_TIMES = [0, 0.3, 0.6, 0.85, 1];
const LANDED = { left: '50%', top: '78%', scale: 1 };

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
  const reduced = useReducedMotion() ?? false;
  const landingUtc = hand?.landingUtc;
  // "Touchdown!" enters the DOM (and the status region) only at touchdown.
  const [down, setDown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setDown(true), reduced ? 0 : FLIGHT_S * 1000);
    return () => window.clearTimeout(id);
  }, [reduced]);

  // The pick already shared the landing time; only write if something else changed it since.
  // The site is not selected in the shared store until the verdict (its name would leak).
  useEffect(() => {
    if (!landingUtc) return;
    const app = useAppStore.getState();
    if (app.currentTimeUTC !== landingUtc) app.setTime(landingUtc);
  }, [landingUtc]);

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
      <div
        className="relative min-h-[320px] flex-1 overflow-hidden border-2 border-black"
        aria-hidden
      >
        {/* Lunar surface from orbit, slowly zooming in toward the landing point. */}
        <motion.div
          className="absolute inset-0 origin-[50%_78%]"
          initial={{ scale: 1 }}
          animate={{ scale: reduced ? 1 : 1.25 }}
          transition={{ duration: FLIGHT_S + 0.4, ease: 'easeIn' }}
        >
          <GameImage
            src={ORBIT_BG}
            alt=""
            className="size-full"
            fallback={
              <div className="size-full bg-[radial-gradient(ellipse_at_50%_130%,#4a4658_0%,#2a2d36_45%,#05070f_75%)]" />
            }
          />
        </motion.div>
        <div className="mission-scanlines absolute inset-0" />

        {/* Site marker and label. */}
        <div className="absolute top-[78%] left-1/2 flex -translate-x-1/2 flex-col items-center pt-1">
          <MapPin className="size-5 text-[#ffd23f]" strokeWidth={2.5} />
          <span className="mission-pixel border-2 border-black bg-[#ffd23f] px-2 py-0.5 font-mono text-[11px] font-bold text-black uppercase">
            {label}
          </span>
        </div>

        {/* Lander: anchored by its feet (bottom centre) to the path point. */}
        <motion.div
          className="absolute size-20 sm:size-24"
          style={{ x: '-50%', y: '-100%', originX: 0.5, originY: 1 }}
          initial={
            reduced ? LANDED : { left: PATH_LEFT[0], top: PATH_TOP[0], scale: PATH_SCALE[0] }
          }
          animate={reduced ? LANDED : { left: PATH_LEFT, top: PATH_TOP, scale: PATH_SCALE }}
          transition={
            reduced ? { duration: 0 } : { duration: FLIGHT_S, times: PATH_TIMES, ease: 'easeInOut' }
          }
        >
          <GameImage
            src={LANDER_SIDE}
            alt=""
            className="size-full object-contain [image-rendering:pixelated]"
            fallback={<LanderGlyph />}
          />
        </motion.div>

        {/* Touchdown dust. */}
        {!reduced && (
          <motion.div
            className="absolute top-[78%] left-1/2 h-3 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c9c3b0]"
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: [0, 0.7, 0], scaleX: [0.2, 1, 1.5] }}
            transition={{ delay: FLIGHT_S - 0.1, duration: 0.6 }}
          />
        )}
      </div>
      <p
        role="status"
        className="min-h-[1.5em] text-center font-mono text-[13px] font-bold tracking-widest text-white uppercase"
      >
        {down && (
          <motion.span
            className="inline-block"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            Touchdown!
          </motion.span>
        )}
      </p>
    </div>
  );
}
