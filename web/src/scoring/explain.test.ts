import { describe, expect, it } from 'vitest';
import { DEFAULT_MISSION_CONFIG } from './defaults';
import { evaluateSite } from './evaluate';
import { explainEvaluation, formatNeed, formatRequirementValue } from './explain';

const cfg = DEFAULT_MISSION_CONFIG;
const best = { slope_deg: 0.9, illum_pct: 1, max_dark_hours: 0, earth_vis_pct: 1, max_blackout_hours: 0 };

describe('explainEvaluation', () => {
  it('generic part comes from the config', () => {
    const x = explainEvaluation(evaluateSite({ metrics: best }, cfg), cfg, 7);
    expect(x.general).toContain('7-day');
    expect(x.general).toContain('5 requirements count equally, 20 points each');
  });

  it('explains a perfect site with thresholds from the config', () => {
    const x = explainEvaluation(evaluateSite({ metrics: best }, cfg), cfg, 7);
    expect(x.headline).toBe('Score 100 because:');
    expect(x.reasons).toHaveLength(5);
    expect(x.reasons[0]).toBe('Slope 0.9° (needs ≤ 10.0°): full points.');
    expect(x.reasons[4]).toBe('Longest Earth blackout 0 h (needs ≤ 72 h): full points.');
  });

  it('uses changed thresholds', () => {
    const c2 = { ...cfg, requirements: { ...cfg.requirements, illum_pct: { threshold: 0.7 } } };
    const x = explainEvaluation(evaluateSite({ metrics: best }, c2), c2, 7);
    expect(x.reasons.join(' ')).toContain('needs ≥ 70%');
  });

  it('lists only failing requirements when not valid', () => {
    const ev = evaluateSite({ metrics: { ...best, earth_vis_pct: 0 } }, cfg);
    const x = explainEvaluation(ev, cfg, 7);
    expect(x.headline).toBe('NOT VALID because:');
    expect(x.reasons).toEqual(['Earth in view is 0%, but the mission needs ≥ 50% (too low).']);
  });

  it('says a pending metric is not measured yet', () => {
    const ev = evaluateSite({ metrics: best, pending: ['slope_deg'] }, cfg);
    const x = explainEvaluation(ev, cfg, 7);
    expect(x.reasons).toContain('Slope: not measured yet.');
    const none = explainEvaluation(evaluateSite({ metrics: {} }, cfg), cfg, 7);
    expect(none.headline).toBe('Not enough data yet:');
  });

  it('partial and just-met points', () => {
    const ev = evaluateSite({ metrics: { ...best, illum_pct: 0.5 } }, cfg);
    expect(explainEvaluation(ev, cfg, 7).reasons.join(' ')).toContain('Sunlight 50% (needs ≥ 50%): just meets');
  });

  it('formats', () => {
    expect(formatRequirementValue('max_dark_hours', 72.4)).toBe('72 h');
    expect(formatNeed('illum_pct', 0.5)).toBe('≥ 50%');
    expect(formatRequirementValue('slope_deg', null)).toBe('—');
  });
});
