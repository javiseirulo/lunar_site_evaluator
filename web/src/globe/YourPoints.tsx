/**
 * "Your points" section of the site lists (Normal and Expert): the user's custom pins as extra,
 * selectable entries below the catalogue. Hidden when there are none.
 */
import { X } from 'lucide-react';
import { formatLatLon, useAppStore } from '@/core';
import { cn } from '@/lib/utils';
import { useCustomPins } from './customPins';
import { buildPointRows, removeCustomPin, selectCustomPin } from './pointList';

export function YourPoints() {
  const pins = useCustomPins((s) => s.pins);
  const point = useAppStore((s) => s.selectedPoint);
  const siteId = useAppStore((s) => s.selectedSiteId);
  const setSelectedPoint = useAppStore((s) => s.setSelectedPoint);
  if (pins.length === 0) return null;
  const rows = buildPointRows(pins, point, siteId);

  return (
    <div className="border-edge border-t pt-2 pb-2" aria-labelledby="your-points-heading">
      <h3
        id="your-points-heading"
        className="text-ink-muted px-5 pb-1 font-mono text-[12px] tracking-[0.12em] uppercase"
      >
        Your points
      </h3>
      <ul className="px-2">
        {rows.map((r) => {
          const pin = pins.find((p) => p.id === r.id)!;
          return (
            <li key={r.id} className="flex items-stretch">
              <button
                type="button"
                aria-pressed={r.selected}
                onClick={() => (r.selected ? setSelectedPoint(null) : selectCustomPin(pin))}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 px-3 py-[7px] text-left text-[14px]',
                  r.selected ? 'bg-warn text-black' : 'hover:bg-panel-2',
                )}
              >
                <span
                  className={cn(
                    'size-2 shrink-0 border',
                    r.selected ? 'border-black' : 'border-ink-muted',
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{r.name}</span>
                  <span
                    className={cn(
                      'num block text-[11px]',
                      r.selected ? 'text-black/70' : 'text-ink-muted',
                    )}
                  >
                    {formatLatLon(r.lat, r.lon)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${r.name}`}
                title={`Remove ${r.name}`}
                onClick={() => removeCustomPin(pin)}
                className="text-ink-muted hover:bg-panel-2 hover:text-ink flex w-7 shrink-0 items-center justify-center"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
