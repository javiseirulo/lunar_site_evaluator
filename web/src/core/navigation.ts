import type { AppMode } from '@lunar/contracts';

export const MODES: { id: AppMode; label: string; path: string; blurb: string }[] = [
  {
    id: 'explore',
    label: 'Explore',
    path: '/explore',
    blurb: 'Filter the south pole by sunlight, Earth visibility and slope, and compare sites.',
  },
  {
    id: 'streetview',
    label: 'Street View',
    path: '/streetview',
    blurb: 'Stand on a site and watch the Sun and Earth move along its horizon.',
  },
  {
    id: 'game',
    label: 'Mission',
    path: '/game',
    blurb: 'A landing site just fell through. Pick a new one and see how it plays out.',
  },
];

export function pathForMode(mode: AppMode, siteId?: string | null): string {
  if (mode === 'streetview' && siteId) return `/streetview/${encodeURIComponent(siteId)}`;
  return MODES.find((m) => m.id === mode)?.path ?? '/';
}

/** Mode for a URL path, or null for non-mode pages (landing, about). */
export function modeForPath(pathname: string): AppMode | null {
  const first = pathname.split('/')[1] ?? '';
  return MODES.find((m) => m.path === `/${first}`)?.id ?? null;
}
