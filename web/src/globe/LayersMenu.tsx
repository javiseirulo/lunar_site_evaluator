/**
 * One "Layers" button over the 3D globe that opens a menu with every layer — owner: Marta (src/globe).
 * Rows: the raster layers of layers.json (shared store: activeLayers, layerOpacity), then the two
 * local layers, Day / night and Past landings. Expert adds legend, opacity and draw order per raster.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LayerDef } from '@lunar/contracts';
import { useAppStore, useData } from '@/core';
import { LegendBar } from '@/layers';
import { NightDetails } from './DayNight';
import { HistoricDetails, useHistoricSwitch } from './HistoricControls';
import { useNightLayer } from './nightLayer';
import { PAPER } from './paper';

/** Friendly names (student view); Expert shows the names in layers.json. */
const LAYER_UI: Record<string, string> = {
  illumination: 'Sunlight',
  slope: 'Slope',
  psr: 'Icy craters',
  elevation: 'Height',
  earth_vis: 'Earth in view',
};
const ORDER = ['illumination', 'earth_vis', 'slope', 'psr', 'elevation'];

function Row({
  label,
  on,
  onToggle,
  disabled,
  hint,
  title,
  children,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  hint?: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <li title={title}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onToggle}
        className="hover:bg-panel-2 flex w-full items-center justify-between gap-3 rounded-[4px] px-1 py-1.5 text-left text-[13px] transition-colors disabled:cursor-default disabled:opacity-60"
      >
        <span className={on ? 'text-heading' : 'text-ink-muted'}>{label}</span>
        <span className="flex items-center gap-2">
          {hint && <span className="text-ink-muted text-[11px]">{hint}</span>}
          <span className="switch" data-on={on} aria-hidden />
        </span>
      </button>
      {on && children}
    </li>
  );
}

function RasterRow({
  layer,
  index,
  count,
  expert,
}: {
  layer: LayerDef;
  index: number;
  count: number;
  expert: boolean;
}) {
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const moveLayer = useAppStore((s) => s.moveLayer);
  const setLayerOpacity = useAppStore((s) => s.setLayerOpacity);
  const opacity = useAppStore((s) => s.layerOpacity[layer.id] ?? layer.default_opacity);
  return (
    <Row
      label={expert ? layer.label : (LAYER_UI[layer.id] ?? layer.label)}
      on={index >= 0}
      onToggle={() => toggleLayer(layer.id)}
      title={layer.description}
    >
      {expert && (
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
    </Row>
  );
}

export function LayersMenu({ hasSun, expert }: { hasSun: boolean; expert: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const manifest = useData((s) => s.layers);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const nightOn = useNightLayer((s) => s.on);
  const setNightOn = useNightLayer((s) => s.setOn);
  const historic = useHistoricSwitch();

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rasters = [...(manifest?.layers ?? [])].sort(
    (a, b) => ((ORDER.indexOf(a.id) + 99) % 99) - ((ORDER.indexOf(b.id) + 99) % 99),
  );
  const activeCount =
    rasters.filter((l) => activeLayers.includes(l.id)).length +
    (nightOn ? 1 : 0) +
    (historic.on ? 1 : 0);

  return (
    <div ref={ref} className="relative" style={PAPER}>
      <button
        type="button"
        className="btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Layers{activeCount > 0 && <span className="num ml-1.5">· {activeCount}</span>}
        <span aria-hidden className="ml-2 text-[9px]">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div
          className="box absolute top-full left-0 z-10 mt-1 max-h-[60vh] w-64 overflow-y-auto px-3 py-2"
          role="group"
          aria-label="Map layers"
        >
          <ul className="space-y-0.5">
            {rasters.map((l) => (
              <RasterRow
                key={l.id}
                layer={l}
                index={activeLayers.indexOf(l.id)}
                count={activeLayers.length}
                expert={expert}
              />
            ))}
            <Row label="Day / night" on={nightOn} onToggle={() => setNightOn(!nightOn)}>
              <NightDetails hasSun={hasSun} />
            </Row>
            <Row
              label="Past landings"
              on={historic.on}
              onToggle={historic.toggle}
              disabled={historic.busy}
              hint={
                historic.unavailable
                  ? 'unavailable · retry'
                  : historic.status === 'loading'
                    ? 'loading…'
                    : undefined
              }
            >
              <HistoricDetails />
            </Row>
          </ul>
        </div>
      )}
    </div>
  );
}
