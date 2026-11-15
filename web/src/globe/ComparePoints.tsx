/**
 * "Compare points" — owner: Marta (src/globe). v3 of docs/10 §5.
 * One row per pin of the user, computed live with `usePointStats` (Mission Clock, mission window
 * and requirements). It grows as pins are added and disappears when there are none.
 */
import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { formatLatLon } from '@/core';
import type { CustomPin } from './customPins';
import { useCustomPins } from './customPins';
import { PAPER } from './paper';
import { fmtHours, fmtPct, usePointStats } from './pointStats';

const Mark = ({ ok, label }: { ok: boolean | null; label: string }) =>
  ok === null ? (
    <span className="text-ink-faint">—</span>
  ) : ok ? (
    <Check className="text-good mx-auto size-3.5" aria-label={`${label}: yes`} />
  ) : (
    <X className="text-bad mx-auto size-3.5" aria-label={`${label}: no`} />
  );

function PinRow({ pin, onRemove }: { pin: CustomPin; onRemove: (id: string) => void }) {
  const s = usePointStats(pin);
  const ready = s.status === 'ready' ? s : null;
  const w = ready?.windowStats;
  const e = ready?.evaluation;
  const counted = e ? e.checks.length - e.pending : 0;
  const meets = e && e.checks.length > 0 ? (e.noData ? 'no data' : `${e.passed}/${counted}`) : '—';
  const note =
    s.status === 'loading'
      ? '…'
      : s.status === 'no_ephemeris'
        ? 'no ephemeris'
        : s.status === 'error'
          ? 'error'
          : null;
  return (
    <tr className="border-edge border-t align-middle">
      <td className="max-w-[110px] truncate py-1 pr-2 font-medium" title={pin.name}>
        {pin.name}
      </td>
      <td className="num text-ink-muted py-1 pr-2 whitespace-nowrap">
        {formatLatLon(pin.lat, pin.lon)}
      </td>
      {note ? (
        <td colSpan={6} className="text-ink-faint py-1 pr-2">
          {note}
        </td>
      ) : (
        <>
          <td className="num py-1 pr-2 text-right">{fmtPct(w?.sunlitFraction)}</td>
          <td className="num py-1 pr-2 text-right">{fmtHours(w?.longestNightH)}</td>
          <td className="num py-1 pr-2 text-right">{fmtHours(w?.longestCommGapH)}</td>
          <td className="num py-1 pr-2 text-center">{meets}</td>
          <td className="py-1 pr-2 text-center">
            <Mark ok={ready ? ready.now.sunlit : null} label="Sunlit now" />
          </td>
          <td className="py-1 pr-2 text-center">
            <Mark ok={ready ? ready.now.earthVisible : null} label="Earth visible now" />
          </td>
        </>
      )}
      <td className="py-1">
        <button
          type="button"
          onClick={() => onRemove(pin.id)}
          className="border-edge hover:bg-panel-2 flex size-6 items-center justify-center rounded-[2px] border"
          aria-label={`Remove ${pin.name}`}
          title="Remove pin"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </td>
    </tr>
  );
}

export function ComparePoints({ className = '' }: { className?: string }) {
  const pins = useCustomPins((s) => s.pins);
  const removePin = useCustomPins((s) => s.removePin);
  const [open, setOpen] = useState(true);
  if (pins.length === 0) return null;
  return (
    <section
      className={`box max-w-[calc(100vw-1rem)] text-[12px] shadow-lg ${className}`}
      style={PAPER}
      aria-label="Compare points"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-heading flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] font-medium"
      >
        <span className="flex-1">Compare points ({pins.length})</span>
        {open ? (
          <ChevronDown className="size-3.5" aria-hidden />
        ) : (
          <ChevronUp className="size-3.5" aria-hidden />
        )}
      </button>
      {open && (
        <div className="max-h-[40vh] overflow-auto px-3 pb-2">
          <table className="w-full border-collapse">
            <thead className="text-ink-muted text-left text-[11px]">
              <tr>
                <th className="pr-2 font-normal">Pin</th>
                <th className="pr-2 font-normal">Position</th>
                <th className="pr-2 text-right font-normal">Sunlight</th>
                <th className="pr-2 text-right font-normal">Longest night</th>
                <th className="pr-2 text-right font-normal">Longest Earth gap</th>
                <th className="pr-2 text-center font-normal">Meets</th>
                <th className="pr-2 text-center font-normal">Sun now</th>
                <th className="pr-2 text-center font-normal">Earth now</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pins.map((p) => (
                <PinRow key={p.id} pin={p} onRemove={removePin} />
              ))}
            </tbody>
          </table>
          <p className="text-ink-faint mt-1 text-[11px]">
            Flat horizon, no terrain, at your own pins. Mission window and requirements as in the
            list.
          </p>
        </div>
      )}
    </section>
  );
}
