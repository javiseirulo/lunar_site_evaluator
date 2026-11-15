/**
 * One segmented "health bar" for a site metric (0–100, higher is better). The hint is the
 * tooltip; `showValue` prints the exact number (Expert); `highlight` marks the bar that decided
 * a verdict; a pass/fail tick shows where the card alone decides a hard limit (slope).
 */
import { clsx } from 'clsx';
import type { Bar } from '../engine/bars';
import { barColor } from '../engine/bars';

interface QualityBarProps {
  bar: Bar;
  showValue: boolean;
  highlight?: boolean;
}

export function QualityBar({ bar, showValue, highlight = false }: QualityBarProps) {
  return (
    <div
      title={bar.hint}
      className={clsx(highlight && 'outline-bad bg-[#3a0606] outline-2 outline-offset-2')}
    >
      <div className="flex items-baseline justify-between gap-1 font-mono text-[10px] leading-tight tracking-wider uppercase">
        <span className={highlight ? 'text-bad font-bold' : 'text-ink-muted'}>{bar.label}</span>
        <span className="text-ink flex items-baseline gap-1 font-bold tabular-nums">
          {showValue && bar.text}
          {bar.pass !== null && (
            <span
              aria-hidden
              className={bar.pass ? 'text-good' : 'text-bad'}
              title={bar.pass ? 'Within the limit' : 'Over the limit'}
            >
              {bar.pass ? '✓' : '✗'}
            </span>
          )}
        </span>
      </div>
      <div
        role="meter"
        aria-label={bar.label}
        aria-description={bar.hint}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bar.value)}
        aria-valuetext={
          bar.pass === null ? bar.text : `${bar.text}, ${bar.pass ? 'within' : 'over'} the limit`
        }
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
