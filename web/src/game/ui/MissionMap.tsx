/**
 * The map the Mission game shows during the timelapse: the shared polar map, highlighting the
 * selected site (`selectedSiteId`). PolarMap does not read `currentTimeUTC`, so the map itself
 * stays static while the clock moves; the HUD next to it shows the time-dependent state.
 *
 * The 3D globe (`@/globe`) is not used: selecting a site opens its card with the real name
 * and score, and it shows the custom-pin form (see docs/team/manuelcgg165/mission-status.md).
 *
 * It is display-only here: `inert` blocks clicks (a click would reselect another site) and the
 * pin name labels are hidden, because the real site name stays secret until the verdict.
 */
import { clsx } from 'clsx';
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
