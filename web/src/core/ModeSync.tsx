/**
 * Keeps the URL and the store in sync, so modules only ever talk to the store:
 *  - URL → store: visiting /explore, /streetview/:siteId or /game sets `mode` (and the site).
 *  - store → URL: when a module calls setMode('streetview') the app navigates there.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppStore } from './store';
import { modeForPath, pathForMode } from './navigation';

function siteIdFromPath(pathname: string): string | null {
  const [, first, second] = pathname.split('/');
  return first === 'streetview' && second ? decodeURIComponent(second) : null;
}

export function ModeSync() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const pathRef = useRef(pathname);

  // URL → store
  useEffect(() => {
    pathRef.current = pathname;
    const mode = modeForPath(pathname);
    const siteId = siteIdFromPath(pathname);
    const s = useAppStore.getState();
    if (mode && mode !== s.mode) s.setMode(mode);
    if (siteId && siteId !== s.selectedSiteId) s.selectSite(siteId);
  }, [pathname]);

  // store → URL (reacts to changes only, never on mount, so the landing page stays put)
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        const here = pathRef.current;
        const modeChanged = s.mode !== prev.mode;
        const siteChangedInStreetView =
          s.mode === 'streetview' &&
          s.selectedSiteId !== prev.selectedSiteId &&
          modeForPath(here) === 'streetview';
        if (!modeChanged && !siteChangedInStreetView) return;
        const target = pathForMode(s.mode, s.selectedSiteId);
        if (target !== here) navigate(target, { replace: !modeChanged });
      }),
    [navigate],
  );

  return null;
}
