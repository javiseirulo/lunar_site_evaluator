/**
 * STARTER — owner: Marta (src/globe). A ranked list + site card so the other modes can be tested
 * end to end. Marta replaces/extends it with filters and weight sliders.
 * Styling: design system in src/index.css; wording/metrics from METRICS in @/core
 * (plain language by default, technical names in Pro mode).
 */
import { cn } from '@/lib/utils';
import {
  Hint,
  METRICS,
  formatLatLon,
  useAppStore,
  useData,
  useSelectedSite,
  verdictFor,
} from '@/core';
import { scoreColor } from '@/layers';

const VERDICT_STYLE = {
  good: 'bg-good text-[#06210f]',
  ok: 'bg-glow text-[#2a0f02]',
  bad: 'bg-bad text-white',
} as const;

export function SiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  if (!sites) return null;
  const ranked = [...sites].sort((a, b) => Number(b.valid) - Number(a.valid) || b.score - a.score);

  return (
    <section className={cn('box flex min-h-0 flex-col', className)} aria-labelledby="sites-heading">
      <div className="box-head">
        <h2 id="sites-heading">Landing Sites</h2>
        <span className="ml-auto font-sans font-bold tracking-normal normal-case">
          {sites.filter((s) => s.valid).length} of {sites.length} are safe
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-panel-3 sticky top-0 z-10">
            <tr className="text-left">
              <th className="label w-8 px-2 py-2 text-right">#</th>
              <th className="label px-2 py-2">Site</th>
              <th className="label px-2 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => {
              const selected = s.id === selectedSiteId;
              return (
                <tr
                  key={s.id}
                  className={cn(
                    'border-edge cursor-pointer border-t transition-colors duration-150',
                    selected
                      ? 'bg-violet text-white shadow-[inset_3px_0_0_#ff3fa4]'
                      : 'hover:bg-panel-2',
                    !s.valid && !selected && 'text-ink-faint',
                  )}
                  onClick={() => selectSite(s.id)}
                >
                  <td className="num px-2 py-[6px] text-right">{i + 1}</td>
                  <td className="px-2 py-[6px]">
                    <button
                      type="button"
                      className={cn('text-left font-bold', !selected && 'hover:text-link-hover')}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSite(s.id);
                      }}
                    >
                      {s.name}
                    </button>
                  </td>
                  <td className="px-2 py-[6px] text-right">
                    <span className="num inline-flex items-center gap-1.5 font-bold">
                      <span
                        className="inline-block size-[8px] rotate-45 border border-black/60"
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

const STEPS: [string, string][] = [
  ['Pick a spot', 'Click a diamond on the map or a name in the list.'],
  ['Press Play', 'Watch the days go by. When does it get dark?'],
  ['Compare', 'Use the Compare tab to put two or three spots side by side.'],
];

export function SiteDetail({ className }: { className?: string }) {
  const site = useSelectedSite();
  const setMode = useAppStore((s) => s.setMode);
  const proMode = useAppStore((s) => s.proMode);

  if (!site) {
    return (
      <section className={cn('box', className)}>
        <div className="box-head-dark">Start Here</div>
        <ol className="box-body space-y-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-3">
              <span className="display bg-pink flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] text-white shadow-[0_0_12px_-2px_#ff3fa4]">
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

  const verdict = verdictFor(site);
  return (
    <section
      className={cn('box animate-enter', className)}
      key={site.id}
      aria-label={`${site.name} details`}
    >
      <div className="box-head">Site Card</div>
      <div className="box-body">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="display text-[18px] leading-tight">{site.name}</h2>
            {proMode && (
              <p className="text-ink-faint num mt-0.5 text-[11.5px]">
                {formatLatLon(site.lat, site.lon)} · {site.elev_m.toLocaleString('en')} m
              </p>
            )}
          </div>
          <div
            className="num rounded-[4px] px-2 py-1 text-center text-[#130b25] shadow-[0_0_14px_-3px_currentColor]"
            style={{ background: scoreColor(site.score), color: '#130b25' }}
            title="Score from 0 to 100 using the default weights"
          >
            <div className="text-[9.5px] font-extrabold uppercase">Score</div>
            <div className="text-[19px] leading-none font-extrabold">
              {Math.round(site.score * 100)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2">
          <span className={cn('chip shrink-0 border-transparent', VERDICT_STYLE[verdict.tone])}>
            {verdict.label}
          </span>
          <span className="text-ink-muted text-[12.5px] leading-snug">{verdict.why}</span>
        </div>

        <ul className="mt-4 space-y-3">
          {METRICS.map((m) => {
            const good = m.goodness(site.metrics);
            return (
              <li key={m.key}>
                <div className="flex items-center gap-1.5 text-[13px]">
                  <m.Icon className={cn('size-4', m.tone)} aria-hidden />
                  <span className="text-heading font-bold">{proMode ? m.proLabel : m.label}</span>
                  <Hint text={m.help} />
                  <span className={cn('num ml-auto font-extrabold', m.tone)}>
                    {m.format(site.metrics, proMode)}
                  </span>
                </div>
                {good !== null && (
                  <div className="meter mt-1">
                    <span
                      style={{
                        width: `${Math.round(good * 100)}%`,
                        background: m.bar,
                        boxShadow: `0 0 8px ${m.bar}`,
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setMode('streetview')}
          className="btn btn-go mt-4 w-full"
        >
          Stand here in Street View →
        </button>
      </div>
    </section>
  );
}
