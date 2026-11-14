/**
 * STARTER — owner: Marta (src/globe). A minimal ranked list + detail card so the other modes
 * can be tested end to end. Marta replaces/extends it with filters and weight sliders.
 */
import { ArrowRight, Check, X } from 'lucide-react';
import type { Site } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import {
  formatLatLon,
  pct,
  reasonIsGood,
  reasonText,
  useAppStore,
  useData,
  useSelectedSite,
} from '@/core';
import { scoreColor } from '@/layers';

export function SiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  if (!sites) return null;
  const ranked = [...sites].sort((a, b) => Number(b.valid) - Number(a.valid) || b.score - a.score);

  return (
    <section
      className={cn('panel flex min-h-0 flex-col overflow-hidden', className)}
      aria-labelledby="sites-heading"
    >
      <div className="flex items-baseline gap-2 px-4 pt-3 pb-2">
        <h2 id="sites-heading" className="text-sm font-medium">
          Candidate sites
        </h2>
        <span className="text-ink-faint font-mono text-[11px]">
          {sites.filter((s) => s.valid).length} pass
        </span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {ranked.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => selectSite(s.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors',
                s.id === selectedSiteId ? 'bg-space-700' : 'hover:bg-space-800',
                !s.valid && 'opacity-50',
              )}
            >
              <span className="num text-ink-faint w-4 text-right text-[11px]">{i + 1}</span>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: scoreColor(s.score) }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
              <span className="num text-ink-muted text-xs">{Math.round(s.score * 100)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SiteDetail({ className }: { className?: string }) {
  const site = useSelectedSite();
  const setMode = useAppStore((s) => s.setMode);
  if (!site) {
    return (
      <div className={cn('panel text-ink-muted px-4 py-3 text-sm', className)}>
        Pick a site on the map or in the list.
      </div>
    );
  }
  return (
    <section className={cn('panel px-4 py-3', className)} aria-label={`${site.name} details`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium">{site.name}</h2>
          <p className="text-ink-faint num text-[11px]">
            {formatLatLon(site.lat, site.lon)} · {site.elev_m.toLocaleString('en')} m
          </p>
        </div>
        <span
          className="num text-space-950 rounded-md px-1.5 py-0.5 text-sm font-semibold"
          style={{ background: scoreColor(site.score) }}
        >
          {Math.round(site.score * 100)}
        </span>
      </div>
      <Metrics site={site} />
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {site.reasons.map((r) => (
          <li
            key={r}
            className={cn(
              'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]',
              reasonIsGood(r) ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad',
            )}
          >
            {reasonIsGood(r) ? <Check className="size-3" /> : <X className="size-3" />}
            {reasonText(r)}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setMode('streetview')}
        className="bg-ink text-space-950 hover:bg-accent mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors"
      >
        Stand here in Street View <ArrowRight className="size-4" />
      </button>
    </section>
  );
}

function Metrics({ site }: { site: Site }) {
  const m = site.metrics;
  const rows = [
    { label: 'Sunlight', value: pct(m.illum_pct), tone: 'text-sun' },
    { label: 'Earth in view', value: pct(m.earth_vis_pct), tone: 'text-earth' },
    { label: 'Slope', value: `${m.slope_deg.toFixed(1)}°`, tone: '' },
    { label: 'Longest night', value: `${m.max_dark_hours} h`, tone: '' },
    { label: 'To shadowed crater', value: `${m.psr_dist_km} km`, tone: 'text-psr' },
  ];
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-2">
          <dt className="text-ink-muted text-xs">{r.label}</dt>
          <dd className={cn('num text-sm', r.tone)}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
