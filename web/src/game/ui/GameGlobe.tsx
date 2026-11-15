/**
 * The game's ONLY door to Marta's 3D globe (`GlobeView` in cinematic mode, #100). If the globe's
 * API changes, adapt it here.
 *
 * - Lazy: the globe module (and three.js behind it) loads after the game has painted; until then,
 *   and whenever WebGL is missing or the globe crashes, a static picture shows instead.
 * - `onShotDone` fires exactly once per finite shot (pole, dive, reveal): from the globe, or from
 *   a safety timer if the globe is slow or absent, so the game never gets stuck.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { clsx } from 'clsx';
import { ORBIT_BG } from './assets';
import { GameImage } from './GameImage';
import type { GlobeShot } from './globeShots';

const GlobeView = lazy(() => import('@/globe').then((m) => ({ default: m.GlobeView })));

/** Expected length of the finite shots without a duration of their own. */
const POLE_MS = 2600;
const REVEAL_MS = 3200;
/** With reduced motion the globe jumps to the pose and holds it this long. */
const REDUCED_MS = 600;
/** Extra time the globe gets before the safety timer finishes the shot for it. */
const GRACE_MS = 4000;

let webglCache: boolean | null = null;

function webglAvailable(): boolean {
  if (webglCache === null) {
    try {
      const c = document.createElement('canvas');
      webglCache = !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

function shotMs(shot: GlobeShot, reduced: boolean): number | null {
  if (shot.kind === 'spin') return null;
  if (reduced) return REDUCED_MS;
  if (shot.kind === 'dive') return shot.durationMs;
  return shot.kind === 'pole' ? POLE_MS : REVEAL_MS;
}

class GlobeBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Mission globe unavailable, showing the static picture instead', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface GameGlobeProps {
  shot: GlobeShot;
  onShotDone?: () => void;
  className?: string;
  /** Static picture under the globe (while loading, or without WebGL). */
  fallbackSrc?: string;
}

export function GameGlobe({ shot, onShotDone, className, fallbackSrc = ORBIT_BG }: GameGlobeProps) {
  const reduced = useReducedMotion() ?? false;
  const [failed, setFailed] = useState(() => !webglAvailable());
  const key = JSON.stringify(shot);

  // Fire onShotDone once per shot, whoever gets there first (globe or safety timer).
  const doneRef = useRef(onShotDone);
  useEffect(() => {
    doneRef.current = onShotDone;
  }, [onShotDone]);
  const firedFor = useRef<string | null>(null);
  const fire = useCallback((k: string) => {
    if (firedFor.current === k) return;
    firedFor.current = k;
    doneRef.current?.();
  }, []);

  const ms = shotMs(shot, reduced);
  useEffect(() => {
    if (ms === null) return;
    const id = window.setTimeout(() => fire(key), failed ? ms : ms + GRACE_MS);
    return () => window.clearTimeout(id);
  }, [key, ms, failed, fire]);

  return (
    <div className={clsx('relative size-full overflow-hidden bg-black', className)} aria-hidden>
      {/* Static picture: shows until the globe paints over it, and stays if WebGL is missing. */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: failed && shot.kind === 'dive' && !reduced ? 1.3 : 1 }}
        transition={{ duration: (ms ?? 0) / 1000, ease: 'easeOut' }}
      >
        <GameImage
          src={fallbackSrc}
          alt=""
          className="size-full"
          fallback={
            <div className="size-full bg-[radial-gradient(ellipse_at_50%_130%,#4a4658_0%,#2a2d36_45%,#05070f_75%)]" />
          }
        />
      </motion.div>
      {!failed && (
        <div className="absolute inset-0">
          <GlobeBoundary onError={() => setFailed(true)}>
            <Suspense fallback={null}>
              <GlobeView cinematic={{ shot }} onShotDone={() => fire(key)} />
            </Suspense>
          </GlobeBoundary>
        </div>
      )}
    </div>
  );
}
