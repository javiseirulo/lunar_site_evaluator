/**
 * STARTER — owner: Marta (src/globe). A ranked list + site sheet so the other modes can be tested
 * end to end. Marta replaces/extends it with filters and weight sliders.
 * Wording/metrics come from METRICS in @/core (short names by default, technical in Pro mode).
 */
import { cn } from '@/lib/utils';
import { METRICS, formatLatLon, useAppStore, useData, useSelectedSite } from '@/core';
import { scoreColor } from '@/layers';

export function SiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  if (!sites) return null;
  const ranked = [...sites].sort((a, b) => Number(b.valid) - Number(a.valid) || b.score - a.score);

  return (
    <section className={cn('box flex min-h-0 flex-col', className)} aria-labelledby="sites-heading">
      <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
        <h2 id="sites-heading" className="text-[18px]">
          Sites
        </h2>
        <span className="text-ink-faint text-[12px]">score out of 100</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {ranked.map((s, i) => {
          const selected = s.id === selectedSiteId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => selectSite(s.id)}
                aria-pressed={selected}
                className={cn(
                  'grid w-full grid-cols-[22px_1fr_auto] items-baseline rounded-[4px] px-3 py-[7px] text-left text-[14px] transition-colors duration-100',
                  selected ? 'bg-violet text-white' : 'hover:bg-panel-2',
                  !s.valid && !selected && 'text-ink-faint',
                )}
              >
                <span
                  className={cn('num text-[12px]', selected ? 'text-white/70' : 'text-ink-faint')}
                >
                  {i + 1}
                </span>
                <span className="truncate">{s.name}</span>
                <span className="num font-medium">{Math.round(s.score * 100)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function SiteDetail({ className }: { className?: string }) {
  const site = useSelectedSite();
  const setMode = useAppStore((s) => s.setMode);
  const proMode = useAppStore((s) => s.proMode);

  if (!site) {
    return (
      <section className={cn('box p-5', className)}>
        <h2 className="text-[18px]">No site selected</h2>
        <ol className="text-ink mt-3 list-decimal space-y-2 pl-5 text-[14px]">
          <li>Click a diamond on the map, or a name in the list.</li>
          <li>Press Play and watch when the site gets sunlight and sees Earth.</li>
          <li>Open Compare to put two or three sites side by side.</li>
        </ol>
      </section>
    );
  }

  return (
    <section className={cn('box p-5', className)} aria-label={`${site.name} details`}>
      <h2 className="text-[24px] leading-tight">{site.name}</h2>
      {proMode && (
        <p className="text-ink-faint num mt-1 text-[12px]">
          {formatLatLon(site.lat, site.lon)}, {site.elev_m.toLocaleString('en')} m
        </p>
      )}
      <p className="num mt-3 leading-none">
        <span
          className="mr-2 inline-block size-3 align-middle"
          style={{ background: scoreColor(site.score) }}
          aria-hidden
        />
        <span className="text-heading text-[48px] font-medium">{Math.round(site.score * 100)}</span>
        <span className="text-ink-faint text-[14px]"> / 100</span>
      </p>
      {!site.valid && (
        <p className="text-bad mt-2 text-[13px]">
          Fails a safety rule:{' '}
          {site.metrics.slope_deg > 15 ? 'too steep to land.' : 'too little sunlight.'}
        </p>
      )}

      <ul className="rows border-edge mt-4 border-t">
        {METRICS.map((m) => {
          const good = m.goodness(site.metrics);
          return (
            <li key={m.key} className="py-2.5" title={m.help}>
              <div className="flex items-center gap-2 text-[14px]">
                <m.Icon className="text-ink-faint size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                <span className="text-ink">{proMode ? m.proLabel : m.label}</span>
                <span className="num text-heading ml-auto font-medium">
                  {m.format(site.metrics, proMode)}
                </span>
              </div>
              {good !== null && (
                <div className="meter mt-2 ml-6">
                  <span style={{ width: `${Math.round(good * 100)}%`, background: m.bar }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={() => setMode('streetview')} className="btn mt-5 w-full">
        Stand here in Street View
      </button>
    </section>
  );
}
