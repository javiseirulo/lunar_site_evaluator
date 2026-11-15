/**
 * Cinematic globe — owner: Marta (src/globe); added for the Mission game (#100).
 *
 * Rendered by `GlobeView` only when its optional `cinematic` prop is set (Explore never mounts
 * it). Same Moon and polar terrain patch as Explore, but: no cards, labels, overlays or controls,
 * no clicks or hover, and the camera follows the shot (cinematic.ts). Lighting is its own (see
 * `LIGHTS`): a camera-relative key light while spinning, the real Sun for the Mission Clock date
 * plus a soft fill in the other shots. Markers show only the label they are given (the game passes card numbers).
 * With prefers-reduced-motion the camera jumps straight to each pose and the spin stays still.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import {
  CanvasTexture,
  DirectionalLight,
  Matrix4,
  Object3D,
  Quaternion,
  SRGBColorSpace,
  Sprite,
  Vector3,
} from 'three';
import { useAppStore } from '@/core';
import { Moon, PlaceholderMoon } from './GlobeCanvas';
import { PatchTrigger, PolarPatch, SunLight } from './PolarPatch';
import { useSunDirection } from './sunLight';
import { useTerrainLift } from './terrainStore';
import { latLonToVec3, type Vec3Tuple } from './geo';
import {
  DIVE_ALTITUDE,
  LIGHT_BLEND_MS,
  LIGHTS,
  POLE_FLIGHT_MS,
  REVEAL_ALTITUDE,
  REVEAL_FLIGHT_MS,
  easeInOutCubic,
  expoOut,
  flightPosition,
  lonOf,
  lookDownPose,
  mixDir,
  poleFraming,
  spinPose,
  stepToward,
  type CinematicMarker,
  type CinematicShot,
  type CinematicView,
  type Pose,
} from './cinematic';

/** Light used when there is no ephemeris for the Mission Clock date (as in Explore). */
const FIXED_LIGHT_DIR = new Vector3(4, 1.5, 3).normalize().toArray();
/** Fly-in time when a new spin starts from another pose. */
const SPIN_FLIGHT_MS = 2000;
/** With reduced motion, a shot holds its final frame this long before it reports done. */
const REDUCED_HOLD_MS = 600;
/** Marker height on screen, as a fraction of its distance to the camera (~28 px at 600 px). */
const MARKER_SIZE = 0.04;
const MARKER_ALTITUDE = 1.001;
const noop = () => {};

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

export default function CinematicCanvas({
  view,
  onShotDone,
}: {
  view: CinematicView;
  onShotDone?: () => void;
}) {
  const now = useAppStore((s) => s.currentTimeUTC);
  const sunDir = useSunDirection(now).dir;
  const reduced = usePrefersReducedMotion();
  const doneRef = useRef(onShotDone);
  useEffect(() => {
    doneRef.current = onShotDone;
  }, [onShotDone]);
  const { shot } = view;
  const initial = useMemo(() => spinPose(0, 0).position, []);

  return (
    // Decorative and inert: pointer events never reach the canvas.
    <div className="pointer-events-none relative size-full overflow-hidden bg-black" aria-hidden>
      <Canvas camera={{ position: initial, fov: 45, near: 0.001, far: 200 }} dpr={[1, 2]} shadows>
        <color attach="background" args={['#000000']} />
        <CinematicLights
          sunDir={sunDir ?? FIXED_LIGHT_DIR}
          spin={shot.kind === 'spin'}
          reduced={reduced}
        />
        <Stars radius={60} depth={30} count={3000} factor={3} saturation={0} fade />
        <Suspense fallback={<PlaceholderMoon />}>
          <Moon onReady={noop} onSurfaceClick={noop} />
        </Suspense>
        <PolarPatch onSurfaceClick={noop} clickTolerancePx={0} />
        <PatchTrigger />
        {shot.kind === 'pole' &&
          shot.markers.map((m) => <Marker key={m.id} marker={m} variant="badge" />)}
        {shot.kind === 'reveal' && (
          <Marker marker={{ id: 'reveal', ...shot.target, label: shot.label }} variant="tag" />
        )}
        <ShotRig shot={shot} reduced={reduced} onDone={() => doneRef.current?.()} />
      </Canvas>
    </div>
  );
}

