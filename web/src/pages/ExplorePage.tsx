import { useState } from 'react';
import { useAppStore } from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { LayersPanel, PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';
import { MissionTimingPanel, SiteCheckPanel } from '@/scoring';
import { SimpleSiteList } from './explore/SimpleSiteList';

type View = '2d' | '3d';

/**
 * Normal mode: a site list, the map, the clock and one site card. Expert mode adds the mission
 * requirements form, map layers, mission timing and the site check.
 */
export default function ExplorePage() {
  const [view, setView] = useState<View>('2d');
  const proMode = useAppStore((s) => s.proMode);

  return (
    <div
      className={
        proMode
          ? 'grid grid-cols-1 gap-4 md:grid-cols-[250px_minmax(0,1fr)] lg:grid-cols-[250px_minmax(0,1fr)_270px]'
          : 'grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[240px_minmax(0,1fr)_300px]'
      }
    >
      {/* Left: sites (+ layer switches in Expert) */}
      <aside
        className={
          proMode
            ? 'order-3 flex flex-col gap-4 md:order-1'
            : 'order-3 flex flex-col gap-4 md:order-3 md:col-span-2 lg:order-1 lg:col-span-1'
        }
      >
        {proMode ? (
          <>
            <SiteList />
            <LayersPanel />
          </>
        ) : (
          <SimpleSiteList />
        )}
      </aside>

      {/* Centre: map + clock */}
      <section className="order-1 flex min-w-0 flex-col gap-4 md:order-2">
        <div className="box overflow-hidden">
          <div className="space relative p-4">
            <div className="seg absolute top-4 right-4 z-10" role="group" aria-label="Map view">
              {(['2d', '3d'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}>
                  {v}
                </button>
              ))}
            </div>
            <div className="mx-auto aspect-square w-full max-w-[560px]">
              {view === '2d' ? <PolarMap className="size-full" /> : <GlobeView />}
            </div>
          </div>
          {proMode && (
            <p className="space text-ink-muted border-edge border-t px-4 py-2 text-[12px]">
              Polar stereographic view to 80°S. Diamonds are candidate sites coloured by score; dim
              = fails a hard filter. Hover the map for coordinates.
            </p>
          )}
        </div>
        {proMode && <MissionTimingPanel />}
        <TimeBar />
      </section>

      {/* Right: site card (+ validity check in Expert) */}
      <aside className="order-2 flex flex-col gap-4 md:order-3 lg:col-span-1">
        <SiteDetail />
        {/* Validity for the current mission window (Javi, @/scoring; docs/10 J6–J7). */}
        {proMode && <SiteCheckPanel />}
      </aside>
    </div>
  );
}
