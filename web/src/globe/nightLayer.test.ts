import { describe, expect, it } from 'vitest';
import { TERMINATOR_RADIUS, terminatorPoints } from './nightLayer';

describe('terminatorPoints', () => {
  it('draws a great circle perpendicular to the Sun at the terminator radius', () => {
    for (const sun of [
      [1, 0, 0],
      [0, -1, 0], // Sun straight over the south pole (fallback axis)
      [0.3, -0.1, 0.95],
    ] as const) {
      const p = terminatorPoints(sun, TERMINATOR_RADIUS, 64);
      expect(p.length).toBe(64 * 3);
      const l = Math.hypot(...sun);
      for (let i = 0; i < 64; i++) {
        const [x, y, z] = [p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!];
        expect(Math.hypot(x, y, z)).toBeCloseTo(TERMINATOR_RADIUS, 5);
        expect((x * sun[0] + y * sun[1] + z * sun[2]) / l).toBeCloseTo(0, 5); // on the day/night line
      }
    }
  });

  it('does not depend on the length of the Sun vector', () => {
    expect(Array.from(terminatorPoints([2, 0, 0], 1, 8))).toEqual(
      Array.from(terminatorPoints([1, 0, 0], 1, 8)),
    );
  });
});