const SUN_STEP = 0.05;

/**
 * Ambient + the real Sun (with the patch shadows) + one camera-relative light that is the key
 * light while spinning and a soft fill otherwise. The Sun fades out while spinning (the key
 * light takes over) and back in for the other shots.
 */
function CinematicLights({
  sunDir,
  spin,
  reduced,
}: {
  sunDir: readonly [number, number, number];
  spin: boolean;
  reduced: boolean;
}) {
  const camLight = useRef<DirectionalLight>(null);
  const camTarget = useRef<Object3D>(null);
  /** 1 = spin lighting, 0 = Sun + fill. */
  const w = useRef(spin ? 1 : 0);
  const last = useRef<number | null>(null);
  const [sunI, setSunI] = useState(() => (spin ? 0 : LIGHTS.sun));
  const sunIRef = useRef(sunI);
  const local = useMemo(() => new Vector3(), []);

  useFrame(({ camera }) => {
    const now = performance.now();
    const dt = last.current === null ? 0 : now - last.current;
    last.current = now;
    w.current = stepToward(w.current, spin ? 1 : 0, dt, reduced ? 0 : LIGHT_BLEND_MS);
    const k = w.current;

    const l = camLight.current;
    const t = camTarget.current;
    if (l && t) {
      local.set(...mixDir(LIGHTS.fillDir, LIGHTS.keyDir, k)).applyQuaternion(camera.quaternion);
      l.target = t;
      l.position.copy(local).multiplyScalar(10);
      l.intensity = LIGHTS.fill + (LIGHTS.key - LIGHTS.fill) * k;
    }

    // The Sun's light re-renders SunLight: only in coarse steps, and only while it changes.
    const want = LIGHTS.sun * (1 - k);
    if (
      Math.abs(want - sunIRef.current) >= SUN_STEP ||
      (want !== sunIRef.current && (k === 0 || k === 1))
    ) {
      sunIRef.current = want;
      setSunI(want);
    }
  });

  return (
    <>
      <ambientLight intensity={LIGHTS.ambient} />
      <object3D ref={camTarget} position={[0, 0, 0]} />
      <directionalLight ref={camLight} intensity={spin ? LIGHTS.key : LIGHTS.fill} />
      <SunLight direction={sunDir} intensity={sunI} />
    </>
  );
}

/** Stable identity of a shot: a new key restarts the camera move. */
function shotKey(shot: CinematicShot): string {
  return JSON.stringify(shot);
}

interface Run {
  key: string;
  startMs: number;
  fromPos: Vec3Tuple;
  fromQuat: Quaternion;
  lon0: number;
  done: boolean;
}

function quatFor(pose: Pose): Quaternion {
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().lookAt(
      new Vector3(...pose.position),
      new Vector3(...pose.target),
      new Vector3(...pose.up),
    ),
  );
}

