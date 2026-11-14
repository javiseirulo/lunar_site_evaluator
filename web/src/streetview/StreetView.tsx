/**
 * PLACEHOLDER — owner: Pablo (src/streetview). Replace with the first-person horizon view.
 *
 * Read: selectedSiteId, currentTimeUTC (the shared TimeBar drives it).
 * Data: `useTimeseries(siteId)` + `sampleAt(ts, currentTimeUTC)` give sun/earth az/el.
 * This stub only prints those numbers to prove the contract end to end.
 */
import { Mountain } from 'lucide-react';
import { formatUtc, sampleAt, useAppStore, useSelectedSite, useTimeseries } from '@/core';

export function StreetView() {
  const site = useSelectedSite();
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const ts = useTimeseries(site?.id);
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;

  return (
    <div className="border-line-strong text-ink-faint flex size-full flex-col items-center justify-center gap-4 rounded-[var(--radius-panel)] border border-dashed p-6 text-center">
      <Mountain className="size-8" aria-hidden />
      <div>
        <p className="text-ink-muted text-sm">Street View goes here</p>
        <p className="font-mono text-[11px]">src/streetview · Pablo</p>
      </div>
      {site && sample && (
        <table className="num text-ink-muted text-left text-xs">
          <caption className="text-ink mb-2 text-sm">
            {site.name} · {formatUtc(sample.t_utc)}
          </caption>
          <tbody>
            <tr>
              <th className="text-sun pr-4 font-normal">Sun</th>
              <td className="pr-4">az {sample.sun_az.toFixed(1)}°</td>
              <td className="pr-4">el {sample.sun_el.toFixed(2)}°</td>
              <td>{sample.lit ? 'above terrain' : 'hidden'}</td>
            </tr>
            <tr>
              <th className="text-earth pr-4 font-normal">Earth</th>
              <td className="pr-4">az {sample.earth_az.toFixed(1)}°</td>
              <td className="pr-4">el {sample.earth_el.toFixed(2)}°</td>
              <td>
                {sample.earthVisible === null
                  ? '—'
                  : sample.earthVisible
                    ? 'above terrain'
                    : 'hidden'}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
