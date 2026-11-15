/**
 * 3D Moon globe entry point — owner: Marta (src/globe).
 *
 * Lazy-loads the R3F canvas so three.js is only downloaded when the user switches to 3D.
 * The scene itself lives in GlobeCanvas.tsx.
 *
 * Optional cinematic mode (#100, for the Mission game): with `cinematic` set, it renders
 * CinematicCanvas.tsx instead — camera driven by `cinematic.shot`, no cards, labels, controls or
 * clicks — and calls `onShotDone` when a finite shot ends. Without it, nothing changes.
 */
import { lazy, Suspense } from 'react';
import type { CinematicView } from './cinematic';

const GlobeCanvas = lazy(() => import('./GlobeCanvas'));
const CinematicCanvas = lazy(() => import('./CinematicCanvas'));

export interface GlobeViewProps {
  /** Cinematic mode (see cinematic.ts). Omit for the normal Explore globe. */
  cinematic?: CinematicView;
  /** Cinematic mode only: called once when the current shot finishes (never for `spin`). */
  onShotDone?: () => void;
  /** Explore draws Layers and coordinates in its own panel. */
  hideChrome?: boolean;
}

export function GlobeView({ cinematic, onShotDone, hideChrome }: GlobeViewProps = {}) {
  if (cinematic) {
    return (
      // No loading text: the caller shows its own backdrop until the canvas paints.
      <Suspense fallback={null}>
        <CinematicCanvas view={cinematic} onShotDone={onShotDone} />
      </Suspense>
    );
  }
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="text-ink-muted flex size-full items-center justify-center bg-black text-[11px]"
        >
          Loading 3D globe…
        </div>
      }
    >
      <GlobeCanvas hideChrome={hideChrome} />
    </Suspense>
  );
}
