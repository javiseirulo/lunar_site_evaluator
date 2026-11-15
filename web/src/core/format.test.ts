import { describe, expect, it } from 'vitest';
import { evaluationLabel, failedCheckLabels, lowScoreReason } from './format';

const check = (key: string, ok: boolean, pending = false) =>
  ({ key, ok, value: 1, threshold: 1, margin: 0, pending }) as never;

describe('site score explanations', () => {
  it('names the failed checks in plain language', () => {
    const site = { checks: [check('slope_deg', true), check('earth_vis_pct', false)] };
    expect(failedCheckLabels(site)).toEqual(['Earth link']);
    expect(lowScoreReason(site)).toBe('Low score: Earth link');
  });
  it('ignores pending checks and returns null when nothing failed', () => {
    expect(lowScoreReason({ checks: [check('slope_deg', false, true)] })).toBeNull();
    expect(lowScoreReason({})).toBeNull();
  });
  it('labels the evaluation window from sites.json', () => {
    expect(
      evaluationLabel({ start_utc: '2027-10-12T00:00:00Z', end_utc: '2027-10-19T00:00:00Z' }),
    ).toBe('Score for a 7-day landing on 12 Oct 2027');
    expect(evaluationLabel(undefined)).toBeNull();
  });
});
