/**
 * Sunlight, Earth and mission verdict of any point — owner: Marta (src/globe). v3 of docs/10 §5.
 * Shown in the globe card for a clicked point and for the user's own pins. All numbers come from
 * `usePointStats` (Javi's @/ephem + the same evaluation as the candidate list).
 */
import type { ReactNode } from 'react';
import { meanPowerW, meetsText, activeChecks } from './missionStats';
import {
  FLAT_HORIZON_TEXT,
  NO_ELEVATION_TEXT,
  fmtHours,
  fmtPct,
  usePointStats,
  type PointReady,
} from './pointStats';
import { useRequirements } from './requirementsStore';

const yesNo = (v: boolean | null) => (v === null ? '—' : v ? 'Yes' : 'No');

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="num text-right">{children}</dd>
    </>
  );
}

function changeText(sunlit: boolean, h: number | null): string {
  if (h === null) return sunlit ? 'No sunset in 30 days' : 'No sunrise in 30 days';
  return `${sunlit ? 'Sunset' : 'Sunrise'} in ${fmtHours(h)}`;
}

export function PointStatsView({ point }: { point: { lat: number; lon: number } }) {
  const state = usePointStats(point);
  const req = useRequirements((s) => s.req);

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-ink-faint text-[12px]">
        Computing sunlight and Earth visibility…
      </p>
    );
  }
  if (state.status === 'no_ephemeris') {
    return (
      <p role="status" className="text-warn text-[12px]">
        {state.message}. Sunlight and Earth data cover 2026–2055.
      </p>
    );
  }
  if (state.status === 'error') {
    return (
      <p role="alert" className="text-bad text-[12px]">
        Could not compute this point: {state.message}
      </p>
    );
  }
  return <Ready s={state} loadW={req.loadW} panelW={req.panelW} />;
}

function Ready({ s, loadW, panelW }: { s: PointReady; loadW?: number; panelW?: number }) {
  const { now, windowStats: w, evaluation: e } = s;
  const energy = activeChecks({ loadW, panelW }).includes('energy');
  const meanW =
    w.sunlitFraction != null && panelW !== undefined ? meanPowerW(panelW, w.sunlitFraction) : null;
  return (
    <div className="flex flex-col gap-2 text-[12px]">
      <section aria-label="Now">
        <p className="text-heading font-medium">Now (Mission Clock)</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
          <Row label="Sun elevation">{now.sunElevationDeg.toFixed(1)}°</Row>
          <Row label="Sunlight">{yesNo(now.sunlit)}</Row>
          <Row label="Earth visible">{yesNo(now.earthVisible)}</Row>
          <Row label="Next change">{changeText(now.sunlit, now.hoursToNextChange)}</Row>
        </dl>
      </section>

      <section aria-label="Mission window" className="border-edge border-t pt-2">
        <p className="text-heading font-medium">In your mission window</p>
        {w.samples === 0 ? (
          <p className="text-ink-faint">No data in this window.</p>
        ) : (
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
            <Row label="Sunlight">{fmtPct(w.sunlitFraction)}</Row>
            <Row label="Longest night">{fmtHours(w.longestNightH)}</Row>
            <Row label="Longest Earth gap">{fmtHours(w.longestCommGapH)}</Row>
            {energy && meanW !== null && loadW !== undefined && (
              <Row label="Mean power vs load">
                <span className={meanW >= loadW ? 'text-good' : 'text-bad'}>
                  {Math.round(meanW)} W {meanW >= loadW ? '≥' : '<'} {Math.round(loadW)} W
                </span>
              </Row>
            )}
          </dl>
        )}
      </section>

      {e.checks.length > 0 && (
        <section aria-label="Requirements" className="border-edge border-t pt-2">
          <p className="text-heading font-medium">{meetsText(e)}</p>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {e.checks.map((c) => (
              <li
                key={c.id}
                className={
                  c.status === 'pass'
                    ? 'text-good'
                    : c.status === 'fail'
                      ? 'text-bad'
                      : 'text-ink-faint'
                }
              >
                {c.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-edge text-ink-faint flex flex-col gap-0.5 border-t pt-2 text-[11px]">
        {s.flatHorizon && <p>{FLAT_HORIZON_TEXT}</p>}
        {!s.elevation.available && <p>{NO_ELEVATION_TEXT}</p>}
        {s.catalogSite && <p>Catalogue site: {s.catalogSite.name}</p>}
      </div>
    </div>
  );
}
