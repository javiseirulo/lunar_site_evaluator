/**
 * Map layers in 3D (added by Javi, @javiseirulo, 2026-11-15; the 2D map was dropped).
 *
 * Reads the same store state as the LayersPanel (`activeLayers`, `layerOpacity`) and draws:
 *  - PatchLayers: every active layers.json PNG draped on Marta's polar patch, re-using the patch
 *    geometry with stereographic UVs (patchUvs). Lit like the terrain (shadows are received), with
 *    the layer opacity; nodata (PNG alpha 0) is transparent.
 *  - GlobalHeat: for the grid-backed layers (illumination, earth_vis), the global 1° heat map from
 *    grid/global_1deg.bin on a slightly larger sphere, cut at the patch edge while the patch shows.
 * Nothing here changes the patch mesh, shadows, pins or flights.
 */
import { useEffect, useMemo, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, SphereGeometry, type BufferGeometry } from 'three';
import type { LayerDef, RequirementKey } from '@lunar/contracts';
import { loadLayerTexture, samplePalette, useAppStore, useData } from '@/core';
import { loadGrid, type Grid } from '@/ephem/grid';
import { patchOn, useTerrain } from './terrainStore';

/** Layers that also have a whole-Moon heat map, and the grid metric behind them. */
const GLOBAL_METRIC: Record<string, RequirementKey> = {
  illumination: 'illum_pct',
  earth_vis: 'earth_vis_pct',
};

/** Active layer definitions in draw order (later = on top) with their opacity. */
function useActiveLayerDefs(): { layer: LayerDef; opacity: number }[] {
  const manifest = useData((s) => s.layers);
  const active = useAppStore((s) => s.activeLayers);
  const opacity = useAppStore((s) => s.layerOpacity);
  return useMemo(
    () =>
      active.flatMap((id) => {
        const layer = manifest?.layers.find((l) => l.id === id);
        return layer ? [{ layer, opacity: opacity[id] ?? layer.default_opacity }] : [];
      }),
    [manifest, active, opacity],
  );
}

function useLayerTexture(layer: LayerDef): CanvasTexture | null {
  const [tex, setTex] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    let made: CanvasTexture | null = null;
    loadLayerTexture(layer)
      .then((canvas) => {
        if (!alive) return;
        made = new CanvasTexture(canvas);
        made.colorSpace = SRGBColorSpace;
        made.anisotropy = 8;
        setTex(made);
      })
      .catch(() => setTex(null));
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [layer]);
  return tex;
}

function PatchLayer({
  geometry,
  layer,
  opacity,
  order,
  visible,
}: {
  geometry: BufferGeometry;
  layer: LayerDef;
  opacity: number;
  order: number;
  visible: boolean;
}) {
  const tex = useLayerTexture(layer);
  if (!tex) return null;
  return (
    <mesh
      geometry={geometry}
      visible={visible}
      renderOrder={1 + order}
      receiveShadow
      raycast={noRaycast}
    >
      {/* polygonOffset pulls the overlay in front of the terrain it shares vertices with. */}
      <meshStandardMaterial
        map={tex}
        // Half self-lit: data stays readable in shadow (PSRs are dark by definition), relief still shows.
        emissiveMap={tex}
        emissive="#ffffff"
        emissiveIntensity={0.55}
        transparent
        opacity={opacity}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1 - order}
        polygonOffsetUnits={-4}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

/** Overlays never take clicks: the patch / Moon underneath keep their click handlers. */
function noRaycast() {}

/** Active layers draped on the polar patch (rendered by PolarPatch with its geometry). */
export function PatchLayers({ geometry, visible }: { geometry: BufferGeometry; visible: boolean }) {
  const layers = useActiveLayerDefs();
  return (
    <>
      {layers.map(({ layer, opacity }, i) => (
        <PatchLayer
          key={layer.id}
          geometry={geometry}
          layer={layer}
          opacity={opacity}
          order={i}
          visible={visible}
        />
      ))}
    </>
  );
}

/** Colorize one metric plane of the global grid with the layer's palette (own min–max). */
function heatCanvas(grid: Grid, metric: RequirementKey, layer: LayerDef): HTMLCanvasElement {
  const { width, height, metrics } = grid.def;
  const plane = width * height;
  const k = metrics.indexOf(metric);
  const values = grid.data.subarray(k * plane, (k + 1) * plane);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (Number.isFinite(v)) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const img = ctx.createImageData(width, height);
  for (let i = 0; i < plane; i++) {
    const v = values[i]!;
    if (!Number.isFinite(v)) continue; // NaN stays transparent
    img.data.set(samplePalette(layer.palette, (v - lo) / (hi - lo || 1)), i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function GlobalHeatLayer({
  layer,
  metric,
  opacity,
  order,
  geometry,
}: {
  layer: LayerDef;
  metric: RequirementKey;
  opacity: number;
  order: number;
  geometry: SphereGeometry;
}) {
  const [tex, setTex] = useState<CanvasTexture | null>(null);
  useEffect(() => {
    let alive = true;
    let made: CanvasTexture | null = null;
    loadGrid('global_1deg')
      .then((grid) => {
        if (!alive) return;
        made = new CanvasTexture(heatCanvas(grid, metric, layer));
        made.colorSpace = SRGBColorSpace;
        setTex(made);
      })
      .catch(() => setTex(null));
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [layer, metric]);
  if (!tex) return null;
  return (
    <mesh geometry={geometry} renderOrder={1 + order} raycast={noRaycast}>
      <meshStandardMaterial
        map={tex}
        // Half self-lit: data stays readable in shadow (PSRs are dark by definition), relief still shows.
        emissiveMap={tex}
        emissive="#ffffff"
        emissiveIntensity={0.55}
        transparent
        opacity={opacity}
        depthWrite={false}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

/** Same cap cut as Marta's Moon sphere, so the heat map never covers the polar patch. */
const CAP_OVERLAP_DEG = 0.05;
const HEAT_RADIUS = 1.002;

/** Whole-Moon heat maps (grid/global_1deg.bin) for the active grid-backed layers. */
export function GlobalHeat() {
  const layers = useActiveLayerDefs().filter(({ layer }) => GLOBAL_METRIC[layer.id]);
  const patchShown = useTerrain(patchOn);
  const latLimit = useTerrain((s) => s.header?.lat_limit ?? -80);
  const geometry = useMemo(() => {
    const thetaLength = patchShown ? ((90 - latLimit + CAP_OVERLAP_DEG) * Math.PI) / 180 : Math.PI;
    const g = new SphereGeometry(HEAT_RADIUS, 128, 64, 0, Math.PI * 2, 0, thetaLength);
    if (thetaLength < Math.PI) {
      const uv = g.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - ((1 - uv.getY(i)) * thetaLength) / Math.PI);
      uv.needsUpdate = true;
    }
    return g;
  }, [patchShown, latLimit]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      {layers.map(({ layer, opacity }, i) => (
        <GlobalHeatLayer
          key={layer.id}
          layer={layer}
          metric={GLOBAL_METRIC[layer.id]!}
          opacity={opacity}
          order={i}
          geometry={geometry}
        />
      ))}
    </>
  );
}
