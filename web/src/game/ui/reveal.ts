/**
 * Pure rules for what the game may reveal while a mission is in progress.
 *
 * The real site name stays secret until the verdict. The game therefore must not leave a site
 * selected in the shared app store (the site-wide header prints its name) during play: it
 * clears the selection while a hand is on the table and selects the chosen site only once the
 * verdict screen shows.
 */
import type { Phase } from '../state/gameStore';
import { dayOfMission } from './timelapse';

/** Phases in which no site may be selected in the shared store (the name would leak). */
const SECRET_PHASES: readonly Phase[] = [
  'intro',
  'alert',
  'dealing',
  'choosing',
  'travel',
  'timelapse',
];

/**
 * The shared-store selection the game wants for `phase`: the chosen site id at the verdict,
 * `null` (clear it) while the site is secret, `undefined` (leave it alone) otherwise.
 */
export function sharedSelectionFor(
  phase: Phase,
  chosenSiteId: string | null,
): string | null | undefined {
  if (phase === 'verdict') return chosenSiteId ?? undefined;
  if (SECRET_PHASES.includes(phase)) return null;
  return undefined;
}

/**
 * One-sentence-per-fact verdict detail, e.g. "Night lasted over 100 h. Failed at hour 100 of
 * 168 (day 5)." Shortfalls judged over the whole mission (failHour = last hour) say so.
 */
export function verdictSummary(
  detail: string,
  failHour: number | null,
  missionHours: number,
  days: number,
): string {
  const head = `${detail.replace(/\.+$/, '')}.`;
  if (failHour === null) return head;
  if (failHour <= 0) return `${head} Failed on touchdown.`;
  if (failHour >= missionHours - 1) return `${head} Judged over the full ${days}-day mission.`;
  return `${head} Failed at hour ${failHour} of ${missionHours} (day ${dayOfMission(failHour, days)}).`;
}
