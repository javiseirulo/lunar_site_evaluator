import { Component, useState, type ReactNode } from 'react';
import { useAppStore } from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { SimChart } from '@/core/shell/SimChart';
import { PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';
import { useHistoric } from '@/globe/historicSites';
import { useChromeSlot } from '@/globe/chromeSlot';
import { LandingDate, MissionTimingPanel, SiteCheckPanel } from '@/scoring';
import { SimpleSiteList } from './explore/SimpleSiteList';
import { EndSimulationDialog } from './explore/EndSimulationDialog';

/**
 * Normal mode: a site list, the 3D Moon globe, the clock and one site card. Expert mode adds the mission
 * requirements form, layers, mission timing and the site check.
 */
/** True when the browser can create a WebGL context (the 3D globe needs one). */
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
const WEBGL = typeof document !== 'undefined' && hasWebGL();

/** If the 3D globe throws (WebGL context refused), show the fallback instead of a broken page. */
class GlobeBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Normal mode, once a site is chosen and before Simulate: one line under the site card. */
function SimulateHint() {
  return (
    <section className="border-edge-hi border-t-2 px-5 py-3" aria-label="Site check">
      <h2 className="font-mono text-[13px] font-bold tracking-[0.12em] text-heading uppercase">
        Does it work for the mission?
      </h2>
      <p className="text-ink-faint mt-1 text-[13px]">
        Press Simulate to check if it works for the mission
      </p>
    </section>
  );
}

const FRAME = 'border-edge-hi border-2 bg-panel shadow-[4px_4px_0_#000]';
const FLAT = 'border-0 bg-transparent shadow-none';

type LeftTab = 'needs' | 'window' | 'sites';
type RightTab = 'now' | 'sun' | 'check';

function Pages<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className="border-edge-hi sticky top-0 z-10 flex shrink-0 border-b-2 bg-panel"
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={
            value === option.id
              ? 'bg-warn h-8 flex-1 font-mono text-[10px] font-bold tracking-[0.08em] text-black uppercase'
              : 'h-8 flex-1 font-mono text-[10px] font-bold tracking-[0.08em] text-[#9fb2d0] uppercase hover:text-white'
          }
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LeftPanel() {
  const proMode = useAppStore((s) => s.proMode);
  const [tab, setTab] = useState<LeftTab>(proMode ? 'needs' : 'sites');
  const shown: LeftTab = !proMode && (tab === 'needs' || tab === 'window') ? 'sites' : tab;

  const options: { id: LeftTab; label: string }[] = proMode
    ? [
        { id: 'needs', label: 'Needs' },
        { id: 'window', label: 'Window' },
        { id: 'sites', label: 'Sites' },
      ]
    : [{ id: 'sites', label: 'Sites' }];

  return (
    <aside
      className={`${FRAME} pointer-events-auto flex max-h-full min-h-0 w-full flex-col self-start overflow-y-auto`}
    >
      <Pages options={options} value={shown} onChange={setTab} />
      <div>
        {shown === 'needs' && <SiteList part="requirements" className={FLAT} />}
        {shown === 'window' && <MissionTimingPanel className={FLAT} />}
        {shown === 'sites' &&
          (proMode ? (
            <SiteList part="sites" className={FLAT} />
          ) : (
            <SimpleSiteList className={FLAT} />
          ))}
      </div>
    </aside>
  );
}

function RightPanel() {
  const proMode = useAppStore((s) => s.proMode);
  const simulationStarted = useAppStore((s) => s.simulationStarted);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectedPoint = useAppStore((s) => s.selectedPoint);
  const hasSubject = Boolean(selectedSiteId || selectedPoint);
  const landingId = useHistoric((s) => s.focusedId);
  const selectionKey =
    landingId ??
    selectedSiteId ??
    (selectedPoint ? `${selectedPoint.lat},${selectedPoint.lon}` : '');
  const [tab, setTab] = useState<RightTab>('now');
  const [seenSelection, setSeenSelection] = useState(selectionKey);
  if (seenSelection !== selectionKey) {
    setSeenSelection(selectionKey);
    if (selectionKey) setTab('now');
  }

  const options: { id: RightTab; label: string }[] = [
    { id: 'now', label: 'Now' },
    ...(hasSubject ? [{ id: 'sun' as const, label: 'Sun' }] : []),
    ...(hasSubject
      ? [{ id: 'check' as const, label: proMode || simulationStarted ? 'Check' : 'Mission' }]
      : []),
  ];
  const shown: RightTab = options.some((o) => o.id === tab) ? tab : 'now';

  return (
    <aside
      className={`${FRAME} pointer-events-auto flex max-h-full min-h-0 w-full flex-col self-start overflow-y-auto md:col-start-3`}
    >
      <Pages options={options} value={shown} onChange={setTab} />
      <div>
        {shown === 'now' && <SiteDetail className={FLAT} />}
        {shown === 'sun' && <SimChart className={FLAT} />}
        {shown === 'check' &&
          hasSubject &&
          (proMode || simulationStarted ? (
            <SiteCheckPanel simple={!proMode} className={`${FLAT} h-full`} />
          ) : (
            <SimulateHint />
          ))}
      </div>
    </aside>
  );
}

export default function ExplorePage() {
  const proMode = useAppStore((s) => s.proMode);
  const setChromeSlot = useChromeSlot((s) => s.setSlot);

  return (
    // The page scrolls: a tall 3D map first, the Mission Clock below it.
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <EndSimulationDialog />
      <div className="border-edge-hi relative h-[calc(100dvh-8.5rem)] min-h-[26rem] shrink-0 overflow-hidden border-2 bg-black">
        <div className="absolute inset-0">
          {WEBGL ? (
            <GlobeBoundary fallback={<PolarMap className="size-full" neutral={!proMode} />}>
              <GlobeView />
            </GlobeBoundary>
          ) : (
            <PolarMap className="size-full" neutral={!proMode} />
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 grid grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 p-3 md:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(210px,22%)]">
          <LeftPanel />
          {/* Free map area between the panels: the globe puts its coordinate, Layers and astronaut controls here. */}
          <div
            ref={setChromeSlot}
            className="pointer-events-none absolute inset-0 md:relative md:inset-auto md:col-start-2 md:row-start-1"
          />
          <RightPanel />
        </div>
      </div>

      {/* Mission Clock below the 3D view (not over the Moon), under the free map column. */}
      <div className="mt-2 grid shrink-0 grid-cols-1 gap-3 px-3 pb-3 md:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(210px,22%)]">
        <div className="flex flex-col gap-2 md:col-start-2">
          {!proMode && <LandingDate />}
          <TimeBar />
        </div>
      </div>
    </div>
  );
}
