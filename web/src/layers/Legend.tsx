import type { LayerDef } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { paletteCss, useAppStore, useData } from '@/core';

function formatValue(v: number, units: string) {
  if (units === '% of time' || units === '0–1')
    return units === '0–1' ? v.toFixed(1) : `${Math.round(v * 100)}%`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)} km`;
  return `${Math.round(v)}${units === '°' ? '°' : units ? ` ${units}` : ''}`;
}

/** Colour ramp (continuous) or swatches (categorical) for one layer. */
export function LegendBar({ layer, className }: { layer: LayerDef; className?: string }) {
  if (layer.kind === 'categorical' && layer.categories) {
    const [min, max] = layer.value_range;
    return (
      <div className={cn('flex flex-wrap gap-x-3 gap-y-1', className)}>
        {Object.entries(layer.categories).map(([value, label]) => {
          const t = (Number(value) - min) / (max - min || 1);
          const stop = layer.palette.reduce((best, s) =>
            Math.abs(s[0] - t) < Math.abs(best[0] - t) ? s : best,
          );
          return (
            <span key={value} className="text-ink-muted flex items-center gap-1.5 text-[11px]">
              <span
                className="border-line-strong size-2.5 rounded-sm border"
                style={{ background: stop[1] }}
              />
              {label}
            </span>
          );
        })}
      </div>
    );
  }
  const [min, max] = layer.value_range;
  return (
    <div className={className}>
      <div className="h-1.5 rounded-full" style={{ background: paletteCss(layer.palette) }} />
      <div className="text-ink-faint mt-1 flex justify-between font-mono text-[10px]">
        <span>{formatValue(min, layer.units)}</span>
        <span>{formatValue(max, layer.units)}</span>
      </div>
    </div>
  );
}

/** Compact legend of every active layer, for overlaying on a map or globe. */
export function ActiveLegend({ className }: { className?: string }) {
  const manifest = useData((s) => s.layers);
  const activeLayers = useAppStore((s) => s.activeLayers);
  if (!manifest || activeLayers.length === 0) return null;
  const layers = [...activeLayers]
    .reverse()
    .flatMap((id) => manifest.layers.find((l) => l.id === id) ?? []);
  return (
    <div className={cn('panel w-52 space-y-2.5 px-3 py-2.5', className)}>
      {layers.map((l) => (
        <div key={l.id}>
          <p className="text-ink-muted mb-1 text-[11px]">{l.label}</p>
          <LegendBar layer={l} />
        </div>
      ))}
    </div>
  );
}
