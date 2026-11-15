import { scoreColor } from './scoreColor';

/** Normal mode: every site marker is the same neutral ink (DESIGN.md `ink` #e6edf7). */
export const NEUTRAL_MARKER_COLOR = '#e6edf7';
/** Normal mode: the selected marker stays the accent amber (DESIGN.md `accent` #ffcc4d). */
export const SELECTED_MARKER_COLOR = '#ffcc4d';

/**
 * Colour of a site marker. Expert keeps the score ramp; Normal ignores the score entirely
 * so no marker reads as good, bad or dimmed by score.
 */
export function siteMarkerColor(score: number, neutral: boolean, selected: boolean): string {
  if (!neutral) return scoreColor(score);
  return selected ? SELECTED_MARKER_COLOR : NEUTRAL_MARKER_COLOR;
}

/** Accessible name for a site marker; the score is only announced in Expert. */
export function siteMarkerLabel(name: string, score: number, neutral: boolean): string {
  return neutral ? name : `${name}, score ${Math.round(score * 100)}`;
}
