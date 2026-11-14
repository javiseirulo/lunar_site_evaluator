/**
 * Masthead: one line on the night page — mark, name, page links, site finder, Pro mode —
 * then a single sentence about the next sunrise or Earthrise.
 */
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { useData, useSelectedSite, useTimeseries } from '../data';
import { TABS, modeForPath, pathForMode } from '../navigation';
import { formatHours, formatUtc } from '../format';
import { dayOfWindow, friendlyHours } from '../metrics';
import { hoursUntilChange, sampleAt } from '../timeseries';
import { Logo } from './Logo';

export function Masthead() {
  return (
    <header className="portal">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to="/" className="mr-2 flex items-center gap-2.5" aria-label="Lunar Site Evaluator home">
          <Logo className="size-8 shrink-0" />
          <span className="font-display text-[20px] leading-none tracking-[-0.02em] text-[#f4f0e6]">
            Lunar Site Evaluator
          </span>
        </Link>
        <TabBar />
        <div className="ml-auto flex max-w-full flex-wrap items-center gap-x-4 gap-y-2">
          <SiteFinder />
          <ProSwitch />
        </div>
      </div>
      <NextUp />
    </header>
  );
}

/** Picks a site and opens it in Explore (or keeps the current mode). */
function SiteFinder() {
  const sites = useData((s) => s.sites);
  const selectSite = useAppStore((s) => s.selectSite);
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  if (!sites) return null;
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
      <label htmlFor="site-finder" className="text-[13px] text-[#b7b1a6]">
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
  return (
    <nav aria-label="Main" className="flex overflow-x-auto [scrollbar-width:none]">
      {TABS.map((t) => (
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

function ProSwitch() {
  const proMode = useAppStore((s) => s.proMode);
  const setProMode = useAppStore((s) => s.setProMode);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={proMode}
      onClick={() => setProMode(!proMode)}
      className="flex cursor-pointer items-center gap-2 text-[13px] text-[#d9d3c7]"
      title="Pro mode shows technical names, UTC times, coordinates and fine layer controls"
    >
      <span className="switch" data-on={proMode} aria-hidden />
      Pro mode
    </button>
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
  const toSun = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarth = ts?.earth_visible ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC) : null;
  const when = (h: number | null) =>
    h === null ? 'not in this window' : proMode ? `in ${formatHours(h)}` : `in ${friendlyHours(h)}`;
  const day = range ? dayOfWindow(currentTimeUTC, range.start_utc, range.end_utc) : null;

  return (
    <div className="flex flex-col gap-1 pt-3 pb-4 text-[13px] text-[#9c968b] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
      {subject && sample && (
        <p className="min-w-0 sm:flex-1">
          At <span className="text-[#f4f0e6]">{subject.name}</span>, the Sun{' '}
          {sample.lit ? 'sets' : 'rises'} {when(toSun)}
          {sample.earthVisible !== null && (
            <>
              {' '}
              and Earth {sample.earthVisible ? 'sets' : 'rises'} {when(toEarth)}
            </>
          )}
          .
        </p>
      )}
      <span className="ml-auto flex items-center gap-4">
        {isMock && (
          <span
            className="text-[#e2b15a]"
            title="The app is showing invented placeholder data until the real pipeline output lands."
          >
            Mock data
          </span>
        )}
        <span className="num text-[#d9d3c7]">
          {proMode ? formatUtc(currentTimeUTC) : day && `Day ${day.day} of ${day.total}`}
        </span>
      </span>
    </div>
  );
}
