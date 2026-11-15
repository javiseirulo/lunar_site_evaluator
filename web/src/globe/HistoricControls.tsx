/**
 * "Past landings" layer state and legend, used by the Layers menu — owner: Marta (src/globe).
 * Local layer (not a raster layer). Off by default.
 */
import type { HistoricOutcome } from '@lunar/contracts';
import {
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  historicSummary,
  loadHistoricSites,
  summaryText,
  useHistoric,
} from './historicSites';

const ORDER: HistoricOutcome[] = ['success', 'partial', 'failed'];

/** Switch state and handler for the Layers menu row (a failed load turns the switch into a retry). */
export function useHistoricSwitch() {
  const status = useHistoric((s) => s.status);
  const visible = useHistoric((s) => s.visible);
  const setVisible = useHistoric((s) => s.setVisible);
  const unavailable = status === 'error';
  return {
    status,
    unavailable,
    on: visible && !unavailable,
    busy: status === 'idle' || status === 'loading',
    toggle: () => {
      // After a failed load the switch retries instead of staying dead (e.g. slow network in a demo).
      if (unavailable) void loadHistoricSites().then(() => setVisible(true));
      else setVisible(!visible);
    },
  };
}

/** Marker colours and counts, shown inside the Layers menu while the layer is on. */
export function HistoricDetails() {
  const status = useHistoric((s) => s.status);
  const sites = useHistoric((s) => s.sites);
  const summary = historicSummary(sites);
  if (status !== 'ready') return null;
  return (
    <div className="mt-1 flex flex-col gap-1 pb-1 text-[12px]">
      <ul className="flex flex-col gap-0.5" aria-label="Marker colours">
        {ORDER.map((o) => (
          <li key={o} className="flex items-center gap-2">
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <path
                d="M5 0.6 L9.4 9.4 L0.6 9.4 Z"
                fill={OUTCOME_COLORS[o]}
                stroke="#2c2822"
                strokeWidth="0.8"
              />
            </svg>
            {OUTCOME_LABELS[o]}
            <span className="num text-ink-muted ml-auto">{summary.byOutcome[o]}</span>
          </li>
        ))}
      </ul>
      <p className="text-heading num mt-1 font-medium" aria-live="polite">
        {summaryText(summary)}
      </p>
    </div>
  );
}
