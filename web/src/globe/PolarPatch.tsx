/**
 * South polar terrain mesh on the globe — owner: Marta (src/globe). v2 of docs/10 §5 Marta.
 * Built from Pablo's heightmap (terrain.ts); neutral matte grey so the relief comes from the Sun
 * light alone (no baked hillshade). Rendered only after loadTerrain() has run.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, DirectionalLight, Object3D } from 'three';
import { buildPatchArrays } from './terrain';
import {
  PATCH_PREFETCH_DISTANCE,
  loadTerrain,
  nextPatchShown,
  patchOn,
  useTerrain,
} from './terrainStore';
import { vec3ToLatLon } from './geo';

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
  const shown = useTerrain(patchOn);
  const exaggeration = useTerrain((s) => s.exaggeration);

  const geometry = useMemo(() => {
    if (status !== 'ready' || !header || !heights) return null;
    const a = buildPatchArrays(header, heights, 1, exaggeration, mask); // full 1025² grid
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(a.positions, 3));
    g.setIndex(new BufferAttribute(a.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [status, header, heights, mask, exaggeration]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!geometry) return null;
  return (
    <mesh
      geometry={geometry}
      // Kept mounted while hidden, so coming back to the pole does not rebuild the mesh.
      visible={shown}
      castShadow
      receiveShadow
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (!shown || e.delta > clickTolerancePx) return; // hidden: let the Moon take it
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
  const patchShown = useTerrain(patchOn);
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
        castShadow={patchShown}
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        // Grazing polar sunlight: a small offset along the normal avoids shadow acne on slopes.
        shadow-bias={-0.00005}
        shadow-normalBias={0.0003}
      />
    </>
  );
}

/**
 * Shows the patch only from the "South pole" button's distance in (hides it when zooming out),
 * and starts downloading it a little before.
 */
export function PatchTrigger() {
  useFrame(({ camera }) => {
    const s = useTerrain.getState();
    const p = camera.position;
    const shown = nextPatchShown([p.x, p.y, p.z], s.shown);
    if (shown !== s.shown) s.setShown(shown);
    if (s.status === 'idle' && p.length() < PATCH_PREFETCH_DISTANCE && p.y / p.length() < -0.85)
      void loadTerrain();
  });
  return null;
}
