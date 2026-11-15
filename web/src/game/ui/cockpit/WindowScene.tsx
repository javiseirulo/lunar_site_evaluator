/**
 * The view out of the lander window: starfield, Sun and Earth placed from the real timeseries
 * (see `sky.ts`), and a terrain silhouette whose shape depends on the site's terrain family.
 * The ground lights up and casts long shadows while the Sun is up and goes dark when it sets.
 *
 * The site illustrations (`sites/*.png`) are not used: they have their own Sun and Earth
 * painted in, which would contradict the real positions drawn here.
 */
import { memo, useId, useMemo } from 'react';
import { mulberry32 } from '../../engine/random';
import type { Terrain } from '../assets';
import { HORIZON_Y, placeBody, type SkyPoint, type SkyState } from './sky';

const W = 400;
const H = 200;
const HORIZON = HORIZON_Y * H;

/** Ridge depth below the horizon line per terrain (the ridge never rises above the horizon). */
const RIDGE: Record<Terrain, { amp: number; step: number; jag: number }> = {
  peak: { amp: 26, step: 14, jag: 1 },
  massif: { amp: 22, step: 18, jag: 0.8 },
  mons: { amp: 24, step: 22, jag: 0.6 },
  ridge: { amp: 16, step: 12, jag: 0.9 },
  rim: { amp: 12, step: 20, jag: 0.5 },
  cliff: { amp: 14, step: 10, jag: 1 },
  crater: { amp: 10, step: 26, jag: 0.4 },
  plateau: { amp: 5, step: 30, jag: 0.3 },
};

const TERRAIN_SEED: Record<Terrain, number> = {
  peak: 11,
  massif: 23,
  mons: 37,
  ridge: 41,
  rim: 53,
  cliff: 67,
  crater: 71,
  plateau: 89,
};

/** Far ridge outline: top edge between the horizon and `amp` px below it. */
function ridgePath(terrain: Terrain): string {
  const { amp, step, jag } = RIDGE[terrain];
  const rnd = mulberry32(TERRAIN_SEED[terrain]);
  const pts: string[] = [];
  let prev = 0.5;
  for (let x = 0; x <= W + step; x += step) {
    prev = Math.min(1, Math.max(0, prev + (rnd() - 0.5) * jag));
    pts.push(`${Math.min(W, x)},${(HORIZON + amp * (1 - prev)).toFixed(1)}`);
  }
  return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
}

const STARS = (() => {
  const rnd = mulberry32(2026);
  return Array.from({ length: 70 }, () => ({
    x: Math.round(rnd() * W),
    y: Math.round(rnd() * (HORIZON - 6)),
    s: rnd() < 0.15 ? 2 : 1,
  }));
})();

const BOULDERS = [
  { x: 70, y: 178, rx: 16, ry: 7 },
  { x: 160, y: 164, rx: 8, ry: 4 },
  { x: 255, y: 186, rx: 22, ry: 9 },
  { x: 345, y: 168, rx: 10, ry: 5 },
];

function EdgeArrow({ p, label, color }: { p: SkyPoint; label: string; color: string }) {
  if (!p.edge) return null;
  const y = Math.min(HORIZON - 8, Math.max(12, p.y * H));
  const left = p.edge === 'left';
  return (
    <text
      x={left ? 6 : W - 6}
      y={y}
      textAnchor={left ? 'start' : 'end'}
      fill={color}
      fontFamily="monospace"
      fontSize="9"
      fontWeight="bold"
    >
      {left ? `◀ ${label}` : `${label} ▶`}
    </text>
  );
}

interface WindowSceneProps {
  sky: SkyState;
  heading: number;
  terrain: Terrain;
}

