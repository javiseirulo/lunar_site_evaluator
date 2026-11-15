/**
 * Fallback for the recon screen when the 3D terrain is unavailable: a 360° panorama around the
 * landing site with the real Sun and Earth at the touchdown hour (same sky model as the
 * cockpit window, `cockpit/WindowScene`) over a seeded ridge of the site's terrain family.
 * Drag (mouse / touch) to turn; the host also turns it with the arrow keys via `heading`.
 * A body the data says terrain hides gets a peak in front of it.
 */
import { memo, useId, useMemo, useRef } from 'react';
import { mulberry32 } from '../engine/random';
import type { Terrain } from './assets';
import type { SkyState } from './cockpit/sky';
import {
  PANO_FOV_DEG,
  PANO_H,
  PANO_HORIZON,
  PANO_W,
  panoX,
  panoramaGround,
  placePanoBody,
  ridgeDepths,
  type ReconSky,
} from './panorama';

const EARTH_R = 10;
const SUN_R = 5;

const STARS = (() => {
  const rnd = mulberry32(4242);
  return Array.from({ length: 220 }, () => ({
    az: rnd() * 360,
    y: Math.round(rnd() * (PANO_HORIZON - 8)),
    s: rnd() < 0.15 ? 2 : 1,
  }));
})();

interface Props {
  sky: SkyState;
  status: ReconSky;
  terrain: Terrain;
  heading: number;
  onHeading: (heading: number) => void;
}

function ReconPanoramaImpl({ sky, status, terrain, heading, onHeading }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const depths = useMemo(() => ridgeDepths(terrain), [terrain]);
  const drag = useRef<{ id: number; x: number; heading: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const sun = placePanoBody(sky.sunAz, sky.sunEl, status.sun === 'up');
  const earth = placePanoBody(
    sky.earthAz,
    sky.earthEl,
    sky.earthEl > 0 && status.earth !== 'blocked',
  );
  const blocked = [sun, earth].filter((b) => b.blocked);
  const ground = panoramaGround(depths, heading, blocked);
  const lit = status.sun === 'up';
  const sunX = panoX(sky.sunAz, heading);
  const earthX = panoX(sky.earthAz, heading);
  const fade = 'opacity 0.6s, fill 0.8s';

  return (
    <div
      ref={box}
      className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, x: e.clientX, heading };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        // The SVG is sliced to fill the box: the visible width spans ~PANO_FOV_DEG.
        const width = Math.max(200, box.current?.clientWidth ?? PANO_W);
        const next = d.heading - ((e.clientX - d.x) * PANO_FOV_DEG) / width;
        onHeading(((next % 360) + 360) % 360);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <svg
        viewBox={`0 0 ${PANO_W} ${PANO_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="block size-full"
        role="img"
        aria-label={`Simplified view around the landing site, facing ${Math.round(heading)} degrees`}
      >
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#020309" />
            <stop offset="1" stopColor="#11162b" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`}>
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.8" />
            <stop offset="0.4" stopColor="#ff9a3c" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#77738a" />
            <stop offset="1" stopColor="#2b2936" />
          </linearGradient>
        </defs>
        <rect width={PANO_W} height={PANO_H} fill={`url(#${uid}-sky)`} />

        <g fill="#dfe8ff" style={{ opacity: lit ? 0.45 : 0.95, transition: fade }}>
          {STARS.map((s, i) => {
            const x = panoX(s.az, heading);
            if (x < -2 || x > PANO_W + 2) return null;
            return (
              <rect key={i} x={x} y={s.y} width={s.s} height={s.s} shapeRendering="crispEdges" />
            );
          })}
        </g>

        {lit && (
          <ellipse
            cx={sunX}
            cy={PANO_HORIZON}
            rx="140"
            ry="40"
            fill={`url(#${uid}-glow)`}
            opacity="0.85"
          />
        )}

        {/* Earth (dimmed when too low for the antenna). Drawn before the ground: terrain covers it. */}
        <g opacity={status.earth === 'low' ? 0.5 : 1}>
          <circle cx={earthX} cy={earth.y} r={EARTH_R} fill="#2f6fd6" stroke="#000" />
          <path
            d={`M${earthX - 5},${earth.y - 4} q4,-3 8,0 M${earthX - 6},${earth.y + 3} q5,2 8,-2`}
            stroke="#e9f4ff"
            strokeWidth="1.3"
            fill="none"
          />
        </g>
        <g>
          <circle cx={sunX} cy={sun.y} r={SUN_R * 2.2} fill="#ffd27a" opacity="0.35" />
          <circle
            cx={sunX}
            cy={sun.y}
            r={SUN_R}
            fill="#fff4cf"
            stroke="#ffb43c"
            strokeWidth="1.5"
          />
        </g>

        <path
          d={ground}
          fill={lit ? `url(#${uid}-ground)` : '#100f17'}
          style={{ transition: fade }}
        />
        <path
          d={ground}
          fill="none"
          stroke={lit ? '#ffb43c' : '#3a3850'}
          strokeWidth="1"
          opacity={lit ? 0.5 : 0.8}
        />

        {/* Labels above the bodies (or above the peak that hides them). */}
        <BodyLabel x={sunX} y={sun.y} label="SUN" color="#ffd27a" hidden={!sun.up} />
        <BodyLabel x={earthX} y={earth.y} label="EARTH" color="#8fd3ff" hidden={!earth.up} />
      </svg>
    </div>
  );
}

function BodyLabel({
  x,
  y,
  label,
  color,
  hidden,
}: {
  x: number;
  y: number;
  label: string;
  color: string;
  hidden: boolean;
}) {
  if (x < 0 || x > PANO_W) return null;
  const ty = hidden ? Math.min(y, PANO_HORIZON) - 26 : y - 14;
  return (
    <text
      x={Math.min(PANO_W - 24, Math.max(24, x))}
      y={Math.max(10, ty)}
      textAnchor="middle"
      fill={color}
      fontFamily="monospace"
      fontSize="8"
      fontWeight="bold"
      opacity={hidden ? 0.75 : 1}
    >
      {hidden ? `${label} (hidden)` : label}
    </text>
  );
}

export const ReconPanorama = memo(ReconPanoramaImpl);
