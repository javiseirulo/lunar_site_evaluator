/**
 * South polar terrain mesh on the globe — owner: Marta (src/globe). v2 of docs/10 §5 Marta.
 * Built from Pablo's heightmap (terrain.ts); neutral matte grey so the relief comes from the Sun
 * light alone (no baked hillshade). Rendered only after loadTerrain() has run.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry } from 'three';
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

/** Starts loading the terrain once the camera gets close to the south pole. */
export function PatchTrigger() {
  useFrame(({ camera }) => {
    if (useTerrain.getState().status !== 'idle') return;
    const d = camera.position.length();
    if (d < TRIGGER_DISTANCE && camera.position.y / d < TRIGGER_SOUTH) void loadTerrain();
  });
  return null;
}
