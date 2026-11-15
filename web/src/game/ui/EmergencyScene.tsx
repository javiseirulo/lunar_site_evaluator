/**
 * The animated emergency scene for the `alert` phase: the emergency picture with a CSS effect
 * layered on the spot that fails (see `emergencyFx.ts` for where):
 * - propulsion → the engine flame sputters and throws sparks, the lander rattles;
 * - solar storm → the Sun glows in the corner and throws flares that wash over the scene;
 * - guidance → the three console screens fill with static and spark;
 * - fuel leak → the valve vents puffs of vapour;
 * - comms → signal rings from the bent antenna break up and "NO SIGNAL" glitches.
 * With reduced motion the picture stays still and only the static glows show.
 */
import type { CSSProperties } from 'react';
import { clsx } from 'clsx';
import { emergencyImage } from './assets';
import { GameImage } from './GameImage';
import {
  particleOffset,
  particles,
  sceneLayout,
  type Particle,
  type Point,
  type SceneLayout,
} from './emergencyFx';

const CSS = `
.mission-scene { container-type: inline-size; }
@keyframes mission-spark {
  0% { transform: translate(-50%, -50%); opacity: 1; }
  100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))); opacity: 0; }
}
.mission-spark {
  position: absolute; border-radius: 1px;
  background: var(--c, #ffd76a); box-shadow: 0 0 4px var(--c, #ffb43c);
  animation: mission-spark var(--dur) ease-out var(--delay) infinite both;
}
@keyframes mission-sputter {
  0%, 100% { transform: translate(-50%, 0) scaleY(1); opacity: 1; }
  12% { transform: translate(-50%, 0) scaleY(0.35); opacity: 0.6; }
  20% { transform: translate(-50%, 0) scaleY(1.35); opacity: 1; }
  34% { transform: translate(-50%, 0) scaleY(0.1); opacity: 0.15; }
  52% { transform: translate(-50%, 0) scaleY(1.1); opacity: 1; }
  60% { transform: translate(-50%, 0) scaleY(0.05); opacity: 0; }
  74% { transform: translate(-50%, 0) scaleY(0.8); opacity: 0.9; }
}
.mission-flame {
  position: absolute; width: 4.5cqw; height: 11cqw; transform-origin: 50% 0;
  background: radial-gradient(ellipse 50% 60% at 50% 20%, #fff7c2 0 25%, #ffb43c 45%, #ff5a1f 70%, transparent 72%);
  filter: drop-shadow(0 0 6px #ff7a1f);
  animation: mission-sputter 1.1s steps(9) infinite;
}
@keyframes mission-rattle {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-1.5px, 1px); }
  50% { transform: translate(1px, -1px); }
  75% { transform: translate(1.5px, 0.5px); }
}
.mission-scene[data-effect='engine'] > img { animation: mission-rattle 0.18s steps(2) infinite; }
@keyframes mission-sun {
  0%, 100% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
  50% { transform: translate(-50%, -50%) scale(1.08); filter: brightness(1.35); }
}
.mission-sun {
  position: absolute; width: 34cqw; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, #fffbe0 0 14%, #ffd25a 24%, #ff8a2a 40%, #ff5a1f55 58%, transparent 70%);
  animation: mission-sun 1.6s ease-in-out infinite;
}
@keyframes mission-ring {
  0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.95; }
  100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
}
.mission-flare-ring {
  position: absolute; width: 30cqw; aspect-ratio: 1; border-radius: 50%;
  border: 0.8cqw solid #ffb43c; box-shadow: 0 0 14px #ff7a1f, inset 0 0 14px #ff7a1f;
  animation: mission-ring 2.4s ease-out infinite both;
}
@keyframes mission-wash {
  0%, 70%, 100% { opacity: 0; }
  76% { opacity: 0.45; }
  86% { opacity: 0.1; }
}
.mission-wash { position: absolute; inset: 0; animation: mission-wash 2.4s linear infinite; }
@keyframes mission-noise {
  0% { background-position: 0 0; opacity: 0.85; }
  33% { background-position: 0 -3px; opacity: 0.55; }
  66% { background-position: 0 2px; opacity: 0.95; }
  100% { background-position: 0 0; opacity: 0.4; }
}
.mission-noise {
  position: absolute; width: 24cqw; height: 17cqw; border-radius: 0.6cqw; transform: translate(-50%, -50%);
  background:
    repeating-linear-gradient(0deg, #ffffff40 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, #ff3b3018 0 2px, transparent 2px 5px),
    #1a0610aa;
  mix-blend-mode: screen;
  animation: mission-noise 0.16s steps(3) infinite;
}
@keyframes mission-puff {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.85; }
  100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(2.6); opacity: 0; }
}
.mission-puff {
  position: absolute; width: 3cqw; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, #f2fbff 0 30%, #bfe6ffaa 55%, transparent 72%);
  animation: mission-puff var(--dur) ease-out var(--delay) infinite both;
}
@keyframes mission-signal {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
  45% { opacity: 1; }
  50% { opacity: 0; }
  60% { opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
}
.mission-signal-ring {
  position: absolute; width: 12cqw; aspect-ratio: 1; border-radius: 50%;
  border: 0.5cqw dashed #ff5fae; border-bottom-color: transparent; border-left-color: transparent;
  rotate: -45deg;
  animation: mission-signal 1.8s steps(10) infinite both;
}
@keyframes mission-glitch {
  0%, 82%, 100% { transform: translateX(0); opacity: 0; }
  84% { transform: translateX(-3cqw); opacity: 1; }
  88% { transform: translateX(2cqw); opacity: 1; }
  92% { transform: translateX(-1cqw); opacity: 0.7; }
}
.mission-glitch-band {
  position: absolute; inset-inline: 0; height: 5%;
  background: linear-gradient(90deg, transparent, #ff5fae33 20%, #5ab4ff33 60%, transparent);
  animation: mission-glitch 1.3s steps(1) infinite;
}
.mission-nosignal { animation: mission-blink 0.7s steps(1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .mission-scene * , .mission-scene > img { animation: none !important; }
  .mission-spark, .mission-puff, .mission-flare-ring, .mission-signal-ring, .mission-glitch-band,
  .mission-wash { display: none; }
}
`;

