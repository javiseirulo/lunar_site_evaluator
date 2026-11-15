/** Typed lookups over the Mission content JSON (emergencies, lessons, failure headlines). */
import emergencies from '../content/emergencies.json';
import lessons from '../content/lessons.json';
import type { FailCause } from '../engine/simulate';

export type Emergency = (typeof emergencies)[number];

export function emergencyById(id: string | null): Emergency | null {
  return emergencies.find((e) => e.id === id) ?? null;
}

/** The lesson for a failure cause, or the win lesson for `null`. */
export function lessonFor(cause: FailCause | null): string {
  return lessons[cause ?? 'win'];
}

export const CAUSE_HEADLINE: Record<FailCause, string> = {
  slope: 'The lander tipped over!',
  cold: 'The lander froze in the long night!',
  blackout: 'We lost contact with Earth!',
  low_sun: 'Not enough sunlight to stay alive!',
  low_comm: 'The link with Earth was too weak!',
};
