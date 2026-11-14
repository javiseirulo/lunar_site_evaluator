/**
 * PLACEHOLDER — owner: Cristóbal (src/game). Replace with the mission engine + UI.
 *
 * Read: selectedSiteId, sites (useData), currentTimeUTC. Write: selectSite, setTime.
 * Missions can live in src/game/missions.json with conditions over Site.metrics.
 */
import { Rocket } from 'lucide-react';
import { useSelectedSite } from '@/core';

export function GamePanel() {
  const site = useSelectedSite();
  return (
    <div className="border-line-strong text-ink-faint flex size-full flex-col items-center justify-center gap-3 rounded-[var(--radius-panel)] border border-dashed p-6 text-center">
      <Rocket className="size-8" aria-hidden />
      <p className="text-ink-muted text-sm">Mission mode goes here</p>
      <p className="font-mono text-[11px]">src/game · Cristóbal</p>
      <p className="text-xs">Selected site: {site ? site.name : 'none'}</p>
    </div>
  );
}
