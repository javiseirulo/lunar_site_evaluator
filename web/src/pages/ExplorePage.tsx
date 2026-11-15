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

export default function ExplorePage() {
  const proMode = useAppStore((s) => s.proMode);
  const simulationStarted = useAppStore((s) => s.simulationStarted);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectedPoint = useAppStore((s) => s.selectedPoint);
  const hasSubject = Boolean(selectedSiteId || selectedPoint);

  return (
    <>
      <EndSimulationDialog />
      <div className="border-edge-hi relative min-h-0 flex-1 overflow-hidden border-2 bg-black">
        <div className="absolute inset-0">
          {WEBGL ? (
            <GlobeBoundary fallback={<PolarMap className="size-full" neutral={!proMode} />}>
              <GlobeView />
            </GlobeBoundary>
          ) : (
            <PolarMap className="size-full" neutral={!proMode} />
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 grid grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 p-3 md:grid-cols-[minmax(220px,22%)_minmax(0,1fr)_minmax(240px,24%)]">
          <aside
            className={`${FRAME} pointer-events-auto mt-12 flex min-h-0 flex-col overflow-hidden`}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              {proMode ? (
                <SiteList className={`${FLAT} h-full overflow-y-auto`} />
              ) : (
                <SimpleSiteList className={`${FLAT} h-full`} />
              )}
            </div>
            {proMode && (
              <div className="border-edge-hi max-h-[42%] shrink-0 overflow-y-auto border-t-2">
                <MissionTimingPanel className={FLAT} />
              </div>
            )}
          </aside>

          <aside
            className={`${FRAME} pointer-events-auto flex max-h-full min-h-0 flex-col self-start overflow-y-auto md:col-start-3 md:row-start-1`}
          >
            <SiteDetail className={FLAT} />
            {hasSubject && (
              <div className="border-edge-hi border-t-2">
                <SimChart className={FLAT} />
              </div>
            )}
            {hasSubject &&
              (proMode || simulationStarted ? (
                <div className="border-edge-hi border-t-2">
                  <SiteCheckPanel simple={!proMode} className={FLAT} />
                </div>
              ) : (
                <SimulateHint />
              ))}
          </aside>

          <div className="pointer-events-auto md:col-start-2 md:row-start-2">
            <TimeBar />
          </div>
        </div>
      </div>
    </>
  );
}