const at = (p: Point): CSSProperties => ({ left: `${p.x}%`, top: `${p.y}%` });

function Sparks({
  origin,
  list,
  color,
  className = 'mission-spark',
}: {
  origin: Point;
  list: readonly Particle[];
  color?: string;
  className?: string;
}) {
  return list.map((p, i) => {
    const { dx, dy } = particleOffset(p);
    const style = {
      ...at(origin),
      width: p.size,
      height: p.size,
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      '--delay': `${p.delay}s`,
      '--dur': `${p.dur}s`,
      ...(color ? { '--c': color } : {}),
    } as CSSProperties;
    return <span key={i} className={className} style={style} />;
  });
}

// Seeded once at module load: the same sparks on every play.
const ENGINE_SPARKS = particles(18, 11, { baseAngle: 90, spread: 170, minDist: 30, maxDist: 90 });
const SCREEN_SPARKS = [0, 1, 2].map((i) =>
  particles(8, 30 + i, { baseAngle: -90, spread: 150, minDist: 18, maxDist: 55 }),
);
const STEAM_PUFFS = particles(10, 7, { baseAngle: -20, spread: 45, minDist: 60, maxDist: 150 }).map(
  (p) => ({ ...p, dur: p.dur + 0.9 }),
);

function Effect({ effect, anchors }: SceneLayout) {
  const [a] = anchors;
  switch (effect) {
    case 'engine':
      return (
        <>
          <span className="mission-flame" style={at(a)} />
          <Sparks origin={a} list={ENGINE_SPARKS} />
        </>
      );
    case 'flare':
      return (
        <>
          <span className="mission-wash bg-[#ffb43c]" />
          {[0, 0.8, 1.6].map((d) => (
            <span
              key={d}
              className="mission-flare-ring"
              style={{ ...at(a), animationDelay: `${d}s` }}
            />
          ))}
          <span className="mission-sun" style={at(a)} />
        </>
      );
    case 'screens':
      return (
        <>
          <span className="mission-wash bg-[#ff3b30]" />
          {anchors.map((p, i) => (
            <span key={i}>
              <span
                className="mission-noise"
                style={{ ...at(p), animationDelay: `${i * 0.05}s` }}
              />
              <Sparks
                origin={{ x: p.x + (i - 1) * 4, y: p.y - 14 }}
                list={SCREEN_SPARKS[i] ?? []}
                color="#bfe6ff"
              />
            </span>
          ))}
        </>
      );
    case 'steam':
      return <Sparks origin={a} list={STEAM_PUFFS} className="mission-puff" />;
    case 'signal':
      return (
        <>
          {[0, 0.6, 1.2].map((d) => (
            <span
              key={d}
              className="mission-signal-ring"
              style={{ ...at(a), animationDelay: `${d}s` }}
            />
          ))}
          {[18, 47, 71].map((top, i) => (
            <span
              key={top}
              className="mission-glitch-band"
              style={{ top: `${top}%`, animationDelay: `${i * 0.37}s` }}
            />
          ))}
          <span
            className="mission-nosignal absolute font-mono text-[3cqw] font-bold tracking-widest text-[#ff5fae]"
            style={{ left: `${a.x + 8}%`, top: `${a.y + 6}%` }}
          >
            NO SIGNAL
          </span>
        </>
      );
  }
}

export function EmergencyScene({
  emergencyId,
  title,
  className,
}: {
  emergencyId: string | null;
  title?: string;
  className?: string;
}) {
  const layout = sceneLayout(emergencyId);
  return (
    <div
      data-effect={layout?.effect}
      className={clsx(
        'mission-scene relative aspect-video w-full overflow-hidden border-4 border-black',
        className,
      )}
    >
      <style href="mission-emergency-fx" precedence="default">
        {CSS}
      </style>
      <GameImage
        src={emergencyImage(emergencyId)}
        alt={title ? `${title} scene` : 'Emergency scene'}
        label="Emergency scene pending"
        className="absolute inset-0 size-full [image-rendering:pixelated]"
      />
      {layout && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Effect effect={layout.effect} anchors={layout.anchors} />
        </div>
      )}
    </div>
  );
}
