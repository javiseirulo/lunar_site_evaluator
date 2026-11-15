/**
 * Masthead: one line on the night page — mark, name, the pages, Normal/Expert switch —
 * then a single sentence about the next sunrise or Earthrise. Extra pages follow a divider
 * and stay next to the others, so the row does not open a gap.
 */
import { Link, NavLink, useLocation } from 'react-router';
import { useAppStore } from '../store';
import { useData, useTimeseries } from '../data';
import { useClockRange } from '../clockRange';
import { useActiveSeries } from '@/ephem/activeSeries';
import { TABS, modeForPath, pathForMode } from '../navigation';
import { formatHours, formatUtc } from '../format';
import { dayOfWindow, friendlyHours } from '../metrics';
import { changeClause, nextChange, sampleAt, seriesSpanLabel } from '../timeseries';
import { Logo } from './Logo';

type Tab = (typeof TABS)[number];

export function Masthead() {
  const { pathname } = useLocation();
  return (
    <header className="portal">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to="/home"
          className="mr-2 flex items-center gap-2.5"
          aria-label="Lunar Site Evaluator home"
        >
          <Logo className="size-8 shrink-0" />
          <span className="font-mono text-[13px] leading-none font-bold tracking-[0.14em] text-white uppercase">
            Lunar Site Evaluator
          </span>
        </Link>
        <TabBar />
        <div className="ml-auto">
          <ModeSwitch />
        </div>
      </div>
      {modeForPath(pathname) !== 'streetview' && <NextUp />}
    </header>
  );
}

function TabLink({ tab, siteId }: { tab: Tab; siteId: string | null }) {
  return (
    <NavLink to={tab.mode ? pathForMode(tab.mode, siteId) : tab.path} end={tab.end} className="tab">
      {tab.label}
    </NavLink>
  );
}

function TabBar() {
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const proMode = useAppStore((s) => s.proMode);
  const shown = TABS.filter((t) => proMode || !t.expert);
  const main = shown.filter((t) => !t.aside);
  const aside = shown.filter((t) => t.aside);
  return (
    <div className="flex max-w-full flex-wrap items-center">
      <nav aria-label="Main" className="flex max-w-full flex-wrap">
        {main.map((t) => (
          <TabLink key={t.label} tab={t} siteId={selectedSiteId} />
        ))}
      </nav>
      {aside.length > 0 && (
        <nav aria-label="More" className="flex max-w-full flex-wrap items-center">
          <span className="bg-edge mx-2 h-8 w-1 shrink-0" aria-hidden />
          {aside.map((t) => (
            <TabLink key={t.label} tab={t} siteId={selectedSiteId} />
          ))}
        </nav>
      )}
    </div>
  );
}

/** Normal | Expert. Same switch the Mission game uses for its difficulty. */
function ModeSwitch() {
  const proMode = useAppStore((s) => s.proMode);
  const setProMode = useAppStore((s) => s.setProMode);
  return (
    <div
      className="seg"
      role="group"
      aria-label="Detail level"
      title="Expert shows every control, UTC times, coordinates and technical names"
    >
      <button type="button" aria-pressed={!proMode} onClick={() => setProMode(false)}>
        Normal
      </button>
      <button type="button" aria-pressed={proMode} onClick={() => setProMode(true)}>
        Expert
      </button>
    </div>
  );
}

/** One plain sentence: what happens next at the selected (or best) site, plus day and Pro mode. */
function NextUp() {
  const sites = useData((s) => s.sites);
  const isMock = useData((s) => s.isMock);
  const range = useClockRange();
  const active = useActiveSeries();
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const proMode = useAppStore((s) => s.proMode);

  const best = sites
    ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score)[0]
    : null;
  const subject = active.site ?? best ?? null;
  const bestTs = useTimeseries(active.site ? null : best?.id);
  const loaded = active.site ? active.ts : bestTs;
  // Only when the clock is inside the series (the Mission game's Historical mode sets it to 1969...).
  const now = Date.parse(currentTimeUTC);
  const ts =
    loaded &&
    now >= Date.parse(loaded.t_utc[0] ?? '') &&
    now <= Date.parse(loaded.t_utc.at(-1) ?? '')
      ? loaded
      : null;
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSun = nextChange(ts, ts?.lit, currentTimeUTC);
  const toEarth = nextChange(ts, ts?.earth_visible, currentTimeUTC);
  const span = ts ? seriesSpanLabel(ts) : '';
  const fmt = proMode ? formatHours : friendlyHours;
  const day = range ? dayOfWindow(currentTimeUTC, range.start_utc, range.end_utc) : null;

  return (
    <div className="flex flex-col gap-1 pt-3 pb-4 text-ink-muted text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      {subject && sample && (
        <p className="min-w-0 sm:flex-1">
          At <span className="text-white">{subject.name}</span>,{' '}
          {changeClause('the Sun', sample.lit ? 'set' : 'rise', toSun, span, fmt)}
          {sample.earthVisible !== null &&
            ` and ${changeClause('Earth', sample.earthVisible ? 'set' : 'rise', toEarth, span, fmt)}`}
          .
        </p>
      )}
      {active.kind === 'point' && !ts && (
        <p className="min-w-0 sm:flex-1">
          {active.error
            ? 'Ephemeris unavailable for this point.'
            : 'Computing the sky at your point…'}
        </p>
      )}
      <span className="ml-auto flex items-center gap-4">
        {proMode && isMock && (
          <span
            className="text-warn"
            title="Some layers still use invented placeholder data until the real pipeline output lands."
          >
            Mock layers
          </span>
        )}
        <span className="num text-ink">
          {proMode ? formatUtc(currentTimeUTC) : day && `Day ${day.day} of ${day.total}`}
        </span>
      </span>
    </div>
  );
}
