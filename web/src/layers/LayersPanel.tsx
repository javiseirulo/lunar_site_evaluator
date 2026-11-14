/**
 * Layer controls (owner: Javi2): toggle, opacity, draw order and legend for every layer
 * in layers.json. Writes only to the store (activeLayers, layerOpacity); the 2D map and the
 * 3D globe read the same state and draw it.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, Info } from 'lucide-react';
import type { LayerDef } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { useAppStore, useData } from '@/core';
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
    <section className={cn('panel overflow-hidden', className)} aria-labelledby="layers-heading">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Layers className="text-ink-muted size-4" aria-hidden />
        <h2 id="layers-heading" className="text-sm font-medium">
          Map layers
        </h2>
        <span className="text-ink-faint ml-1 font-mono text-[11px]">{activeLayers.length} on</span>
        <ChevronDown
          className={cn('text-ink-faint ml-auto size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <ul className="border-line divide-line divide-y border-t">
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
  const [showInfo, setShowInfo] = useState(false);

  return (
    <li className={cn('px-4 py-2.5', !active && 'opacity-60 hover:opacity-100')}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleLayer(layer.id)}
          className={cn(
            'rounded-md p-1 transition-colors',
            active ? 'text-ink hover:bg-space-700' : 'text-ink-faint hover:text-ink',
          )}
          aria-pressed={active}
          aria-label={`${active ? 'Hide' : 'Show'} ${layer.label}`}
        >
          {active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
        <span className="text-sm">{layer.label}</span>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="text-ink-faint hover:text-ink rounded p-0.5"
          aria-label={`About ${layer.label}`}
          aria-expanded={showInfo}
        >
          <Info className="size-3.5" />
        </button>
        {active && (
          <div className="ml-auto flex">
            {/* "Up" in this list = drawn on top = later in activeLayers. */}
            <button
              type="button"
              disabled={!canUp}
              onClick={() => moveLayer(layer.id, 1)}
              className="text-ink-faint hover:text-ink rounded p-0.5 disabled:opacity-25"
              aria-label={`Move ${layer.label} up`}
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={!canDown}
              onClick={() => moveLayer(layer.id, -1)}
              className="text-ink-faint hover:text-ink rounded p-0.5 disabled:opacity-25"
              aria-label={`Move ${layer.label} down`}
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        )}
      </div>
      {showInfo && (
        <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">
          {layer.description}
          <span className="text-ink-faint mt-1 block font-mono text-[10px]">
            Source: {layer.source}
          </span>
        </p>
      )}
      {active && (
        <div className="mt-2 space-y-2 pl-8">
          <LegendBar layer={layer} />
          <label className="flex items-center gap-2">
            <span className="text-ink-faint w-12 font-mono text-[10px]">Opacity</span>
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
            <span className="num text-ink-muted w-8 text-right text-[11px]">
              {Math.round(opacity * 100)}
            </span>
          </label>
        </div>
      )}
    </li>
  );
}
