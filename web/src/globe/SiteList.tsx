/**
 * Explore sidebar — owner: Marta (src/globe).
 *
 * SiteList: requirements form (thresholds in the shared `missionConfig.requirements`, Javi's J9) and,
 * once applied, the live-filtered, live-ranked candidate list (interim score in ./requirements.ts).
 * SiteDetail: the selected site's sheet. Wording/metrics come from METRICS in @/core.
 */
import { useState } from 'react';
import type { RequirementKey, Site } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { METRICS, formatLatLon, useAppStore, useData, useSelectedSite } from '@/core';
import { scoreColor } from '@/layers';
import { DEFAULT_MISSION_CONFIG } from '@/scoring';
import type { SiteEvaluation } from './requirements';
import { useExplore, useRanking } from './ranking';
import { formatValue, metricLabel, whyNot } from './requirementText';

interface SliderDef {
  key: RequirementKey & keyof Site['metrics'];
  /** "min": the site needs at least this much; "max": at most. */
  bound: 'min' | 'max';
  min: number;
  max: number;
  step: number;
}

/** The simple requirement sliders (metrics every v1 site has). */
const SLIDERS: SliderDef[] = [
  { key: 'illum_pct', bound: 'min', min: 0, max: 1, step: 0.05 },
  { key: 'earth_vis_pct', bound: 'min', min: 0, max: 1, step: 0.05 },
  { key: 'slope_deg', bound: 'max', min: 0, max: 30, step: 1 },
  { key: 'max_dark_hours', bound: 'max', min: 0, max: 500, step: 10 },
];

export function SiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const applied = useExplore((s) => s.applied);
  if (!sites) return null;

  return (
    <section
      className={cn('box flex min-h-0 flex-col overflow-y-auto', className)}
      aria-labelledby="sites-heading"
    >
      <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
        <h2 id="sites-heading" className="text-[18px]">
          Your requirements
        </h2>
      </div>
      <RequirementsForm />
      {applied ? (
        <RankedList />
      ) : (
        <p className="text-ink-muted px-5 pb-4 text-[13px]">
          Set what your lander needs, then press <strong>Show matching sites</strong>. Candidate
          sites appear here and on the 3D globe, filtered and ranked live as you move the sliders.
        </p>
      )}
    </section>
  );
}

function RequirementsForm() {
  const requirements = useAppStore((s) => s.missionConfig.requirements);
  const setMissionConfig = useAppStore((s) => s.setMissionConfig);
  const proMode = useAppStore((s) => s.proMode);
  const applied = useExplore((s) => s.applied);
  const setApplied = useExplore((s) => s.setApplied);

  const setThreshold = (key: RequirementKey, threshold: number) => {
    const current = requirements[key] ?? DEFAULT_MISSION_CONFIG.requirements[key];
    setMissionConfig({ requirements: { ...requirements, [key]: { ...current, threshold } } });
  };

  return (
    <form
      className="flex flex-col gap-3 px-5 pt-2 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        setApplied(true);
      }}
      aria-label="Landing site requirements"
    >
      {SLIDERS.map((s) => {
        const def = DEFAULT_MISSION_CONFIG.requirements[s.key];
        const value = requirements[s.key]?.threshold ?? def?.threshold ?? s.min;
        const id = `req-${s.key}`;
        const help = METRICS.find((m) => m.key === s.key)?.help;
        return (
          <div key={s.key} title={help}>
            <label htmlFor={id} className="label flex items-baseline justify-between gap-2">
              <span>
                {metricLabel(s.key, proMode)}{' '}
                <span className="text-ink-faint">{s.bound === 'min' ? 'at least' : 'at most'}</span>
              </span>
              <span className="num text-heading font-medium">
                {formatValue(s.key, value, proMode)}
              </span>
            </label>
            <input
              id={id}
              type="range"
              className="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={value}
              onChange={(e) => setThreshold(s.key, Number(e.target.value))}
            />
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        {!applied && (
          <button type="submit" className="btn btn-go flex-1">
            Show matching sites
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => setMissionConfig({ requirements: DEFAULT_MISSION_CONFIG.requirements })}
        >
          Reset
        </button>
        {applied && (
          <button type="button" className="btn" onClick={() => setApplied(false)}>
            Hide sites
          </button>
        )}
      </div>
    </form>
  );
}

function RankedList() {
  const ranking = useRanking();
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  const proMode = useAppStore((s) => s.proMode);
  const [showMisses, setShowMisses] = useState(false);
  if (!ranking) return null;

  const passing = ranking.filter((e) => e.pass);
  const failing = ranking.filter((e) => !e.pass);
  const missesOpen = showMisses || passing.length === 0;

  const row = (e: SiteEvaluation, i: number | null) => {
    const selected = e.site.id === selectedSiteId;
    return (
      <li key={e.site.id}>
        <button
          type="button"
          onClick={() => selectSite(selected ? null : e.site.id)}
          aria-pressed={selected}
          className={cn(
            'grid w-full grid-cols-[22px_1fr_auto] items-baseline gap-x-1 rounded-[4px] px-3 py-[7px] text-left text-[14px] transition-colors duration-100',
            selected ? 'bg-violet text-white' : 'hover:bg-panel-2',
            !e.pass && !selected && 'text-ink-faint',
          )}
        >
          <span className={cn('num text-[12px]', selected ? 'text-white/70' : 'text-ink-faint')}>
            {i === null ? '–' : i + 1}
          </span>
          <span className="truncate">{e.site.name}</span>
          {e.pass ? (
            <span className="num flex items-center gap-1.5 font-medium">
              <span
                className="inline-block size-2.5"
                style={{ background: scoreColor(e.score) }}
                aria-hidden
              />
              {Math.round(e.score * 100)}
            </span>
          ) : (
            <span />
          )}
          {!e.pass && (
            <span
              className={cn(
                'col-start-2 col-end-4 truncate text-[12px]',
                selected ? 'text-white/80' : 'text-bad',
              )}
            >
              {whyNot(e, proMode)}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="border-edge border-t pb-3" aria-live="polite">
      <p className="text-ink-muted px-5 pt-3 pb-1 text-[13px]">
        <strong className="text-heading">{passing.length}</strong> of {ranking.length} sites meet
        your requirements{passing.length > 0 && ', best match first'}.
      </p>
      {passing.length > 0 ? (
        <ol className="px-2">{passing.map((e, i) => row(e, i))}</ol>
      ) : (
        <p className="text-ink-muted px-5 text-[13px]">
          None. Try relaxing a requirement: the list below says what each site misses.
        </p>
      )}
      {failing.length > 0 && (
        <div className="px-2 pt-2">
          <button
            type="button"
            className="lnk px-3 text-[13px]"
            onClick={() => setShowMisses((v) => !v)}
            aria-expanded={missesOpen}
          >
            {missesOpen ? 'Hide' : 'Show'} the {failing.length} that miss them
          </button>
          {missesOpen && <ul className="mt-1">{failing.map((e) => row(e, null))}</ul>}
        </div>
      )}
      <p className="text-ink-faint px-5 pt-2 text-[12px]">
        Score: how far past each requirement a site goes, weighted (0 at the limit, 100 at the
        goal). Mock data for now.
      </p>
    </div>
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
