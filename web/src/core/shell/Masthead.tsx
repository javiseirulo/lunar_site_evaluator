/**
 * Masthead: a document-style title row (logo, name, one-line purpose, site finder), the NASA-blue
 * tab band, and one plain sentence about what happens next at the selected site, with the day
 * counter and the Pro mode switch.
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
      <TitleRow />
      <TabBar />
      <NextUp />
    </header>
  );
}

function TitleRow() {
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-4">
      <Link to="/" className="flex items-center gap-3" aria-label="Lunar Site Evaluator home">
        <Logo className="size-11 shrink-0" />
        <span>
          <span className="text-heading block text-[24px] leading-tight font-medium tracking-[-0.015em]">
            Lunar Site Evaluator
          </span>
          <span className="text-ink-muted block text-[14px]">
            Compare landing sites near the Moon&apos;s south pole by sunlight and view of Earth
          </span>
        </span>
      </Link>
      <SiteFinder />
    </div>
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
      className="ml-auto flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        selectSite(value);
        const mode = modeForPath(window.location.pathname);
        if (mode === 'streetview') navigate(pathForMode('streetview', value));
        else if (mode !== 'explore') navigate('/explore');
      }}
    >
      <label htmlFor="site-finder" className="label">
        Find a site
      </label>
      <select
        id="site-finder"
        className="field w-48"
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
    <nav
      aria-label="Main"
      className="bg-violet flex h-[46px] overflow-x-auto rounded-t-[8px] px-2 pt-2 [scrollbar-width:none]"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.label}
          to={t.mode ? pathForMode(t.mode, selectedSiteId) : t.path}
          end={t.end}
          className="tab rounded-t-[6px]"
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
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
  const setProMode = useAppStore((s) => s.setProMode);

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
    <div className="bg-void text-ink-muted flex flex-wrap items-center gap-x-5 gap-y-1 pt-3 pb-1 text-[13px]">
      {subject && sample && (
        <p>
          At <span className="text-heading font-medium">{subject.name}</span>, the Sun{' '}
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
      <span className="ml-auto flex items-center gap-5">
        {isMock && (
          <span
            className="text-warn"
            title="The app is showing invented placeholder data until the real pipeline output lands."
          >
            Mock data
          </span>
        )}
        <span className="text-ink num">
          {proMode ? formatUtc(currentTimeUTC) : day && `Day ${day.day} of ${day.total}`}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={proMode}
          onClick={() => setProMode(!proMode)}
          className="text-ink flex cursor-pointer items-center gap-2"
          title="Pro mode shows technical names, UTC times, coordinates and fine layer controls"
        >
          <span className="switch" data-on={proMode} aria-hidden />
          Pro mode
        </button>
      </span>
    </div>
  );
}
