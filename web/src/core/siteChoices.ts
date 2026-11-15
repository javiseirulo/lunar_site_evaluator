/**
 * Site menus. Eight places that sit far apart on the Moon come first.
 * Everything else stays grouped by area underneath.
 */
export interface ChoiceSite {
  id: string;
  name: string;
  region?: string;
  group?: string;
}

/** South pole, north pole, then places you can tell apart from either pole. */
export const FEATURED_SITE_IDS = [
  'shackleton_rim_01',
  'peary_rim',
  'chandrayaan_3',
  'apollo_11',
  'apollo_15',
  'change_3',
  'luna_24',
  'change_4',
] as const;

const FEATURED = new Set<string>(FEATURED_SITE_IDS);

const REGION_LABEL: Record<string, string> = {
  south_pole: 'South pole',
  north_pole: 'North pole',
  near_side: 'Near side',
  far_side: 'Far side',
};

function placeName(group: string | undefined): string | null {
  const g = group ?? '';
  if (/Shackleton/i.test(g)) return 'Shackleton';
  if (/Luna-27/i.test(g)) return 'Luna-27';
  if (/Apollo/i.test(g)) return 'Apollo';
  if (/Surveyor/i.test(g)) return 'Surveyor';
  if (/Luna robotic/i.test(g)) return 'Luna';
  if (/Chang'e/i.test(g)) return "Chang'e";
  if (/ISRO/i.test(g)) return 'Chandrayaan';
  if (/JAXA/i.test(g)) return 'SLIM';
  if (/Firefly/i.test(g)) return 'Firefly';
  if (/Intuitive Machines/i.test(g)) return 'Intuitive Machines';
  if (/Glaser/i.test(g)) return 'High illumination';
  const tail = g.includes(':') ? (g.split(':').pop()?.split(';')[0]?.trim() ?? '') : '';
  return tail.replace(/\s+\d+$/, '') || null;
}

function areaGroups<T extends ChoiceSite>(sites: T[]) {
  const buckets = new Map<string, T[]>();
  for (const site of sites) {
    const region = (site.region && REGION_LABEL[site.region]) || 'Other';
    const place = placeName(site.group);
    const label = place ? `${region} — ${place}` : region;
    const list = buckets.get(label);
    if (list) list.push(site);
    else buckets.set(label, [site]);
  }
  const rank = (label: string) => {
    const region = label.split(' — ')[0] ?? '';
    const i = ['South pole', 'North pole', 'Near side', 'Far side', 'Other'].indexOf(region);
    return i < 0 ? 9 : i;
  };
  return [...buckets.entries()]
    .map(([label, list]) => ({
      label,
      sites: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label));
}

/** Featured places first, then the remaining catalogue grouped by area. */
export function choiceGroups<T extends ChoiceSite>(sites: T[]) {
  const featured = FEATURED_SITE_IDS.flatMap((id) => sites.find((site) => site.id === id) ?? []);
  const rest = areaGroups(sites.filter((site) => !FEATURED.has(site.id)));
  return featured.length ? [{ label: 'Different places', sites: featured }, ...rest] : rest;
}
