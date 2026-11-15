/**
 * South polar terrain mesh on the globe — owner: Marta (src/globe). v2 of docs/10 §5 Marta.
 * Built from Pablo's heightmap (terrain.ts); neutral matte grey so the relief comes from the Sun
 * light alone (no baked hillshade). Rendered only after loadTerrain() has run.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DirectionalLight, Object3D } from 'three';
import { buildPatchArrays } from './terrain';
import { loadTerrain, useTerrain } from './terrainStore';
import { vec3ToLatLon } from './geo';

/** Load the patch when the camera is this close to the Moon (centre distance)… */
const TRIGGER_DISTANCE = 1.8;
/** …and looking at the south polar region (camera direction's y below this). */
const TRIGGER_SOUTH = -0.85;

export function PolarPatch({
  onSurfaceClick,
  clickTolerancePx,
}: {
  onSurfaceClick: (lat: number, lon: number) => void;
  clickTolerancePx: number;
}) {
  const status = useTerrain((s) => s.status);
  const header = useTerrain((s) => s.header);
  const heights = useTerrain((s) => s.heights);
  const mask = useTerrain((s) => s.mask);
  const highDetail = useTerrain((s) => s.highDetail);
  const exaggeration = useTerrain((s) => s.exaggeration);

  const geometry = useMemo(() => {
    if (status !== 'ready' || !header || !heights) return null;
    const a = buildPatchArrays(header, heights, highDetail ? 1 : 2, exaggeration, mask);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(a.positions, 3));
    g.setIndex(new BufferAttribute(a.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [status, header, heights, mask, highDetail, exaggeration]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!geometry) return null;
  return (
    <mesh
      geometry={geometry}
      castShadow
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > clickTolerancePx) return;
        e.stopPropagation();
        const [lat, lon] = vec3ToLatLon(e.point.x, e.point.y, e.point.z);
        onSurfaceClick(lat, lon);
      }}
    >
      <meshStandardMaterial color="#8c8c8c" roughness={1} metalness={0} />
    </mesh>
  );
}

/**
 * Bounding sphere of the patch in globe units: the 80°S cap spans y ∈ [−1, −cos 10°] and a
 * horizontal radius of sin 10° ≈ 0.174; a little margin covers the relief (±10 km ≈ 0.006).
 */
const PATCH_CENTER: [number, number, number] = [0, -0.992, 0];
const PATCH_RADIUS = 0.185;
/** Distance from the patch centre to the light along the Sun direction (only the direction matters). */
const LIGHT_DISTANCE = 2;
/** 4096² over ~0.37 globe units ≈ 160 m per shadow texel. */
const SHADOW_MAP_SIZE = 4096;

/**
 * The scene's directional (Sun) light. While the polar patch is loaded it casts shadows, with an
 * orthographic shadow camera fitted to the patch; otherwise it is a plain light (no shadow cost).
 */
export function SunLight({
  direction,
  intensity,
}: {
  /** Unit vector towards the Sun (or any light direction), Three axes. */
  direction: readonly [number, number, number];
  intensity: number;
}) {
  const patchReady = useTerrain((s) => s.status === 'ready');
  const light = useRef<DirectionalLight>(null);
  const target = useRef<Object3D>(null);

  useLayoutEffect(() => {
    const l = light.current;
    if (!l || !target.current) return;
    l.target = target.current;
    const cam = l.shadow.camera;
    cam.left = cam.bottom = -PATCH_RADIUS;
    cam.right = cam.top = PATCH_RADIUS;
    cam.near = LIGHT_DISTANCE - PATCH_RADIUS;
    cam.far = LIGHT_DISTANCE + PATCH_RADIUS;
    cam.updateProjectionMatrix();
  }, []);

  const [dx, dy, dz] = direction;
  const [cx, cy, cz] = PATCH_CENTER;
  return (
    <>
      <object3D ref={target} position={PATCH_CENTER} />
      <directionalLight
        ref={light}
        position={[cx + dx * LIGHT_DISTANCE, cy + dy * LIGHT_DISTANCE, cz + dz * LIGHT_DISTANCE]}
        intensity={intensity}
        castShadow={patchReady}
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        // Grazing polar sunlight: a small offset along the normal avoids shadow acne on slopes.
        shadow-bias={-0.00005}
        shadow-normalBias={0.0003}
      />
    </>
  );
}

/** Starts loading the terrain once the camera gets close to the south pole. */
export function PatchTrigger() {
  useFrame(({ camera }) => {
    if (useTerrain.getState().status !== 'idle') return;
    const d = camera.position.length();
    if (d < TRIGGER_DISTANCE && camera.position.y / d < TRIGGER_SOUTH) void loadTerrain();
  });
  return null;
}
