/**
 * PLACEHOLDER — owner: Marta (src/globe). Replace with the R3F globe.
 *
 * Read from the store: selectedSiteId, activeLayers, layerOpacity, currentTimeUTC.
 * Write: selectSite(id) on pin click, setMode('streetview') to enter Street View.
 * Layer textures: `loadLayerTexture(layerDef)` from '@/core' returns a colorized canvas
 * (wrap it in THREE.CanvasTexture). Pin positions: `latLonToUv` / `projectSouthPolar`.
 */
import { Globe2 } from 'lucide-react';

export function GlobeView() {
  return (
    <div className="border-line-strong text-ink-faint flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-full border border-dashed text-center">
      <Globe2 className="size-8" aria-hidden />
      <p className="text-sm">3D globe goes here</p>
      <p className="font-mono text-[11px]">src/globe · Marta</p>
    </div>
  );
}
