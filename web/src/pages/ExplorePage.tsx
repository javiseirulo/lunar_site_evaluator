import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/core';
import { TimeBar } from '@/core/shell/TimeBar';
import { LayersPanel, PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';

type View = '2d' | '3d';

export default function ExplorePage() {
  const [view, setView] = useState<View>('2d');
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
        <div className="box overflow-hidden">
          <div className="space relative p-3">
            <div
              className="absolute top-3 right-3 z-10 flex overflow-hidden border-edge-hi rounded-[3px] border"
              role="group"
              aria-label="Map view"
            >
              {(['2d', '3d'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'px-2.5 py-1 text-[12px] font-bold transition-colors',
                    view === v ? 'bg-violet text-white' : 'text-ink-muted hover:text-white',
                  )}
                  aria-pressed={view === v}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mx-auto aspect-square w-full max-w-[440px]">
              {view === '2d' ? <PolarMap className="size-full" /> : <GlobeView />}
            </div>
          </div>
          {proMode && (
            <p className="text-ink-faint border-edge border-t px-3 py-1.5 text-[11px]">
              Polar stereographic view to 80°S. Diamonds are candidate sites coloured by score; dim
              = fails a hard filter. Hover the map for coordinates.
            </p>
          )}
        </div>
        <TimeBar />
      </section>

      {/* Right: site card */}
      <aside className="order-2 md:order-3 md:col-span-2 lg:col-span-1">
        <SiteDetail />
      </aside>
    </div>
  );
}
