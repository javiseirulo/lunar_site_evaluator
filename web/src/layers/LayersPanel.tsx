/**
 * Layer controls (owner: Javi2): toggle, opacity, draw order and legend for every layer
 * in layers.json. Writes only to the store (activeLayers, layerOpacity); the 2D map and the
 * 3D globe read the same state and draw it.
 */
import { useState } from 'react';
import type { LayerDef } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { Hint, useAppStore, useData } from '@/core';
import { LegendBar } from './Legend';

export function LayersPanel({ className }: { className?: string }) {
  const manifest = useData((s) => s.layers);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const [open, setOpen] = useState(true);

  if (!manifest) return null;
  // Active layers first, top of the stack first; then the inactive ones in manifest order.
  const byId = new Map(manifest.layers.map((l) => [l.id, l]));
  const active = [...activeLayers].reverse().flatMap((id) => byId.get(id) ?? []);
  const inactive = manifest.layers.filter((l) => !activeLayers.includes(l.id));

  return (
    <section className={cn('box', className)} aria-labelledby="layers-heading">
      <div className="box-head">
        <h2 id="layers-heading">Map Layers</h2>
        <span className="ml-auto font-sans font-normal tracking-normal normal-case">
          {activeLayers.length} on ·{' '}
          <button
            type="button"
            className="underline"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? 'hide' : 'show'}
          </button>
        </span>
      </div>
      {open && (
        <ul className="rows">
          {active.map((l, i) => (
            <LayerRow key={l.id} layer={l} active canUp={i > 0} canDown={i < active.length - 1} />
          ))}
          {inactive.map((l) => (
            <LayerRow key={l.id} layer={l} active={false} canUp={false} canDown={false} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LayerRow({
  layer,
  active,
  canUp,
  canDown,
}: {
  layer: LayerDef;
  active: boolean;
  canUp: boolean;
  canDown: boolean;
}) {
  const opacity = useAppStore((s) => s.layerOpacity[layer.id] ?? layer.default_opacity);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const moveLayer = useAppStore((s) => s.moveLayer);
  const setLayerOpacity = useAppStore((s) => s.setLayerOpacity);
  const proMode = useAppStore((s) => s.proMode);
  const id = `layer-${layer.id}`;

  return (
    <li className={cn('px-3.5 py-2.5 transition-colors', active && 'bg-panel-2')}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={active}
          onChange={() => toggleLayer(layer.id)}
          className="accent-pink size-4 cursor-pointer"
          aria-label={`${active ? 'Hide' : 'Show'} ${layer.label}`}
        />
        <label
          htmlFor={id}
          className={cn(
            'cursor-pointer',
            active ? 'text-heading font-extrabold' : 'text-ink-muted font-bold',
          )}
        >
          {layer.label}
        </label>
        <Hint text={proMode ? `${layer.description} Source: ${layer.source}` : layer.description} />
        {active && proMode && (
          <span className="ml-auto flex gap-1">
            {/* "Up" in this list = drawn on top = later in activeLayers. */}
            <button
              type="button"
              disabled={!canUp}
              onClick={() => moveLayer(layer.id, 1)}
              className="btn btn-quiet h-[20px] w-[22px] px-0 text-[9px]"
              aria-label={`Move ${layer.label} up`}
            >
              ▲
            </button>
            <button
              type="button"
              disabled={!canDown}
              onClick={() => moveLayer(layer.id, -1)}
              className="btn btn-quiet h-[20px] w-[22px] px-0 text-[9px]"
              aria-label={`Move ${layer.label} down`}
            >
              ▼
            </button>
          </span>
        )}
      </div>
      {active && (
        <div className="animate-enter mt-2 space-y-1.5 pl-6">
          <LegendBar layer={layer} />
          {proMode && (
            <label className="flex items-center gap-2">
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
              <span className="num text-ink-muted w-9 text-right text-[11px]">
                {Math.round(opacity * 100)}%
              </span>
            </label>
          )}
        </div>
      )}
    </li>
  );
}
