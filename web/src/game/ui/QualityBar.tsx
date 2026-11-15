/** One segmented "health bar" for a site metric (0–100, higher is better). */
import type { Bar } from '../engine/bars';
import { barColor } from '../engine/bars';

export function QualityBar({ bar }: { bar: Bar }) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[10px] leading-tight tracking-wider uppercase">
        <span className="text-ink-muted">{bar.label}</span>
        <span className="text-ink font-bold tabular-nums">{bar.text}</span>
      </div>
      <div
        role="meter"
        aria-label={bar.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bar.value)}
        aria-valuetext={bar.text}
        className="relative h-3 border-2 border-black bg-navy-950"
      >
        <div
          className="h-full"
          style={{ width: `${bar.value}%`, background: barColor(bar.value) }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_9px,#000_9px_11px)] opacity-70"
        />
      </div>
    </div>
  );
}
