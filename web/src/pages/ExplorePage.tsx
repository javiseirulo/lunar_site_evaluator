import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TimeBar } from '@/core/shell/TimeBar';
import { ActiveLegend, LayersPanel, PolarMap } from '@/layers';
import { GlobeView, SiteDetail, SiteList } from '@/globe';

type View = '2d' | '3d';

export default function ExplorePage() {
  const [view, setView] = useState<View>('2d');

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto p-3 lg:content-stretch lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:overflow-hidden">
      {/* Left: sites + layers */}
      <aside className="order-3 flex flex-col gap-3 lg:order-1 lg:min-h-0">
        <SiteList className="max-h-80 lg:max-h-none lg:flex-1" />
        <LayersPanel className="shrink-0" />
      </aside>

      {/* Centre: map + time */}
      <section className="order-1 flex flex-col gap-3 lg:order-2 lg:min-h-0">
        <div className="relative flex aspect-square w-full items-center justify-center lg:aspect-auto lg:min-h-[320px] lg:flex-1">
          <div
            className="bg-space-800 border-line absolute top-0 left-0 z-10 flex rounded-lg border p-0.5"
            role="group"
            aria-label="Map view"
          >
            {(['2d', '3d'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-mono text-[11px] uppercase',
                  view === v ? 'bg-space-600 text-ink' : 'text-ink-faint hover:text-ink',
                )}
                aria-pressed={view === v}
              >
                {v}
              </button>
            ))}
          </div>
          {/* Largest square that fits the free space (container query units). */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ containerType: 'size' }}
          >
            <div style={{ width: 'min(100cqw, 100cqh)', height: 'min(100cqw, 100cqh)' }}>
              {view === '2d' ? <PolarMap className="size-full" /> : <GlobeView />}
            </div>
          </div>
          <ActiveLegend className="absolute right-0 bottom-0 hidden md:block" />
        </div>
        <TimeBar className="shrink-0" />
      </section>

      {/* Right: detail */}
      <aside className="order-2 lg:order-3 lg:min-h-0 lg:overflow-y-auto">
        <SiteDetail />
      </aside>
    </div>
  );
}
