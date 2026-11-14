/**
 * Layer controls (owner: Javi2): toggle, opacity, draw order and legend for every layer
 * in layers.json. Writes only to the store (activeLayers, layerOpacity); the 2D map and the
 * 3D globe read the same state and draw it.
 */
import { useState } from 'react';
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
  const [showInfo, setShowInfo] = useState(false);
  const id = `layer-${layer.id}`;

  return (
    <li className={cn('px-2.5 py-1.5', active && 'bg-navy-850')}>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="checkbox"
          checked={active}
          onChange={() => toggleLayer(layer.id)}
          className="accent-navy-500 size-3.5"
          aria-label={`${active ? 'Hide' : 'Show'} ${layer.label}`}
        />
        <label
          htmlFor={id}
          className={cn('cursor-pointer', active ? 'text-ink font-bold' : 'text-ink-muted')}
        >
          {layer.label}
        </label>
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          className="lnk text-[10px]"
          aria-label={`About ${layer.label}`}
          aria-expanded={showInfo}
        >
          [?]
        </button>
        {active && (
          <span className="ml-auto flex gap-px">
            {/* "Up" in this list = drawn on top = later in activeLayers. */}
            <button
              type="button"
              disabled={!canUp}
              onClick={() => moveLayer(layer.id, 1)}
              className="btn h-[16px] w-[18px] px-0 text-[9px]"
              aria-label={`Move ${layer.label} up`}
            >
              ▲
            </button>
            <button
              type="button"
              disabled={!canDown}
              onClick={() => moveLayer(layer.id, -1)}
              className="btn h-[16px] w-[18px] px-0 text-[9px]"
              aria-label={`Move ${layer.label} down`}
            >
              ▼
            </button>
          </span>
        )}
      </div>
      {showInfo && (
        <p className="text-ink-muted mt-1 pl-5 text-[11px]">
          {layer.description}
          <span className="text-ink-faint mt-0.5 block text-[10px]">Source: {layer.source}</span>
        </p>
      )}
      {active && (
        <div className="mt-1.5 space-y-1 pl-5">
          <LegendBar layer={layer} />
          <label className="flex items-center gap-2">
            <span className="label w-12">Opacity</span>
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
            <span className="num text-ink-muted w-8 text-right text-[10px]">
              {Math.round(opacity * 100)}%
            </span>
          </label>
        </div>
      )}
    </li>
  );
}
