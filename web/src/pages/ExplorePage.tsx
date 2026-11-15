import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { LayersPanel, PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';
import { MissionTimingPanel, SiteCheckPanel } from '@/scoring';

type View = '2d' | '3d';

export default function ExplorePage() {
  const [params] = useSearchParams();
  const [view, setView] = useState<View>(params.get('view') === '3d' ? '3d' : '2d');
  const proMode = useAppStore((s) => s.proMode);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[230px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)_260px]">
      {/* Left: sites + layer switches */}
      <aside className="order-3 flex flex-col gap-4 md:order-1">
        <SiteList className="max-h-[300px]" />
        <LayersPanel />
      </aside>

      {/* Centre: map + clock */}
      <section className="order-1 flex flex-col gap-4 md:order-2">
        <div className="overflow-hidden rounded-[2px]">
          <div className="space relative p-4">
            <div
              className="absolute top-4 right-4 z-10 flex overflow-hidden rounded-[4px] border border-white/30"
              role="group"
              aria-label="Map view"
            >
              {(['2d', '3d'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2.5 py-1 text-[12px] font-medium transition-colors',
                    view === v ? 'bg-white text-black' : 'text-ink-muted hover:text-white',
                  )}
                  aria-pressed={view === v}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mx-auto aspect-square w-full max-w-[560px]">
              {view === '2d' ? <PolarMap className="size-full" /> : <GlobeView />}
            </div>
          </div>
          {proMode && (
            <p className="space text-ink-muted border-t border-white/15 px-4 py-2 text-[12px]">
              Polar stereographic view to 80°S. Diamonds are candidate sites coloured by score; dim
              = fails a hard filter. Hover the map for coordinates.
            </p>
          )}
        </div>
        <MissionTimingPanel />
        <TimeBar />
      </section>

      {/* Right: site card */}
      <aside className="order-2 flex flex-col gap-4 md:order-3 md:col-span-2 lg:col-span-1">
        <SiteDetail />
        {/* Validity for the current mission window (Javi, @/scoring; docs/10 J6–J7). */}
        <SiteCheckPanel />
      </aside>
    </div>
  );
}
