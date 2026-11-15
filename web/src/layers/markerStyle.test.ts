import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_MARKER_COLOR,
  SELECTED_MARKER_COLOR,
  siteMarkerColor,
  siteMarkerLabel,
} from './markerStyle';
import { scoreColor } from './scoreColor';

describe('site marker style', () => {
  it('Normal: every score gets the same neutral colour', () => {
    expect(siteMarkerColor(0.1, true, false)).toBe(NEUTRAL_MARKER_COLOR);
    expect(siteMarkerColor(0.9, true, false)).toBe(NEUTRAL_MARKER_COLOR);
  });

  it('Normal: the selected marker is amber', () => {
    expect(siteMarkerColor(0.2, true, true)).toBe(SELECTED_MARKER_COLOR);
  });

  it('Expert: keeps the score colour, selected or not', () => {
    expect(siteMarkerColor(0.2, false, false)).toBe(scoreColor(0.2));
    expect(siteMarkerColor(0.2, false, true)).toBe(scoreColor(0.2));
  });

  it('labels show the score only in Expert', () => {
    expect(siteMarkerLabel('Shackleton', 0.734, true)).toBe('Shackleton');
    expect(siteMarkerLabel('Shackleton', 0.734, false)).toBe('Shackleton, score 73');
  });
});
