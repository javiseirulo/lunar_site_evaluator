/**
 * Layout of the animated emergency scenes: where on each 16:9 picture (`public/game/emergencies/`)
 * the effect sits, and seeded particles so every play of a scene looks the same (and is testable).
 * Positions are percentages of the picture box, measured on the 1280×720 source art.
 */

export type SceneEffect = 'engine' | 'flare' | 'screens' | 'steam' | 'signal';

export interface Point {
  /** % of the box width. */
  x: number;
  /** % of the box height. */
  y: number;
}

export interface SceneLayout {
  effect: SceneEffect;
  /** Where the trouble is (engine nozzle, valve, antenna, the Sun off-frame...). */
  anchors: readonly [Point, ...Point[]];
}

const LAYOUTS: Record<string, SceneLayout> = {
  // Descent engine nozzle under the lander.
  propulsion: { effect: 'engine', anchors: [{ x: 38.7, y: 55 }] },
  // The Sun just past the top-right corner, throwing flares across the sky.
  solar_storm: { effect: 'flare', anchors: [{ x: 96, y: -4 }] },
  // The three console screens of the guidance computer.
  guidance: {
    effect: 'screens',
    anchors: [
      { x: 20.3, y: 61.5 },
      { x: 50.7, y: 60.5 },
      { x: 79.3, y: 61.5 },
    ],
  },
  // The broken valve on the side of the descent stage.
  fuel_leak: { effect: 'steam', anchors: [{ x: 48, y: 42 }] },
  // Tip of the bent antenna on top of the lander.
  comms_glitch: { effect: 'signal', anchors: [{ x: 45.5, y: 15 }] },
};

/** Scene layout for an emergency id, or null for an unknown id (plain picture, no effect). */
export function sceneLayout(id: string | null): SceneLayout | null {
  return id && Object.hasOwn(LAYOUTS, id) ? (LAYOUTS[id] ?? null) : null;
}

export interface Particle {
  /** Direction of travel, degrees (0 = right, 90 = down). */
  angle: number;
  /** Travel distance, px. */
  dist: number;
  /** Size, px. */
  size: number;
  /** Start delay, s. */
  delay: number;
  /** Lifetime of one burst, s. */
  dur: number;
}

/** Small deterministic PRNG (mulberry32): same seed → same particles on every render. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` particles spraying around `baseAngle` within ±`spread`/2 degrees.
 * Sizes 2–5 px, distances `minDist`..`maxDist`, lifetimes 0.5–1.2 s, staggered start.
 */
export function particles(
  count: number,
  seed: number,
  {
    baseAngle,
    spread,
    minDist,
    maxDist,
  }: { baseAngle: number; spread: number; minDist: number; maxDist: number },
): Particle[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => ({
    angle: baseAngle + (r() - 0.5) * spread,
    dist: minDist + r() * (maxDist - minDist),
    size: 2 + Math.round(r() * 3),
    delay: Math.round(r() * 1200) / 1000,
    dur: 0.5 + Math.round(r() * 700) / 1000,
  }));
}

/** Typing speed of the panicked briefing (the calm intro types at `TYPE_CPS`). */
export const PANIC_CPS = 60;

/**
 * What Dr. Regolith blurts out in the briefing: an alarmed opener, the emergency's briefing one
 * sentence per line, and the order to look at the south pole.
 */
export function briefingLines(briefing: string | undefined): string[] {
  const body = (briefing ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [
    'Pilot! PILOT! Are you seeing this?!',
    ...(body.length ? body : ['Something has gone very wrong and our landing site is lost.']),
    'Four sites are still in reach near the south pole. Pull them up, quickly!',
  ];
}

/** End offset (px) of a particle that travels `dist` along `angle`. */
export function particleOffset(p: Pick<Particle, 'angle' | 'dist'>): { dx: number; dy: number } {
  const rad = (p.angle * Math.PI) / 180;
  return { dx: Math.round(Math.cos(rad) * p.dist), dy: Math.round(Math.sin(rad) * p.dist) };
}
