import { describe, expect, it } from 'vitest';
import { buildRunningStats, downsampleMinMax, monthTicks, onRuns, statsAt } from './simChart';

describe('downsampleMinMax', () => {
  it('keeps peaks and valleys per bucket', () => {
    const { min, max } = downsampleMinMax([1, 9, 3, 4, -2, 5], 2);
    expect(min).toEqual([1, -2]);
    expect(max).toEqual([9, 5]);
  });
  it('never yields more buckets than samples', () => {
    expect(downsampleMinMax([1, 2, 3], 10).min).toHaveLength(3);
    expect(downsampleMinMax([], 5).min).toHaveLength(1);
  });
});

describe('onRuns', () => {
  it('finds half-open runs including one touching the end', () => {
    expect(onRuns([0, 1, 1, 0, 1])).toEqual([
      [1, 3],
      [4, 5],
    ]);
    expect(onRuns([0, 0])).toEqual([]);
  });
});

describe('running stats', () => {
  const lit = [1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const s = buildRunningStats(lit);
  it('lit fraction up to the cursor', () => {
    expect(statsAt(s, 1, 3600).litFraction).toBe(1);
    expect(statsAt(s, 5, 3600).litFraction).toBeCloseTo(3 / 6);
    expect(statsAt(s, 10, 3600).litFraction).toBeCloseTo(4 / 11);
  });
  it('longest dark so far, in hours, only counts the past', () => {
    expect(statsAt(s, 3, 3600).longestDarkHours).toBe(2);
    expect(statsAt(s, 5, 3600).longestDarkHours).toBe(3);
    expect(statsAt(s, 10, 7200).longestDarkHours).toBe(8);
  });
  it('handles empty and out-of-range', () => {
    expect(statsAt(buildRunningStats([]), 0, 3600)).toEqual({
      litFraction: 0,
      longestDarkHours: 0,
    });
    expect(statsAt(s, 999, 3600).litFraction).toBeCloseTo(4 / 11);
  });
});

describe('monthTicks', () => {
  it('marks the first sample of each new month', () => {
    const t = [
      '2027-01-31T22:00:00Z',
      '2027-01-31T23:00:00Z',
      '2027-02-01T00:00:00Z',
      '2027-02-01T01:00:00Z',
    ];
    expect(monthTicks(t)).toEqual([{ index: 2, label: 'Feb' }]);
  });
});
