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

/**
 * Main tab bar, in order. Mode tabs keep the selected site in their URL (Street View).
 * Pages that aren't modes (sites, compare, learn, about) don't change `mode`.
 */
export const TABS: { label: string; path: string; mode?: AppMode; end?: boolean }[] = [
  { label: 'Home', path: '/', end: true },
  { label: 'Explore', path: '/explore', mode: 'explore' },
  { label: 'Sites', path: '/sites' },
  { label: 'Compare', path: '/compare' },
  { label: 'Street View', path: '/streetview', mode: 'streetview' },
  { label: 'Mission', path: '/game', mode: 'game' },
  { label: 'Learn', path: '/learn' },
  { label: 'Data & Method', path: '/about' },
];

/** Audience shortcuts shown under the tabs. */
export const AUDIENCES = [
  { label: 'For Mission Planners', path: '/compare' },
  { label: 'For Educators', path: '/learn' },
  { label: 'For Students', path: '/game' },
  { label: 'For Everyone', path: '/explore' },
];

/** Mode for a URL path, or null for non-mode pages (landing, about). */
export function modeForPath(pathname: string): AppMode | null {
  const first = pathname.split('/')[1] ?? '';
  return MODES.find((m) => m.path === `/${first}`)?.id ?? null;
}
