/**
 * The hand of a Historical mission: its four options (the real site and the alternatives) in a
 * seeded order, each judged with the mission's rules at the real landing time (index 0 of the
 * series, Sun elevation at the exact touchdown minute).
 */
import { DEFAULT_REQUIREMENTS, type MissionRequirements } from '../engine/requirements';
import type { Hand } from '../engine/deal';
import { mulberry32, shuffle } from '../engine/random';
import { simulate } from '../engine/simulate';
import type { HistoricMission } from './data';

/** The rules of a mission: South Pole's thresholds, its stay length, landing light and relay. */
export function missionRules(m: HistoricMission): MissionRequirements {
  const light =
    m.light.min !== undefined && m.light.max !== undefined
      ? { min: m.light.min, max: m.light.max }
      : null;
  return {
    ...DEFAULT_REQUIREMENTS,
    surface_days: m.surface_days,
    landing_light: light,
    relay: m.relay,
  };
}

export function dealHistoric(m: HistoricMission, seed: number): Hand {
  const req = missionRules(m);
  const rnd = mulberry32(seed);
  const landingSunEl: Record<string, number> = {};
  const judged = m.options.map((o) => {
    landingSunEl[o.site.id] = o.landing_sun_el;
    return { siteId: o.site.id, verdict: simulate(o.site, o.timeseries, 0, req, o.landing_sun_el) };
  });
  const cards = shuffle(judged, rnd).map((c, i) => ({ slot: i + 1, ...c }));
  return { req, landingSunEl, startIndex: 0, landingUtc: m.landing_utc, cards };
}

/** The option the real mission chose. */
export function historyOption(m: HistoricMission) {
  return m.options.find((o) => o.history) ?? null;
}
