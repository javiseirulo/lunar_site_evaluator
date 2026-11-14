/**
 * STARTER — owner: Marta (src/globe). A ranked list + site card so the other modes can be tested
 * end to end. Marta replaces/extends it with filters and weight sliders.
 * Wording/metrics come from METRICS in @/core (short names by default, technical in Pro mode).
 */
import { cn } from '@/lib/utils';
import { METRICS, formatLatLon, useAppStore, useData, useSelectedSite } from '@/core';
import { ScoreBox, scoreColor } from '@/layers';

export function SiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  if (!sites) return null;
  const ranked = [...sites].sort((a, b) => Number(b.valid) - Number(a.valid) || b.score - a.score);

  return (
    <section className={cn('box flex min-h-0 flex-col', className)} aria-labelledby="sites-heading">
      <h2 id="sites-heading" className="box-head text-[18px]">
        Landing Sites
      </h2>
      <div className="text-ink-faint grid grid-cols-[36px_1fr_44px] px-4 pt-2 pb-1 text-[12px]">
        <span>Rank</span>
        <span>Site name</span>
        <span className="text-right">Score</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {ranked.map((s, i) => {
          const selected = s.id === selectedSiteId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => selectSite(s.id)}
                aria-pressed={selected}
                className={cn(
                  'grid w-full grid-cols-[36px_1fr_44px] items-center rounded-[6px] border px-2 py-1.5 text-left text-[14px] transition-colors duration-150',
                  selected
                    ? 'border-pink/80 bg-[#2a1240] shadow-[0_0_12px_-4px_#ff3fa4]'
                    : 'hover:bg-panel-2 border-transparent',
                  !s.valid && !selected && 'opacity-55',
                )}
              >
                <span className="num font-bold" style={{ color: scoreColor(s.score) }}>
                  {i + 1}
                </span>
                <span className="text-heading truncate">{s.name}</span>
                <span className="num text-ink text-right">{Math.round(s.score * 100)}</span>
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
        <h2 className="text-heading text-[18px] font-extrabold">Start here</h2>
        <ol className="mt-3 space-y-3">
          {[
            ['Pick a spot', 'Click a diamond on the Moon or a name in the list.'],
            ['Press Play', 'Watch the days pass. When does it get dark?'],
            ['Compare', 'Put two or three spots side by side.'],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="bg-pink flex size-7 shrink-0 items-center justify-center rounded-full text-[14px] font-black text-white shadow-[0_0_12px_-2px_#ff3fa4]">
                {i + 1}
              </span>
              <span>
                <b className="text-heading block">{title}</b>
                <span className="text-ink-muted text-[13px]">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      className={cn('box animate-enter p-5', className)}
      key={site.id}
      aria-label={`${site.name} details`}
    >
      <h2 className="text-heading text-center text-[20px] font-black">{site.name}</h2>
      {proMode && (
        <p className="text-ink-faint num mt-0.5 text-center text-[12px]">
          {formatLatLon(site.lat, site.lon)} · {site.elev_m.toLocaleString('en')} m
        </p>
      )}
      <div className="mt-3 flex justify-center">
        <ScoreBox score={site.score} size="lg" />
      </div>

      <ul className="mt-5 space-y-4">
        {METRICS.map((m) => {
          const good = m.goodness(site.metrics);
          return (
            <li key={m.key} className="flex items-center gap-3" title={m.help}>
              <m.Icon
                className={cn('size-7 shrink-0', m.tone)}
                style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
                strokeWidth={1.7}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-[14px]">
                  <span className="text-heading">{proMode ? m.proLabel : m.label}</span>
                  <span className={cn('num font-bold', m.tone)}>
                    {m.format(site.metrics, proMode)}
                  </span>
                </div>
                {good !== null && (
                  <div className="meter mt-1.5">
                    <span
                      style={{
                        width: `${Math.round(good * 100)}%`,
                        background: m.bar,
                        boxShadow: `0 0 8px ${m.bar}`,
                      }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setMode('streetview')}
        className="btn btn-go mt-6 h-[40px] w-full text-[15px]"
      >
        Street View →
      </button>
    </section>
  );
}