function WindowSceneImpl({ sky, heading, terrain }: WindowSceneProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ridge = useMemo(() => ridgePath(terrain), [terrain]);

  const sun = placeBody(sky.sunAz, sky.sunEl, sky.lit, heading);
  const earth = placeBody(
    sky.earthAz,
    sky.earthEl,
    sky.earthVisible !== false && sky.earthEl > 0,
    heading,
  );
  const lit = sky.lit;
  const sunX = sun.x * W;
  const sunY = sun.y * H;
  const earthX = earth.x * W;
  const earthY = earth.y * H;
  const fade = 'opacity 0.6s, fill 0.8s';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className="block size-full"
      role="img"
      aria-label={`View from the lander: Sun ${lit ? 'up' : 'down'}, Earth ${earth.up ? 'in the sky' : 'below the horizon'}`}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03050d" />
          <stop offset="1" stopColor="#141a33" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#ff9a3c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}-ground`}
          gradientUnits="userSpaceOnUse"
          x1={sunX}
          y1={HORIZON}
          x2={sunX < W / 2 ? W + 80 : -80}
          y2={H}
        >
          <stop offset="0" stopColor="#8d88a0" />
          <stop offset="0.55" stopColor="#5a566b" />
          <stop offset="1" stopColor="#2b2936" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />

      {/* Stars: dimmer when the sunlit ground floods the view. */}
      <g fill="#dfe8ff" style={{ opacity: lit ? 0.35 : 0.95, transition: fade }}>
        {STARS.map((s, i) => (
          <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} shapeRendering="crispEdges" />
        ))}
      </g>

      {/* Sun glow along the horizon. */}
      <ellipse
        cx={sunX}
        cy={HORIZON}
        rx="150"
        ry="46"
        fill={`url(#${uid}-glow)`}
        style={{ opacity: lit && sun.inView ? 0.9 : 0, transition: fade }}
      />

      {/* Earth: small and blue, night side shaded. */}
      <g style={{ opacity: earth.up && earth.inView ? 1 : 0, transition: 'opacity 0.6s' }}>
        <circle cx={earthX} cy={earthY} r="6" fill="#2f6fd6" stroke="#000" strokeWidth="1" />
        <path
          d={`M${earthX - 3},${earthY - 3} q2,-2 5,0 M${earthX - 4},${earthY + 2} q3,1 5,-1`}
          stroke="#e9f4ff"
          strokeWidth="1.2"
          fill="none"
        />
        <path d={`M${earthX},${earthY - 6} a6,6 0 0 1 0,12 z`} fill="#000" opacity="0.35" />
      </g>

      {/* Sun. */}
      <g style={{ opacity: sun.up && sun.inView ? 1 : 0, transition: 'opacity 0.6s' }}>
        <circle cx={sunX} cy={sunY} r="14" fill="#ffd27a" opacity="0.35" />
        <circle cx={sunX} cy={sunY} r="9" fill="#fff4cf" stroke="#ffb43c" strokeWidth="2" />
      </g>

      {/* Far ridge and near ground. */}
      <path d={ridge} style={{ fill: lit ? '#3d3a4d' : '#0d0c14', transition: fade }} />
      <path
        d={`M0,${HORIZON + 30} Q${W * 0.3},${HORIZON + 18} ${W * 0.55},${HORIZON + 26} T${W},${HORIZON + 22} L${W},${H} L0,${H} Z`}
        fill={lit ? `url(#${uid}-ground)` : '#121119'}
        style={{ transition: fade }}
      />
      {/* Sunlit rim on the ridge crest. */}
      <path
        d={ridge}
        fill="none"
        stroke="#ffb43c"
        strokeWidth="1"
        style={{ opacity: lit ? 0.55 : 0, transition: fade }}
      />

      {/* Boulders with long low-Sun shadows pointing away from the Sun. */}
      {BOULDERS.map((b, i) => {
        const dir = b.x >= sunX ? 1 : -1;
        const len = lit ? 34 + b.rx : 0;
        return (
          <g key={i}>
            <ellipse
              cx={b.x + (dir * len) / 2}
              cy={b.y + 2}
              rx={len / 2 + 2}
              ry={b.ry * 0.7}
              fill="#000"
              style={{ opacity: lit ? 0.5 : 0, transition: 'opacity 0.6s' }}
            />
            <ellipse
              cx={b.x}
              cy={b.y - b.ry * 0.4}
              rx={b.rx}
              ry={b.ry}
              stroke="#000"
              strokeWidth="1"
              style={{ fill: lit ? '#9893ab' : '#1d1b27', transition: fade }}
            />
          </g>
        );
      })}

      <EdgeArrow p={sun} label="SUN" color="#ffd27a" />
      <EdgeArrow p={earth} label="EARTH" color="#8fd3ff" />
    </svg>
  );
}

export const WindowScene = memo(WindowSceneImpl);
