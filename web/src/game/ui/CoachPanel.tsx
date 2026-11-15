/** "How to get 3 stars" panel on 1-2 star wins: weakest criteria and a longer-mission projection. */
import { useMemo } from 'react';
import type { Site, Timeseries } from '@lunar/contracts';
import { coachWin } from '../engine/coaching';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import type { Verdict } from '../engine/simulate';

export function CoachPanel({
  site,
  ts,
  startIndex,
  verdict,
}: {
  site: Site | undefined;
  ts: Timeseries | null;
  startIndex: number;
  verdict: Verdict;
}) {
  const coaching = useMemo(
    () => (site && ts ? coachWin(site, ts, startIndex, verdict, DEFAULT_REQUIREMENTS) : null),
    [site, ts, startIndex, verdict],
  );
  if (!coaching) return null;
  const weak = coaching.weakest.map((w) => w.text);
  return (
    <div className="border-warn border-2 bg-black/50 p-2 text-[12px] text-ink">
      <p className="text-warn font-mono font-bold uppercase">How to get ★★★</p>
      {weak.length > 0 && <p className="mt-1">{weak.join(' · ')}.</p>}
      {coaching.projection && <p className="mt-1">{coaching.projection.text}</p>}
    </div>
  );
}
