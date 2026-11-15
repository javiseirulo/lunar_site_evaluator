/**
 * Explore sidebar and site sheet — owner: Marta (src/globe). v1 of docs/10 §5 Marta.
 *
 * SiteList: mission requirements (Booking-style filters, all empty at first), mission window,
 * "Sort by" and the live list of candidate sites. No score, weights or `valid` from sites.json.
 * SiteDetail: the selected site's sheet: requirement checks, "Now" (Mission Clock) and window stats.
 */
import { standHere } from './streetViewFlight';
import { useNavigate } from 'react-router';
import { prepareSurfaceLocation } from '@/core';
import { useCustomPins } from './customPins';
import { removeCustomPin } from './pointList';
import { PointStatsView } from './PointStatsView';
import { usePinSelection } from './pinSelection';
import { useHistoric } from './historicSites';
import { HistoricDetails } from './GlobeCard';
import type { HistoricSite } from '@lunar/contracts';
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatHours,
  formatLatLon,
  formatUtc,
  lowScoreReason,
  changeLead,
  changeWhen,
  nextChange,
  seriesSpanLabel,
  pct,
  sampleAt,
  useAppStore,
  useData,
  useSelectedSite,
} from '@/core';
import {
  autonomyH,
  evaluateSite,
  isValidValue,
  meanPowerW,
  meetsText,
  siteSlope,
  type Check,
  type RequirementField,
  type SiteEvaluation,
  type SortBy,
} from './missionStats';
import { useActiveSeries } from '@/ephem/activeSeries';
import { YourPoints } from './YourPoints';
import { useRequirements } from './requirementsStore';
import { useCandidates, useMissionWindow, useSiteStats } from './useCandidates';

interface FieldDef {
  field: RequirementField;
  label: string;
  unit: string;
  placeholder: string;
  help: string;
}

const FIELDS: FieldDef[] = [
  {
    field: 'batteryWh',
    label: 'Battery capacity',
    unit: 'Wh',
    placeholder: 'e.g. 3000',
    help: 'Energy stored for the night. With the power draw it gives the battery autonomy.',
  },
  {
    field: 'loadW',
    label: 'Power draw',
    unit: 'W',
    placeholder: 'e.g. 50',
    help: 'What the lander consumes on average, day and night.',
  },
  {
    field: 'panelW',
    label: 'Solar panel power',
    unit: 'W',
    placeholder: 'e.g. 120',
    help: 'Rated output of the panels when facing the Sun.',
  },
  {
    field: 'maxCommGapH',
    label: 'Max. comm gap',
    unit: 'h',
    placeholder: 'e.g. 24',
    help: 'Longest time the lander can go without seeing Earth (direct radio link).',
  },
  {
    field: 'maxSlopeDeg',
    label: 'Max. slope',
    unit: '°',
    placeholder: 'e.g. 8',
    help: 'Steepest ground the lander can touch down on.',
  },
];

const SORTS: { id: SortBy; label: string }[] = [
  { id: 'battery_margin', label: 'Battery margin' },
  { id: 'comms', label: 'Shortest comm gap' },
  { id: 'flattest', label: 'Flattest' },
  { id: 'sunlight', label: 'Most sunlight' },
];

const ASSUMPTION =
  'Assumes vertical solar panels: with the Sun up (a few degrees above the horizon at the pole), output ≈ rated power.';

const mark = (c: Check) => (c.status === 'pass' ? '✔' : c.status === 'fail' ? '✖' : '?');
const markTone = (c: Check) =>
  c.status === 'pass' ? 'text-good' : c.status === 'fail' ? 'text-bad' : 'text-ink-muted';

