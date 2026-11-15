import { Component, useEffect, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
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

type LeftTab = 'sites';
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
  const options: { id: LeftTab; label: string }[] = [{ id: 'sites', label: 'Sites' }];

  return (
    <aside
      className={`${FRAME} pointer-events-auto flex min-h-0 w-full flex-col self-start md:max-h-full md:overflow-y-auto`}
    >
      <Pages options={options} value="sites" onChange={() => undefined} />
      <div>
        {proMode ? (
          // Booking style: requirements, window and the matching sites together, so the list
          // changes live while you edit a requirement.
          <SiteList className={FLAT} />
        ) : (
          <SimpleSiteList className={FLAT} />
        )}
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
      className={`${FRAME} pointer-events-auto flex min-h-0 w-full flex-col self-start max-md:order-first md:col-start-3 md:max-h-full md:overflow-y-auto`}
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
  // Narrow screens only: the map can fill the whole screen (panels hidden) and shrink back.
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  return (
    // The page scrolls: a tall 3D map first, the Mission Clock below it.
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <EndSimulationDialog />
      {/* Wide screens: panels float over a tall map. Narrow screens: the map comes first and the panels
          follow in the normal flow, so nothing covers the globe or its controls. */}
      <div
        className={`border-edge-hi relative shrink-0 bg-black md:h-[calc(100dvh-8.5rem)] md:border-2 md:min-h-[26rem] md:overflow-hidden ${
          full ? 'max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-hidden' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setFull((f) => !f)}
          aria-label={full ? 'Exit full screen map' : 'Full screen map'}
          aria-pressed={full}
          title={full ? 'Exit full screen' : 'Full screen'}
          className="box hover:bg-panel-2 absolute top-2 right-2 z-[70] grid size-10 place-items-center md:hidden"
        >
          {full ? (
            <Minimize2 className="size-5" aria-hidden />
          ) : (
            <Maximize2 className="size-5" aria-hidden />
          )}
        </button>
        <div
          className={`md:absolute md:inset-0 md:h-auto md:min-h-0 ${full ? 'max-md:h-full' : 'h-[55dvh] min-h-[20rem] max-md:border-edge-hi max-md:border-2'}`}
        >
          {WEBGL ? (
            <GlobeBoundary fallback={<PolarMap className="size-full" neutral={!proMode} />}>
              <GlobeView />
            </GlobeBoundary>
          ) : (
            <PolarMap className="size-full" neutral={!proMode} />
          )}
        </div>

        <div
          className={`pointer-events-none grid grid-cols-1 gap-3 p-3 max-md:p-0 max-md:pt-3 md:absolute md:inset-0 md:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(210px,22%)] md:grid-rows-[minmax(0,1fr)] ${
            full ? 'max-md:[&>aside]:hidden' : ''
          }`}
        >
          <LeftPanel />
          {/* Free map area between the panels: the globe puts its coordinate, Layers and astronaut controls here. */}
          <div
            ref={setChromeSlot}
            className={`pointer-events-none absolute md:relative md:inset-auto md:col-start-2 md:row-start-1 md:h-auto md:min-h-0 ${
              full ? 'max-md:inset-0' : 'inset-x-0 top-0 h-[55dvh] min-h-[20rem]'
            }`}
          />
          <RightPanel />
        </div>
      </div>

      {/* Mission Clock below the 3D view (not over the Moon), under the free map column. */}
      <div className="mt-2 grid shrink-0 grid-cols-1 gap-3 px-3 pb-3 md:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(210px,22%)]">
        <div className="flex flex-col gap-2 md:col-start-2">
          {!proMode && <LandingDate />}
          {proMode && <MissionTimingPanel />}
          <TimeBar />
        </div>
      </div>
    </div>
  );
}
