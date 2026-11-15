import { Component, useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { SimChart } from '@/core/shell/SimChart';
import { PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';
import { LayersMenu } from '@/globe/LayersMenu';
import { PatchControls } from '@/globe/PatchControls';
import { PinForm } from '@/globe/PinForm';
import { submitExplorePin } from '@/globe/exploreBridge';
import { MissionTimingPanel, SiteCheckPanel } from '@/scoring';
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

type LeftTab = 'needs' | 'window' | 'sites' | 'map';
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
    <div className="border-edge-hi flex shrink-0 border-b-2" role="tablist">
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

function MapPage() {
  const proMode = useAppStore((s) => s.proMode);
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden px-2 py-2">
      <PinForm
        embedded
        title={proMode ? 'Pin by coordinates' : 'Go to coordinates'}
        submitLabel={proMode ? 'Add pin' : 'Go there'}
        onAdd={submitExplorePin}
      />
      <div className="border-edge-hi min-h-0 flex-1 overflow-y-auto border-t-2 pt-2">
        <LayersMenu embedded hasSun expert={proMode} />
      </div>
      <PatchControls />
    </div>
  );
}

function LeftPanel() {
  const proMode = useAppStore((s) => s.proMode);
  const [tab, setTab] = useState<LeftTab>(proMode ? 'needs' : 'sites');
  useEffect(() => {
    if (!proMode && (tab === 'needs' || tab === 'window')) setTab('sites');
  }, [proMode, tab]);

  const options: { id: LeftTab; label: string }[] = proMode
    ? [
        { id: 'needs', label: 'Needs' },
        { id: 'window', label: 'Window' },
        { id: 'sites', label: 'Sites' },
        { id: 'map', label: 'Map' },
      ]
    : [
        { id: 'sites', label: 'Sites' },
        { id: 'map', label: 'Map' },
      ];

  return (
    <aside className={`${FRAME} pointer-events-auto flex max-h-[62%] min-h-0 w-full flex-col self-start overflow-hidden`}>
      <Pages options={options} value={tab} onChange={setTab} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'needs' && (
          <SiteList part="requirements" className={`${FLAT} h-full overflow-y-auto`} />
        )}
        {tab === 'window' && (
          <div className="h-full overflow-y-auto">
            <MissionTimingPanel className={FLAT} />
          </div>
        )}
        {tab === 'sites' &&
          (proMode ? (
            <SiteList part="sites" className={`${FLAT} h-full`} />
          ) : (
            <SimpleSiteList className={`${FLAT} h-full`} />
          ))}
        {tab === 'map' && <MapPage />}
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
  const [tab, setTab] = useState<RightTab>('now');
  useEffect(() => {
    if (!hasSubject && tab !== 'now') setTab('now');
  }, [hasSubject, tab]);

  const options: { id: RightTab; label: string }[] = [
    { id: 'now', label: 'Now' },
    ...(hasSubject ? [{ id: 'sun' as const, label: 'Sun' }] : []),
    ...(hasSubject
      ? [{ id: 'check' as const, label: proMode || simulationStarted ? 'Check' : 'Mission' }]
      : []),
  ];

  return (
    <aside
      className={`${FRAME} pointer-events-auto flex max-h-[62%] min-h-0 w-full flex-col self-start overflow-hidden md:col-start-3`}
    >
      <Pages
        options={options}
        value={options.some((o) => o.id === tab) ? tab : 'now'}
        onChange={setTab}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'now' && <SiteDetail className={`${FLAT} h-full`} />}
        {tab === 'sun' && hasSubject && <SimChart className={`${FLAT} h-full`} />}
        {tab === 'check' &&
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

  return (
    <>
      <EndSimulationDialog />
      <div className="border-edge-hi relative min-h-0 flex-1 overflow-hidden border-2 bg-black">
        <div className="absolute inset-0">
          {WEBGL ? (
            <GlobeBoundary fallback={<PolarMap className="size-full" neutral={!proMode} />}>
              <GlobeView hideChrome />
            </GlobeBoundary>
          ) : (
            <PolarMap className="size-full" neutral={!proMode} />
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 grid grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 p-3 md:grid-cols-[minmax(200px,20%)_minmax(0,1fr)_minmax(210px,22%)]">
          <LeftPanel />
          <RightPanel />
          <div className="pointer-events-auto self-end md:col-start-2 md:row-start-2">
            <TimeBar />
          </div>
        </div>
      </div>
    </>
  );
}
