import { describe, expect, it } from 'vitest';
import emergencies from '../content/emergencies.json';
import { briefingLines, particleOffset, particles, rng, sceneLayout } from './emergencyFx';

describe('sceneLayout', () => {
  it('has an effect for every emergency in the content', () => {
    for (const e of emergencies) expect(sceneLayout(e.id)?.effect, e.id).toBeDefined();
  });

  it('gives each emergency its own effect', () => {
    const effects = emergencies.map((e) => sceneLayout(e.id)?.effect);
    expect(new Set(effects).size).toBe(emergencies.length);
  });

  it('is null for unknown or missing ids (plain picture)', () => {
    expect(sceneLayout(null)).toBeNull();
    expect(sceneLayout('toString')).toBeNull();
    expect(sceneLayout('meteor')).toBeNull();
  });
});

describe('particles', () => {
  it('is deterministic for a seed', () => {
    const opts = { baseAngle: 90, spread: 60, minDist: 10, maxDist: 20 };
    expect(particles(5, 3, opts)).toEqual(particles(5, 3, opts));
    expect(particles(5, 3, opts)).not.toEqual(particles(5, 4, opts));
  });

  it('stays inside the requested cone and ranges', () => {
    for (const p of particles(200, 1, { baseAngle: -90, spread: 40, minDist: 10, maxDist: 30 })) {
      expect(p.angle).toBeGreaterThanOrEqual(-110);
      expect(p.angle).toBeLessThanOrEqual(-70);
      expect(p.dist).toBeGreaterThanOrEqual(10);
      expect(p.dist).toBeLessThanOrEqual(30);
      expect(p.size).toBeGreaterThanOrEqual(2);
      expect(p.size).toBeLessThanOrEqual(5);
      expect(p.dur).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('rng stays in [0, 1)', () => {
    const r = rng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('particleOffset', () => {
  it('points down for 90° and right for 0°', () => {
    expect(particleOffset({ angle: 90, dist: 10 })).toEqual({ dx: 0, dy: 10 });
    expect(particleOffset({ angle: 0, dist: 10 })).toEqual({ dx: 10, dy: 0 });
  });
});

describe('briefingLines', () => {
  it('opens in alarm, splits the briefing by sentence and ends with the order', () => {
    const lines = briefingLines('The engine died. Pick a site now!');
    expect(lines[0]).toMatch(/PILOT/);
    expect(lines.slice(1, -1)).toEqual(['The engine died.', 'Pick a site now!']);
    expect(lines.at(-1)).toMatch(/south pole/);
  });

  it('still says something when the briefing is missing', () => {
    expect(briefingLines(undefined)).toHaveLength(3);
    expect(briefingLines('')).toHaveLength(3);
  });
});
