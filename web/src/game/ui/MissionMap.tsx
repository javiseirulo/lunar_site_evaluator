/**
 * The map the Mission game shows during the timelapse: the shared map view, highlighting the
 * selected site and following `currentTimeUTC` from the shared store.
 *
 * It is display-only here: `inert` blocks clicks (a click would reselect another site) and the
 * pin name labels are hidden, because the real site name stays secret until the verdict.
 */
import { clsx } from 'clsx';
// Swap point: when the 3D globe ships, change this one import to
// `import { GlobeView as MapView } from '@/globe';` (and drop the PolarMap-specific label rule;
// the placeholder GlobeView takes no `className` yet).
import { PolarMap as MapView } from '@/layers';

export function MissionMap({ className }: { className?: string }) {
  return (
    <div
      inert
      className={clsx(
        // PolarMap draws each pin as <button><span marker/><span name label/></button>.
        'pointer-events-none [&_button>span:last-child]:hidden',
        className,
      )}
    >
      <MapView className="w-full" />
    </div>
  );
}