/** Moves the camera along the current shot and reports when a finite shot ends. */
function ShotRig({
  shot,
  reduced,
  onDone,
}: {
  shot: CinematicShot;
  reduced: boolean;
  onDone: () => void;
}) {
  const camera = useThree((s) => s.camera);
  const lift = useTerrainLift();
  const run = useRef<Run | null>(null);
  const key = shotKey(shot);

  useFrame(() => {
    const now = performance.now();
    let r = run.current;
    if (!r || r.key !== key) {
      if (shot.kind === 'reveal') {
        // The reveal starts low over the site, wherever the camera was.
        const { lat, lon } = shot.target;
        const start = lookDownPose(lat, lon, lift(lat, lon), DIVE_ALTITUDE * 2, [
          camera.position.x,
          camera.position.y,
          camera.position.z,
        ]);
        camera.position.set(...start.position);
        camera.quaternion.copy(quatFor(start));
      }
      const p: Vec3Tuple = [camera.position.x, camera.position.y, camera.position.z];
      r = run.current = {
        key,
        startMs: now,
        fromPos: p,
        fromQuat: camera.quaternion.clone(),
        lon0: lonOf(p),
        done: false,
      };
    }

    const elapsed = now - r.startMs;
    let end: Pose;
    let flyMs: number;
    let ease: (t: number) => number;
    switch (shot.kind) {
      case 'spin':
        end = spinPose(r.lon0, reduced ? 0 : elapsed);
        flyMs = SPIN_FLIGHT_MS;
        ease = easeInOutCubic;
        break;
      case 'pole':
        end = poleFraming(shot.markers, r.fromPos);
        flyMs = POLE_FLIGHT_MS;
        ease = (t) => expoOut(t, 4);
        break;
      case 'dive': {
        const { lat, lon } = shot.target;
        end = lookDownPose(lat, lon, lift(lat, lon), DIVE_ALTITUDE, r.fromPos);
        flyMs = Math.max(1, shot.durationMs);
        ease = (t) => expoOut(t, 5);
        break;
      }
      case 'reveal': {
        const { lat, lon } = shot.target;
        end = lookDownPose(lat, lon, lift(lat, lon), REVEAL_ALTITUDE, r.fromPos);
        flyMs = REVEAL_FLIGHT_MS;
        ease = easeInOutCubic;
        break;
      }
    }

    const e = reduced ? 1 : ease(elapsed / flyMs);
    camera.position.set(...flightPosition(r.fromPos, end.position, e));
    camera.quaternion.slerpQuaternions(r.fromQuat, quatFor(end), e);

    if (!r.done && shot.kind !== 'spin' && elapsed >= (reduced ? REDUCED_HOLD_MS : flyMs)) {
      r.done = true;
      onDone();
    }
  });

  return null;
}

interface LabelTexture {
  texture: CanvasTexture;
  /** Width / height. */
  aspect: number;
  /** Anchor x (0–1) of the point the marker stands on. */
  anchorX: number;
}

const labelTextures = new Map<string, LabelTexture>();

/** "badge": gold disc with a short label (card number). "tag": gold dot + a name plate. */
function labelTexture(label: string, variant: 'badge' | 'tag'): LabelTexture {
  const cacheKey = `${variant}:${label}`;
  let t = labelTextures.get(cacheKey);
  if (t) return t;
  const h = 128;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  if (variant === 'badge') {
    c.width = c.height = h;
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = '#000000';
    g.stroke();
    g.fillStyle = '#000000';
    g.font = 'bold 72px ui-monospace, Menlo, Consolas, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 64, 70);
    t = { texture: new CanvasTexture(c), aspect: 1, anchorX: 0.5 };
  } else {
    const font = 'bold 56px ui-monospace, Menlo, Consolas, monospace';
    g.font = font;
    const textW = Math.ceil(g.measureText(label).width);
    c.width = h + 24 + textW + 32;
    c.height = h;
    g.font = font; // resizing the canvas resets the context
    g.fillStyle = '#ffd23f';
    g.beginPath();
    g.arc(h / 2, h / 2, 26, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#000000';
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.fillRect(h, 16, c.width - h, h - 32);
    g.fillStyle = '#ffffff';
    g.textBaseline = 'middle';
    g.fillText(label, h + 16, h / 2 + 2);
    t = { texture: new CanvasTexture(c), aspect: c.width / h, anchorX: h / 2 / c.width };
  }
  t.texture.colorSpace = SRGBColorSpace;
  labelTextures.set(cacheKey, t);
  return t;
}

/** Constant-size sprite standing on the ground (terrain where loaded), drawn over everything. */
function Marker({ marker, variant }: { marker: CinematicMarker; variant: 'badge' | 'tag' }) {
  const sprite = useRef<Sprite>(null);
  const lift = useTerrainLift();
  const { lat, lon, label } = marker;
  const position = useMemo(
    () => new Vector3(...latLonToVec3(lat, lon, MARKER_ALTITUDE + lift(lat, lon))),
    [lat, lon, lift],
  );
  const tex = useMemo(() => labelTexture(label, variant), [label, variant]);

  useFrame(({ camera }) => {
    const s = camera.position.distanceTo(position) * MARKER_SIZE;
    sprite.current?.scale.set(s * tex.aspect, s, 1);
  });

  return (
    <sprite ref={sprite} position={position} center={[tex.anchorX, 0.5]} renderOrder={10}>
      <spriteMaterial map={tex.texture} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
}