/** 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">, read as UTC. */
const toInput = (isoUtc: string) => isoUtc.slice(0, 16);
const fromInput = (v: string) => {
  if (!v) return null;
  const ms = Date.parse(`${v.slice(0, 16)}:00Z`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
};

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function SiteList({
  className,
  part = 'all',
}: {
  className?: string;
  /** Explore shows each piece on its own page. */
  part?: 'all' | 'requirements' | 'sites';
}) {
  const sites = useData((s) => s.sites);
  if (!sites) return null;

  return (
    <section
      className={cn(
        'box flex min-h-0 flex-col',
        part !== 'requirements' && 'overflow-y-auto',
        className,
      )}
      aria-labelledby={part === 'sites' ? undefined : 'req-heading'}
    >
      {part !== 'sites' && (
        <>
          <div className="px-5 pt-4 pb-1">
            <h2 id="req-heading" className="text-[18px]">
              Mission requirements
            </h2>
          </div>
          <RequirementFields />
        </>
      )}
      {part === 'all' && <MissionWindowFields />}
      {part !== 'requirements' && <Results />}
    </section>
  );
}

function RequirementFields() {
  const added = useRequirements((s) => s.added);
  const req = useRequirements((s) => s.req);
  const addField = useRequirements((s) => s.addField);
  const removeField = useRequirements((s) => s.removeField);
  const setValue = useRequirements((s) => s.setValue);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLUListElement>(null);

  // Close the "Add requirement" list with Escape or a click outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    const onDown = (e: PointerEvent) => {
      const el = menuRef.current;
      if (
        el &&
        !el.contains(e.target as Node) &&
        !(e.target as Element).closest?.('[aria-controls="add-requirement-list"]')
      )
        setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [menuOpen]);
  const available = FIELDS.filter((f) => !added.includes(f.field));
  const auto = autonomyH(req);

  return (
    <div className="flex flex-col gap-2 px-5 pt-2 pb-3">
      {added.map((field) => {
        const def = FIELDS.find((f) => f.field === field)!;
        const id = `req-${field}`;
        const invalid = req[field] !== undefined && !isValidValue(field, req[field]);
        return (
          <div key={field}>
            <label htmlFor={id} className="label">
              {def.label}
            </label>
            <p id={`${id}-help`} className="sr-only">
              {def.help}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="relative min-w-0 flex-1">
                <input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="field w-full pr-9"
                  placeholder={def.placeholder}
                  aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ''}`}
                  aria-invalid={invalid || undefined}
                  value={req[field] ?? ''}
                  onChange={(e) =>
                    setValue(field, e.target.value === '' ? undefined : Number(e.target.value))
                  }
                />
                <span className="text-ink-muted pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[13px]">
                  {def.unit}
                </span>
              </div>
              <button
                type="button"
                className="btn size-[34px] shrink-0 px-0"
                onClick={() => removeField(field)}
                aria-label={`Remove ${def.label}`}
                title="Remove"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            {invalid && (
              <p id={`${id}-error`} className="text-bad mt-1 text-[12px]">
                {field === 'maxCommGapH' || field === 'maxSlopeDeg'
                  ? 'Must be 0 or more. Not applied.'
                  : 'Must be greater than 0. Not applied.'}
              </p>
            )}
          </div>
        );
      })}

      {added.includes('batteryWh') && !isValidValue('loadW', req.loadW) && (
        <p className="text-ink-muted text-[12px]">
          Add <strong>Power draw</strong> to compare the longest night with battery autonomy.
        </p>
      )}
      {added.includes('panelW') && !isValidValue('loadW', req.loadW) && (
        <p className="text-ink-muted text-[12px]">
          Add <strong>Power draw</strong> to compare solar power with consumption.
        </p>
      )}
      {auto !== null && (
        <p className="text-ink-muted text-[12px]">
          Battery autonomy: <strong className="text-heading num">{formatHours(auto)}</strong>
        </p>
      )}

      {available.length > 0 && (
        <div>
          <button
            type="button"
            className="btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="add-requirement-list"
          >
            <Plus className="size-4" aria-hidden /> Add requirement
          </button>
          {menuOpen && (
            <ul
              id="add-requirement-list"
              ref={menuRef}
              className="border-edge mt-1 rounded-[2px] border"
              aria-label="Requirements you can add"
            >
              {available.map((f) => (
                <li key={f.field}>
                  <button
                    type="button"
                    className="hover:bg-panel-2 flex w-full items-baseline justify-between px-3 py-1.5 text-left text-[14px]"
                    onClick={() => {
                      addField(f.field);
                      setMenuOpen(false);
                    }}
                  >
                    {f.label} <span className="text-ink-muted text-[12px]">{f.unit}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MissionWindowFields() {
  const range = useData((s) => s.manifest?.time_range);
  const input = useRequirements((s) => s.window);
  const setWindow = useRequirements((s) => s.setWindow);
  const resolved = useMissionWindow();
  if (!range || !resolved) return null;
  const maxDays = Math.ceil(
    (Date.parse(range.end_utc) + range.step_s * 1000 - Date.parse(range.start_utc)) / 86_400_000,
  );

  return (
    <fieldset className="border-edge flex flex-col gap-2 border-t px-5 pt-3 pb-3">
      <legend className="sr-only">Mission window</legend>
      <p className="text-heading text-[14px] font-medium">Mission window</p>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label htmlFor="win-start" className="label">
            Landing (UTC)
          </label>
          <input
            id="win-start"
            type="datetime-local"
            className="field mt-1 w-full min-w-0 px-1 text-[13px]"
            min={toInput(range.start_utc)}
            max={toInput(range.end_utc)}
            value={input.startUtc ? toInput(input.startUtc) : ''}
            onChange={(e) => setWindow({ startUtc: fromInput(e.target.value) })}
          />
        </div>
        <div>
          <label htmlFor="win-days" className="label">
            Days
          </label>
          <input
            id="win-days"
            type="number"
            min={1}
            max={maxDays}
            inputMode="numeric"
            className="field mt-1 w-full"
            placeholder="e.g. 7"
            value={input.durationDays ?? ''}
            onChange={(e) =>
              setWindow({ durationDays: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </div>
      </div>
      <p className="text-ink-muted text-[12px]">
        {resolved.isFullRange
          ? `No landing date: using all data, ${formatUtc(range.start_utc)} – ${formatUtc(range.end_utc)}${input.durationDays ? '. Days apply once a landing date is set.' : '.'}`
          : `${formatUtc(resolved.startUtc)} – ${formatUtc(resolved.endUtc)}${resolved.clamped ? ' (cut to the available data).' : '.'}`}
      </p>
    </fieldset>
  );
}

function Results() {
  const { active, loading, failed, total, evaluations, candidates, topRank } = useCandidates();
  const sortBy = useRequirements((s) => s.sortBy);
  const setSortBy = useRequirements((s) => s.setSortBy);
  const showNonMatching = useRequirements((s) => s.showNonMatching);
  const setShowNonMatching = useRequirements((s) => s.setShowNonMatching);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);

  if (!active) {
    return (
      <>
        <p className="border-edge text-ink-muted border-t px-5 py-4 text-[14px]">
          Add a mission requirement to find landing sites.
        </p>
        <YourPoints />
      </>
    );
  }

  const others = evaluations?.filter((e) => !e.candidate) ?? [];

  const row = (e: SiteEvaluation) => {
    const selected = e.site.id === selectedSiteId;
    const rank = topRank.get(e.site.id);
    const firstMiss = e.checks.find((c) => c.status === 'fail');
    return (
      <li key={e.site.id}>
        <button
          type="button"
          onClick={() => selectSite(selected ? null : e.site.id)}
          aria-pressed={selected}
          className={cn(
            'grid w-full grid-cols-[22px_1fr_auto] items-baseline gap-x-1 rounded-[4px] px-3 py-[7px] text-left text-[14px] transition-colors duration-100',
            selected ? 'bg-violet text-black' : 'hover:bg-panel-2',
            !e.candidate && !selected && 'text-ink-muted',
          )}
        >
          <span className={cn('num text-[12px]', selected ? 'text-black/70' : 'text-ink-muted')}>
            {rank ?? '·'}
          </span>
          <span className="truncate">{e.site.name}</span>
          <span className="flex gap-0.5 text-[12px]" aria-label={meetsText(e)}>
            {e.checks.map((c) => (
              <span key={c.id} className={selected ? 'text-black' : markTone(c)} title={c.text}>
                {mark(c)}
              </span>
            ))}
          </span>
          {!e.candidate && e.noData && (
            <span
              className={cn(
                'col-start-2 col-end-4 truncate text-[12px]',
                selected ? 'text-black/80' : 'text-ink-muted',
              )}
            >
              {meetsText(e)}
            </span>
          )}
          {!e.candidate && !e.noData && firstMiss && (
            <span
              className={cn(
                'col-start-2 col-end-4 truncate text-[12px]',
                selected ? 'text-black/80' : 'text-bad',
              )}
            >
              {firstMiss.text}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="border-edge border-t pb-3">
      <div className="flex items-center gap-2 px-5 pt-3">
        <label htmlFor="sort-by" className="label shrink-0">
          Sort by
        </label>
        <select
          id="sort-by"
          className="field min-w-0 flex-1 text-[13px]"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-ink-muted px-5 pt-3 pb-1 text-[13px]" aria-live="polite">
        {loading ? (
          `Loading sunlight and Earth data for ${total} sites…`
        ) : (
          <>
            <strong className="text-heading">{candidates.length}</strong> of {total} sites meet your
            requirements{candidates.length > 0 && '. Top 5 numbered.'}
            {failed > 0 && ` (${failed} could not be loaded.)`}
          </>
        )}
      </p>

      {!loading && candidates.length > 0 && <ol className="px-2">{candidates.map(row)}</ol>}
      {!loading && candidates.length === 0 && (
        <p className="text-ink-muted px-5 text-[13px]">
          None yet. Relax a requirement or change the mission window.
        </p>
      )}

      {!loading && others.length > 0 && (
        <div className="px-5 pt-2">
          <label className="text-ink-muted flex cursor-pointer items-center gap-2 text-[13px]">
            <button
              type="button"
              role="switch"
              aria-checked={showNonMatching}
              className="switch"
              onClick={() => setShowNonMatching(!showNonMatching)}
            />
            Show non-matching ({others.length})
          </label>
        </div>
      )}
      {!loading && showNonMatching && others.length > 0 && (
        <ul className="mt-1 px-2">{others.map(row)}</ul>
      )}

      <p className="text-ink-muted px-5 pt-3 text-[12px]">{ASSUMPTION}</p>
      <YourPoints />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Site sheet
// ---------------------------------------------------------------------------

/** Right-hand card: the selected own pin if there is one, otherwise the selected catalogue site. */
export function SiteDetail({ className }: { className?: string }) {
  const pinId = usePinSelection((s) => s.pinId);
  const landing = useHistoric((s) =>
    s.focusedId ? (s.sites.find((site) => site.id === s.focusedId) ?? null) : null,
  );
  const point = useAppStore((s) => s.selectedPoint);
  const siteId = useAppStore((s) => s.selectedSiteId);
  // Shown while the pin is the active point: deselecting it in "Your points" hides the card, and
  // selecting it again (list or globe) brings it back.
  const pin = useCustomPins(
    (s) =>
      s.pins.find(
        (p) => p.id === pinId && siteId === null && point?.lat === p.lat && point?.lon === p.lon,
      ) ?? null,
  );
  if (landing) return <LandingDetail site={landing} className={className} />;
  return pin ? <PinDetail pin={pin} className={className} /> : <SiteBody className={className} />;
}

function LandingDetail({ site, className }: { site: HistoricSite; className?: string }) {
  return (
    <section className={cn('box p-5', className)} aria-label={`${site.name} landing`}>
      <p className="text-heading font-mono text-[11px] tracking-[0.12em] uppercase">Past landing</p>
      <h2 className="mt-1 text-[22px] leading-tight">{site.name}</h2>
      <p className="text-ink-muted num mt-1 text-[12px]">{formatLatLon(site.lat, site.lon)}</p>
      <div className="mt-4">
        <HistoricDetails site={site} />
      </div>
    </section>
  );
}

function PinDetail({
  pin,
  className,
}: {
  pin: { id: string; name: string; lat: number; lon: number };
  className?: string;
}) {
  const navigate = useNavigate();
  const proMode = useAppStore((s) => s.proMode);
  return (
    <section className={cn('box p-5', className)} aria-label={`${pin.name} details`}>
      <h2 className="text-[24px] leading-tight">{pin.name}</h2>
      <p className="text-ink-muted num mt-1 text-[12px]">
        {proMode ? formatLatLon(pin.lat, pin.lon) : 'Your own pin'}
      </p>
      <div className="mt-4">
        <PointStatsView point={pin} />
      </div>
      <button
        type="button"
        onClick={() =>
          standHere({
            siteId: 'free',
            lat: pin.lat,
            lon: pin.lon,
            onArrive: () => navigate(prepareSurfaceLocation({ lat: pin.lat, lon: pin.lon })),
          })
        }
        className="btn mt-5 w-full"
      >
        Stand here in Street View
      </button>
      <button
        type="button"
        onClick={() => {
          usePinSelection.getState().setPinId(null);
          removeCustomPin(pin);
        }}
        className="btn btn-quiet mt-2 w-full"
      >
        Delete pin
      </button>
    </section>
  );
}

function SiteBody({ className }: { className?: string }) {
  const site = useSelectedSite();
  const point = useAppStore((s) => s.selectedPoint);
  const proMode = useAppStore((s) => s.proMode);
  const req = useRequirements((s) => s.req);
  const stats = useSiteStats(site?.id ?? null);
  const loadError = useData((s) => (site ? s.timeseriesErrors[site.id] : undefined));
  const window = useMissionWindow();

  if (!site && point) {
    return (
      <section className={cn('box p-5', className)} aria-label="Your point">
        <h2 className="text-[20px] leading-tight">Your point</h2>
        <p className="text-ink-muted num mt-1 text-[12px]">{formatLatLon(point.lat, point.lon)}</p>
        <p className="text-ink mt-2 text-[13px]">
          Press Play to watch its sunlight and Earth view.
        </p>
        <NowSection siteId={null} expert={proMode} />
      </section>
    );
  }

  if (!site) {
    return (
      <section className={cn('box p-5', className)}>
        <h2 className="text-[18px]">No site selected</h2>
        {proMode ? (
          <ol className="text-ink mt-3 list-decimal space-y-2 pl-5 text-[14px]">
            <li>Add a mission requirement on the left to find candidate sites.</li>
            <li>Click a site in the list or on the map.</li>
            <li>Press Play and watch when the site gets sunlight and sees Earth.</li>
          </ol>
        ) : (
          <p className="text-ink mt-3 text-[14px]">
            Tap a site on the map or in the list. Then press Play to watch the days go by.
          </p>
        )}
      </section>
    );
  }

  const evaluation = evaluateSite(site, stats, req);
  const slope = siteSlope(site);

  return (
    <section className={cn('box p-5', className)} aria-label={`${site.name} details`}>
      <h2 className="text-[24px] leading-tight">{site.name}</h2>
      {proMode && (
        <p className="text-ink-muted num mt-1 text-[12px]">
          {formatLatLon(site.lat, site.lon)}, {site.elev_m.toLocaleString('en')} m
        </p>
      )}

      {lowScoreReason(site) && (
        <p className="text-ink-muted mt-1 text-[12px]">{lowScoreReason(site)}</p>
      )}

      {evaluation.checks.length > 0 && (
        <div className="mt-4">
          <p className="text-heading text-[15px] font-medium">{meetsText(evaluation)}</p>
          <ul className="mt-2 space-y-1 text-[13px]">
            {evaluation.checks.map((c) => (
              <li key={c.id} className={markTone(c)}>
                {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <NowSection siteId={site.id} expert={proMode} />

      <div className="mt-4">
        <p className="text-heading text-[15px] font-medium">
          {window?.isFullRange ? 'Over all available data' : 'In your mission window'}
        </p>
        {loadError ? (
          <p className="text-bad mt-1 text-[13px]">Could not load this site's data.</p>
        ) : stats === null ? (
          <p className="text-ink-muted mt-1 text-[13px]">Loading…</p>
        ) : stats.samples === 0 ? (
          <p className="text-ink-muted mt-1 text-[13px]">No data in this window.</p>
        ) : (
          <dl className="rows border-edge mt-2 border-t text-[14px]">
            <Row
              label="Sunlight"
              value={stats.sunlitFraction !== null ? pct(stats.sunlitFraction) : '—'}
            />
            <Row label="Longest night (whole window)" value={formatHours(stats.longestNightH)} />
            {proMode && (
              <Row
                label="Longest comm gap (whole window)"
                value={
                  stats.longestCommGapH === null ? 'unknown' : formatHours(stats.longestCommGapH)
                }
              />
            )}
            {proMode && req.panelW !== undefined && stats.sunlitFraction !== null && (
              <Row
                label="Mean solar power"
                value={`${Math.round(meanPowerW(req.panelW, stats.sunlitFraction))} W${
                  req.loadW !== undefined ? ` vs load ${Math.round(req.loadW)} W` : ''
                }`}
              />
            )}
            {proMode && (
              <Row
                label="Slope"
                value={slope === null ? 'pending terrain' : `${slope.toFixed(1)}°`}
              />
            )}
          </dl>
        )}
        {req.panelW !== undefined && (
          <p className="text-ink-muted mt-2 text-[12px]">{ASSUMPTION}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => standHere({ siteId: site.id, lat: site.lat, lon: site.lon })}
        className="btn mt-5 w-full"
      >
        Stand here in Street View
      </button>
    </section>
  );
}

function NowSection({ siteId, expert }: { siteId: string | null; expert: boolean }) {
  const active = useActiveSeries();
  const ts = active.ts;
  const siteError = useData((s) => (siteId ? s.timeseriesErrors[siteId] : undefined));
  const loadError = siteError ?? active.error;
  const now = useAppStore((s) => s.currentTimeUTC);
  const sky = ts ? sampleAt(ts, now) : null;
  const span = ts ? seriesSpanLabel(ts) : '';

  return (
    <div className="mt-4">
      <p className="text-heading text-[15px] font-medium">Now (Mission Clock)</p>
      {expert && (
        <p className="text-ink-muted text-[12px]">
          {formatUtc(now)}. Countdowns start at this time, not at the start of the window.
        </p>
      )}
      {loadError ? (
        <p className="text-bad mt-1 text-[13px]">Could not load this site's data.</p>
      ) : !ts || !sky ? (
        <p className="text-ink-muted mt-1 text-[13px]">
          {active.computing ? 'Computing…' : 'Loading…'}
        </p>
      ) : (
        <dl className="rows border-edge mt-2 border-t text-[14px]">
          <Row label="Sun elevation" value={`${sky.sun_el.toFixed(1)}°`} />
          <Row
            label={changeLead(
              sky.lit ? 'Sunlit · sunset' : 'Dark · sunrise',
              nextChange(ts, ts.lit, now),
            )}
            value={changeWhen(nextChange(ts, ts.lit, now), span, formatHours)}
          />
          <Row
            label={
              sky.earthVisible === null
                ? 'Earth visibility'
                : sky.earthVisible
                  ? changeLead('Earth in view · Earthset', nextChange(ts, ts.earth_visible, now))
                  : changeLead('Earth hidden · Earthrise', nextChange(ts, ts.earth_visible, now))
            }
            value={
              sky.earthVisible === null || !ts.earth_visible
                ? 'unknown'
                : changeWhen(nextChange(ts, ts.earth_visible, now), span, formatHours)
            }
          />
        </dl>
      )}
      {ts && sky && active.flatHorizon && (
        <p className="text-ink-muted mt-1 text-[12px]">Flat horizon, no terrain.</p>
      )}
      {ts && sky && ts.earth_visible && ts.earth_visible.every((f) => f === 0) && (
        <p className="text-ink-muted mt-1 text-[12px]">
          Earth never rises here in {span}: hidden by terrain or the far side. The data is complete;
          this site can still be explored.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-ink">{label}</dt>
      <dd className="num text-heading font-medium">{value}</dd>
    </div>
  );
}
