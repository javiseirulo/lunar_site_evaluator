import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TimeBar } from '@/core/shell/TimeBar';
import { LayersPanel, PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';

type View = '2d' | '3d';

export default function ExplorePage() {
  const [view, setView] = useState<View>('2d');

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[236px_minmax(0,1fr)] lg:grid-cols-[236px_minmax(0,1fr)_252px]">
      {/* Left: sites + layers */}
      <aside className="order-3 flex flex-col gap-2 md:order-1">
        <SiteList className="max-h-[330px]" />
        <LayersPanel />
      </aside>

      {/* Centre: map + clock */}
      <section className="order-1 flex flex-col gap-2 md:order-2">
        <div className="box">
          <div className="box-head">
            South Polar Map
            <span className="ml-auto flex gap-px" role="group" aria-label="Map view">
              {(['2d', '3d'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'border px-1.5 text-[10px] leading-[14px]',
                    view === v
                      ? 'border-white bg-white text-black'
                      : 'border-white/50 text-white hover:border-white',
                  )}
                  aria-pressed={view === v}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </span>
          </div>
          <div className="bg-black p-2">
            <div className="mx-auto aspect-square w-full max-w-[470px]">
              {view === '2d' ? <PolarMap className="size-full" /> : <GlobeView />}
            </div>
          </div>
          <p className="text-ink-faint border-edge border-t px-2 py-1 text-[10px]">
            Polar stereographic view to 80°S. Diamonds are candidate sites, coloured by score; dim =
            fails a hard filter. Hover the map for coordinates.
          </p>
        </div>
        <TimeBar />
      </section>

      {/* Right: detail */}
      <aside className="order-2 md:order-3 md:col-span-2 lg:col-span-1">
        <SiteDetail />
      </aside>
    </div>
  );
}
