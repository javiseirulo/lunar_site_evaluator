/**
 * Layer controls (owner: Javi2): one on/off switch per layer in layers.json. Pro mode adds
 * legend, opacity and draw order. Writes only to the store (activeLayers, layerOpacity); the 2D map
 * and the 3D globe read the same state and draw it.
 */
import type { LayerDef } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { useAppStore, useData } from '@/core';
import { LegendBar } from './Legend';

/** Friendly names for known layer ids; unknown ids fall back to layers.json. */
const LAYER_UI: Record<string, { label: string }> = {
  illumination: { label: 'Sunlight' },
  slope: { label: 'Slope' },
  psr: { label: 'Icy craters' },
  elevation: { label: 'Height' },
  score: { label: 'Score' },
};
const ORDER = ['illumination', 'slope', 'psr', 'elevation', 'score'];

export function LayersPanel({ className }: { className?: string }) {
  const manifest = useData((s) => s.layers);
  const proMode = useAppStore((s) => s.proMode);
  const activeLayers = useAppStore((s) => s.activeLayers);
  if (!manifest) return null;

  const layers = [...manifest.layers].sort(
    (a, b) => ((ORDER.indexOf(a.id) + 99) % 99) - ((ORDER.indexOf(b.id) + 99) % 99),
  );

  return (
    <section className={cn('box px-5 pt-4 pb-3', className)} aria-labelledby="layers-heading">
      <h2 id="layers-heading" className="mb-1 text-[18px]">
        Map layers
      </h2>
      <ul className="space-y-1">
        {layers.map((l) => (
          <LayerRow
            key={l.id}
            layer={l}
            index={activeLayers.indexOf(l.id)}
            count={activeLayers.length}
            proMode={proMode}
          />
        ))}
      </ul>
    </section>
  );
}

function LayerRow({
  layer,
  index,
  count,
  proMode,
}: {
  layer: LayerDef;
  index: number;
  count: number;
  proMode: boolean;
}) {
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const moveLayer = useAppStore((s) => s.moveLayer);
  const setLayerOpacity = useAppStore((s) => s.setLayerOpacity);
  const opacity = useAppStore((s) => s.layerOpacity[layer.id] ?? layer.default_opacity);
  const active = index >= 0;
  const ui = LAYER_UI[layer.id] ?? { label: layer.label };

  return (
    <li title={layer.description}>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => toggleLayer(layer.id)}
        className="hover:bg-panel-2 flex w-full items-center justify-between gap-3 rounded-[4px] px-1 py-2 text-left text-[14px] transition-colors"
      >
        <span className={active ? 'text-heading' : 'text-ink-muted'}>
          {proMode ? layer.label : ui.label}
        </span>
        <span className="switch" data-on={active} aria-hidden />
      </button>
      {active && proMode && (
        <div className="mt-1 mb-2 space-y-1.5 px-1">
          <LegendBar layer={layer} />
          <div className="flex items-center gap-2">
            <span className="label w-14">Opacity</span>
            <input
              type="range"
              className="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setLayerOpacity(layer.id, Number(e.target.value))}
              aria-label={`${layer.label} opacity`}
            />
            {/* "Up" = drawn on top = later in activeLayers. */}
            <button
              type="button"
              className="btn btn-quiet h-[22px] w-[24px] px-0 text-[9px]"
              disabled={index >= count - 1}
              onClick={() => moveLayer(layer.id, 1)}
              aria-label={`Move ${layer.label} up`}
            >
              ▲
            </button>
            <button
              type="button"
              className="btn btn-quiet h-[22px] w-[24px] px-0 text-[9px]"
              disabled={index <= 0}
              onClick={() => moveLayer(layer.id, -1)}
              aria-label={`Move ${layer.label} down`}
            >
              ▼
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
