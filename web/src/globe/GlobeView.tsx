/**
 * 3D Moon globe entry point — owner: Marta (src/globe).
 *
 * Lazy-loads the R3F canvas so three.js is only downloaded when the user switches to 3D.
 * The scene itself lives in GlobeCanvas.tsx.
 */
import { lazy, Suspense } from 'react';

const GlobeCanvas = lazy(() => import('./GlobeCanvas'));

export function GlobeView() {
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
      <GlobeCanvas />
    </Suspense>
  );
}
