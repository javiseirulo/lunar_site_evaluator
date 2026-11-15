/**
 * "Past landings" layer state and legend, used by the Layers menu — owner: Marta (src/globe).
 * Local layer (not a raster layer). On when Explore opens.
 */
import { historicSummary, loadHistoricSites, summaryText, useHistoric } from './historicSites';

/** Small flat drawing of the lander marker (violet hull, gold foil, legs), for the legend. */
function LanderIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0" aria-hidden>
      <g stroke="#2c2822" strokeWidth="0.6" strokeLinejoin="round">
        <path
          d="M6 12 L3 18 M14 12 L17 18 M10 13 L10 18"
          stroke="#b8b0c9"
          strokeWidth="1"
          fill="none"
        />
        <path d="M5.5 8 H14.5 L13.5 13 H6.5 Z" fill="#c9a24a" />
        <rect x="7" y="3.5" width="6" height="4.5" rx="1.2" fill="#6e5aa8" />
        <circle cx="10" cy="5.8" r="1" fill="#d9ccff" />
      </g>
    </svg>
  );
}

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
      <div className="flex items-center gap-2">
        <LanderIcon />
        Past landing
        <span className="num text-ink-muted ml-auto">{summary.total}</span>
      </div>
      <p className="text-ink-muted text-[11px]">Lander icon: AI-assisted 3D model</p>
      <p className="text-heading num mt-1 font-medium" aria-live="polite">
        {summaryText(summary)}
      </p>
    </div>
  );
}
