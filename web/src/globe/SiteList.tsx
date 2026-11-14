/**
 * STARTER — owner: Marta (src/globe). A minimal ranked list + detail card so the other modes
 * can be tested end to end. Marta replaces/extends it with filters and weight sliders.
 * Styling follows the portal design system in src/index.css (.box, .box-head, .btn, .lnk).
 */
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
    <section className={cn('box flex min-h-0 flex-col', className)} aria-labelledby="sites-heading">
      <div className="box-head">
        <h2 id="sites-heading">Candidate Sites</h2>
        <span className="ml-auto font-sans font-normal tracking-normal normal-case">
          {sites.filter((s) => s.valid).length} of {sites.length} pass
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead className="bg-navy-800 sticky top-0">
            <tr className="text-ink-faint text-left">
              <th className="label w-6 px-1.5 py-1 text-right">#</th>
              <th className="label px-1.5 py-1">Site</th>
              <th className="label px-1.5 py-1 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => {
              const selected = s.id === selectedSiteId;
              return (
                <tr
                  key={s.id}
                  className={cn(
                    'border-edge cursor-pointer border-t border-dotted',
                    selected ? 'bg-navy-600 text-white' : i % 2 ? 'bg-navy-850' : '',
                    !s.valid && !selected && 'text-ink-faint',
                  )}
                  onClick={() => selectSite(s.id)}
                >
                  <td className="num px-1.5 py-[3px] text-right">{i + 1}</td>
                  <td className="px-1.5 py-[3px]">
                    <button
                      type="button"
                      className={cn(
                        'text-left',
                        selected ? 'font-bold' : 'lnk no-underline hover:underline',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSite(s.id);
                      }}
                    >
                      {s.name}
                    </button>
                  </td>
                  <td className="px-1.5 py-[3px] text-right">
                    <span className="num inline-flex items-center gap-1">
                      <span
                        className="inline-block size-[7px] rotate-45 border border-black"
                        style={{ background: scoreColor(s.score) }}
                      />
                      {Math.round(s.score * 100)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SiteDetail({ className }: { className?: string }) {
  const site = useSelectedSite();
  const setMode = useAppStore((s) => s.setMode);
  if (!site) {
    return (
      <section className={cn('box', className)}>
        <div className="box-head">Site Data</div>
        <p className="box-body text-ink-muted">
          Select a site on the map, in the list, or with <b>Find a site</b> at the top of the page.
        </p>
      </section>
    );
  }
  return (
    <section className={cn('box', className)} aria-label={`${site.name} details`}>
      <div className="box-head">Site Data</div>
      <div className="box-body">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] leading-tight font-bold text-white">{site.name}</h2>
            <p className="text-ink-faint num mt-0.5 text-[10px]">
              {formatLatLon(site.lat, site.lon)} · {site.elev_m.toLocaleString('en')} m
            </p>
          </div>
          <div
            className="num border border-black px-1.5 py-0.5 text-center text-black"
            style={{ background: scoreColor(site.score) }}
            title="Score with the default weights (0–100)"
          >
            <div className="text-[9px] font-bold uppercase">Score</div>
            <div className="text-[16px] leading-none font-bold">{Math.round(site.score * 100)}</div>
          </div>
        </div>
        <Metrics site={site} />
        <ul className="mt-2 space-y-0.5 text-[11px]">
          {site.reasons.map((r) => (
            <li key={r} className={reasonIsGood(r) ? 'text-good' : 'text-bad'}>
              {reasonIsGood(r) ? '✔' : '✖'} {reasonText(r)}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setMode('streetview')}
          className="btn btn-go mt-2.5 w-full"
        >
          Stand here in Street View ›
        </button>
      </div>
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
    <table className="border-edge mt-2 w-full border text-[11px]">
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} className={i % 2 ? 'bg-navy-850' : 'bg-navy-950'}>
            <th className="text-ink-muted px-1.5 py-[3px] text-left font-normal">{r.label}</th>
            <td className={cn('num px-1.5 py-[3px] text-right font-bold', r.tone || 'text-ink')}>
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
