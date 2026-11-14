/**
 * Layer controls (owner: Javi2): one coloured on/off switch per layer in layers.json. Pro mode adds
 * legend, opacity and draw order. Writes only to the store (activeLayers, layerOpacity); the 2D map
 * and the 3D globe read the same state and draw it.
 */
import type { LayerDef } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { useAppStore, useData } from '@/core';
import { LegendBar } from './Legend';

/** Friendly names and switch colours for known layer ids; unknown ids fall back to layers.json. */
const LAYER_UI: Record<string, { label: string; color: string }> = {
  illumination: { label: 'Sunlight', color: '#ffb84d' },
  slope: { label: 'Slope', color: '#ff6fb5' },
  psr: { label: 'Ice (shadowed craters)', color: '#b894ff' },
  elevation: { label: 'Height', color: '#c9c3d9' },
  score: { label: 'Score', color: '#4fdc8a' },
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
    <section className={cn('box px-4 py-3', className)} aria-label="Map layers">
      {proMode && <h2 className="text-heading mb-1 text-[15px] font-extrabold">Map layers</h2>}
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
  const ui = LAYER_UI[layer.id] ?? { label: layer.label, color: '#b394ff' };

  return (
    <li title={layer.description}>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => toggleLayer(layer.id)}
        className="flex w-full items-center justify-between gap-3 rounded-[6px] px-1 py-1.5 text-left text-[15px] transition-colors hover:bg-white/5"
      >
        <span className={active ? 'text-heading' : 'text-ink-muted'}>
          {proMode ? layer.label : ui.label}
        </span>
        <span
          className="relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full border transition-colors duration-200"
          style={{
            borderColor: active ? ui.color : '#4a3a6e',
            background: active ? `${ui.color}40` : '#120a22',
            boxShadow: active ? `0 0 10px -2px ${ui.color}` : 'none',
          }}
          aria-hidden
        >
          <span
            className="absolute top-[2px] size-[16px] rounded-full transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              left: 2,
              background: active ? ui.color : '#6b5c8f',
              transform: active ? 'translateX(18px)' : 'none',
            }}
          />
        </span>
      </button>
      {active && proMode && (
        <div className="animate-enter mt-1 mb-2 space-y-1.5 px-1">
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
