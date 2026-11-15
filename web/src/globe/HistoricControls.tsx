/**
 * "Past landings" switch and legend over the 3D globe — owner: Marta (src/globe).
 * Local layer (not a raster layer, so not in LayersPanel). Off by default.
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
import { PAPER } from './paper';

const ORDER: HistoricOutcome[] = ['success', 'partial', 'failed'];

export function HistoricControls() {
  const status = useHistoric((s) => s.status);
  const sites = useHistoric((s) => s.sites);
  const visible = useHistoric((s) => s.visible);
  const setVisible = useHistoric((s) => s.setVisible);
  const unavailable = status === 'error';
  const summary = historicSummary(sites);

  return (
    <div className="box w-60 px-3 py-2 text-[12px]" style={PAPER}>
      <label className="text-heading flex cursor-pointer items-center gap-2 text-[13px] font-medium">
        <button
          type="button"
          role="switch"
          aria-checked={visible && !unavailable}
          disabled={status === 'idle' || status === 'loading'}
          className="switch disabled:cursor-default disabled:opacity-40"
          onClick={() => {
            // After a failed load the switch retries instead of staying dead (e.g. slow network in a demo).
            if (unavailable) void loadHistoricSites().then(() => setVisible(true));
            else setVisible(!visible);
          }}
          aria-label={unavailable ? 'Past landings unavailable: retry' : undefined}
        />
        Past landings
        {unavailable && (
          <span className="text-ink-muted ml-auto font-normal">unavailable · retry</span>
        )}
        {status === 'loading' && (
          <span className="text-ink-muted ml-auto font-normal">loading…</span>
        )}
      </label>
      {visible && status === 'ready' && (
        <div className="mt-2 flex flex-col gap-1">
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
      )}
    </div>
  );
}
