import type { AppMode } from '@lunar/contracts';

export const MODES: { id: AppMode; label: string; path: string; blurb: string }[] = [
  {
    id: 'explore',
    label: 'Explore',
    path: '/explore',
    blurb: 'Filter the south pole by sunlight, Earth visibility and slope.',
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
 * Main tab bar, in the order of the job: look, stand there, weigh the options, commit,
 * then read why and how. Mode tabs keep the selected site in their URL (Street View).
 * Normal mode is that story. `expert` tabs add the catalogue and the method.
 * Pages that aren't modes (sites, compare, learn, about) don't change `mode`.
 */
export const TABS: {
  label: string;
  path: string;
  mode?: AppMode;
  end?: boolean;
  expert?: boolean;
}[] = [
  { label: 'Explore', path: '/explore', mode: 'explore' },
  { label: 'Street View', path: '/streetview', mode: 'streetview' },
  { label: 'Compare', path: '/compare', expert: true },
  { label: 'All sites', path: '/sites', expert: true },
  { label: 'Mission', path: '/game', mode: 'game' },
  { label: 'Learn', path: '/learn' },
  { label: 'Method', path: '/about', expert: true },
];

/** Tabs shown in the given mode: Normal hides the `expert` ones (Compare among them). */
export function visibleTabs(proMode: boolean): typeof TABS {
  return TABS.filter((t) => proMode || !t.expert);
}

/** Every page, for the footer in Expert mode. */
export const ALL_PAGES: { label: string; path: string }[] = [
  { label: 'Home', path: '/home' },
  { label: 'Explore', path: '/explore' },
  { label: 'Street View', path: '/streetview' },
  { label: 'Compare', path: '/compare' },
  { label: 'All sites', path: '/sites' },
  { label: 'Mission', path: '/game' },
  { label: 'Learn', path: '/learn' },
  { label: 'Method', path: '/about' },
];

/** Audience shortcuts shown under the tabs. */
export const AUDIENCES: { label: string; path: string; expert?: boolean }[] = [
  { label: 'For Mission Planners', path: '/compare', expert: true },
  { label: 'For Educators', path: '/learn' },
  { label: 'For Students', path: '/game' },
  { label: 'For Everyone', path: '/explore' },
];

/** Mode for a URL path, or null for non-mode pages (landing, about). */
export function modeForPath(pathname: string): AppMode | null {
  const first = pathname.split('/')[1] ?? '';
  return MODES.find((m) => m.path === `/${first}`)?.id ?? null;
}
