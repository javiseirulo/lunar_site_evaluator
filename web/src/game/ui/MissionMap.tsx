/**
 * The map the Mission game shows during the timelapse: the shared polar map plus a game-drawn
 * marker on the chosen site (`siteId`). PolarMap does not read `currentTimeUTC`, so the map
 * itself stays static while the clock moves; the HUD next to it shows the time-dependent state.
 *
 * The site is NOT selected in the shared store during play (the site-wide header would print
 * its real name, see `reveal.ts`), so PolarMap highlights nothing; the marker drawn here has no
 * name.
 *
 * The 3D globe (`@/globe`) is not used: selecting a site opens its card with the real name
 * and score, and it shows the custom-pin form (see docs/team/manuelcgg165/mission-status.md).
 *
 * It is display-only here: `inert` blocks clicks (a click would reselect another site) and the
 * pin name labels are hidden, because the real site name stays secret until the verdict.
 */
import { clsx } from 'clsx';
import { latLonToUv, useData } from '@/core';
import { PolarMap as MapView } from '@/layers';
import { useGameSite } from '../historic/useGameSites';

export function MissionMap({ className, siteId }: { className?: string; siteId?: string | null }) {
  const manifest = useData((s) => s.layers);
  const site = useGameSite(siteId) ?? undefined;
  const uv = manifest && site ? latLonToUv(site.lat, site.lon, manifest) : null;

  return (
    <div
      inert
      className={clsx(
        // PolarMap draws each pin as <button><span marker/><span name label/></button>.
        'pointer-events-none relative [&_button>span:last-child]:hidden',
        className,
      )}
    >
      <MapView className="w-full" />
      {uv && (
        <span
          aria-hidden
          className="absolute size-5 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${uv[0] * 100}%`, top: `${uv[1] * 100}%` }}
        >
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#ffd23f] motion-reduce:animate-none" />
          <span className="absolute inset-1 rounded-full border-2 border-black bg-[#ffd23f]" />
        </span>
      )}
    </div>
  );
}
