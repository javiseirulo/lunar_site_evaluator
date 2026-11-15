/**
 * Masthead: one line on the night page — mark, name, four page links, Normal/Expert switch —
 * then a single sentence about the next sunrise or Earthrise. Expert mode adds more pages and
 * the site finder.
 */
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { useData, useSelectedSite, useTimeseries } from '../data';
import { visibleTabs, modeForPath, pathForMode } from '../navigation';
import { formatHours, formatUtc } from '../format';
import { dayOfWindow, friendlyHours } from '../metrics';
import { changeClause, nextChange, sampleAt, seriesSpanLabel } from '../timeseries';
import { Logo } from './Logo';

export function Masthead() {
  const { pathname } = useLocation();
  return (
    <header className="portal">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to="/"
          className="mr-2 flex items-center gap-2.5"
          aria-label="Lunar Site Evaluator home"
        >
          <Logo className="size-8 shrink-0" />
          <span className="font-mono text-[13px] leading-none font-bold tracking-[0.14em] text-white uppercase">
            Lunar Site Evaluator
          </span>
        </Link>
        <TabBar />
        <div className="ml-auto flex max-w-full flex-wrap items-center gap-x-4 gap-y-2">
          <SiteFinder />
          <ModeSwitch />
        </div>
      </div>
      {modeForPath(pathname) !== 'streetview' && <NextUp />}
    </header>
  );
}

/** Picks a site and opens it in Explore (or keeps the current mode). */
function SiteFinder() {
  const sites = useData((s) => s.sites);
  const selectSite = useAppStore((s) => s.selectSite);
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const proMode = useAppStore((s) => s.proMode);
  if (!sites || !proMode) return null;
  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form
      className="flex max-w-full flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        selectSite(value);
        const mode = modeForPath(window.location.pathname);
        if (mode === 'streetview') navigate(pathForMode('streetview', value));
        else if (mode !== 'explore') navigate('/explore');
      }}
    >
      <label htmlFor="site-finder" className="text-ink-muted text-[13px]">
        Find a site
      </label>
      <select
        id="site-finder"
        className="field w-40 max-w-full sm:w-48"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">Choose a site</option>
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="submit" className="btn" disabled={!value}>
        Open
      </button>
    </form>
  );
}

function TabBar() {
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const proMode = useAppStore((s) => s.proMode);
  return (
    <nav aria-label="Main" className="flex overflow-x-auto [scrollbar-width:none]">
      {visibleTabs(proMode).map((t) => (
        <NavLink
          key={t.label}
          to={t.mode ? pathForMode(t.mode, selectedSiteId) : t.path}
          end={t.end}
          className="tab"
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
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
  const range = useData((s) => s.manifest?.time_range);
  const selected = useSelectedSite();
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const proMode = useAppStore((s) => s.proMode);

  const best = sites
    ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score)[0]
    : null;
  const subject = selected ?? best ?? null;
  const ts = useTimeseries(subject?.id);
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
