/**
 * Portal masthead in the style of mid-2000s science portals: wordmark + site finder, uppercase tab
 * bar, audience shortcuts ("For Educators" …) and an EVENTS strip with the next sunrise/sunset and
 * Earthrise/Earthset at a site, plus the shared simulation clock.
 */
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { useData, useSelectedSite, useTimeseries } from '../data';
import { AUDIENCES, TABS, modeForPath, pathForMode } from '../navigation';
import { formatHours, formatUtc } from '../format';
import { hoursUntilChange, sampleAt } from '../timeseries';
import { Logo } from './Logo';

export function Masthead() {
  return (
    <header className="portal">
      <Banner />
      <TabBar />
      <AudienceBar />
      <EventsStrip />
    </header>
  );
}

function Banner() {
  return (
    <div
      className="border-edge flex flex-wrap items-center gap-x-6 gap-y-2 border border-b-0 px-3 py-2"
      style={{
        background:
          'radial-gradient(ellipse 60% 140% at 0% 50%, #1d3f7a 0%, transparent 70%), linear-gradient(#0c1c3a, #050d1f)',
      }}
    >
      <Link to="/" className="flex items-center gap-2.5" aria-label="Lunar Site Evaluator home">
        <Logo className="size-11 shrink-0" />
        <span className="leading-none">
          <span className="font-head block text-[22px] font-bold tracking-[0.04em] text-white uppercase [text-shadow:0_1px_0_#000]">
            Lunar Site Evaluator
          </span>
          <span className="text-ink-muted mt-1 block text-[10px] tracking-[0.12em] uppercase">
            South Pole Landing Sites · Sunlight &amp; Earth Visibility
          </span>
        </span>
      </Link>
      <SiteFinder />
    </div>
  );
}

/** "Find a site" box: picks a site and opens it in Explore (or the current mode). */
function SiteFinder() {
  const sites = useData((s) => s.sites);
  const selectSite = useAppStore((s) => s.selectSite);
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  if (!sites) return null;
  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form
      className="ml-auto flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        selectSite(value);
        const mode = modeForPath(window.location.pathname);
        if (mode === 'streetview') navigate(pathForMode('streetview', value));
        else if (mode !== 'explore') navigate('/explore');
      }}
    >
      <label htmlFor="site-finder" className="label text-ink-muted">
        Find a site
      </label>
      <select
        id="site-finder"
        className="field w-44"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">Choose…</option>
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="submit" className="btn" disabled={!value}>
        Go
      </button>
    </form>
  );
}

function TabBar() {
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  return (
    <nav
      aria-label="Main"
      className="flex h-[32px] overflow-x-auto border border-black bg-black [scrollbar-width:none]"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.label}
          to={t.mode ? pathForMode(t.mode, selectedSiteId) : t.path}
          end={t.end}
          className="tab px-[13px]"
        >
          {t.label}
        </NavLink>
      ))}
      <div
        className="flex-1"
        style={{
          background: 'linear-gradient(#2b2f38 0%, #191c22 50%, #0b0d10 51%, #050608 100%)',
        }}
      />
    </nav>
  );
}

function AudienceBar() {
  return (
    <div className="border-edge flex flex-wrap items-center gap-x-1 border-x bg-[#c9d4e6] px-3 py-1 text-[11px] text-[#10213f]">
      {AUDIENCES.map((a, i) => (
        <span key={a.label} className="whitespace-nowrap">
          {i > 0 && <span className="mx-1.5 text-[#6b7fa3]">|</span>}
          <Link to={a.path} className="font-bold hover:underline">
            {a.label}
          </Link>
        </span>
      ))}
    </div>
  );
}

/** "EVENTS ◄ ►": next sunrise/sunset and Earthrise/Earthset at the selected (or a top) site. */
function EventsStrip() {
  const sites = useData((s) => s.sites);
  const isMock = useData((s) => s.isMock);
  const selected = useSelectedSite();
  const selectSite = useAppStore((s) => s.selectSite);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(0);

  const ranked = sites ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score) : [];
  const subject =
    selected ?? ranked[((cursor % ranked.length) + ranked.length) % ranked.length] ?? null;
  const ts = useTimeseries(subject?.id);
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSun = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarth = ts?.earth_visible ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC) : null;
  const when = (h: number | null) => (h === null ? 'after this window' : `in ${formatHours(h)}`);

  return (
    <div className="border-edge bg-navy-800 flex min-h-[26px] flex-wrap items-center gap-x-3 gap-y-1 border border-t-0 px-3 py-1 text-[11px]">
      <span className="font-head text-ink font-bold tracking-[0.08em] uppercase">Events:</span>
      {!selected && ranked.length > 1 && (
        <span className="flex gap-px">
          <button
            type="button"
            className="btn h-[16px] w-[16px] px-0 text-[8px]"
            onClick={() => setCursor((c) => c - 1)}
            aria-label="Previous site"
          >
            ◄
          </button>
          <button
            type="button"
            className="btn h-[16px] w-[16px] px-0 text-[8px]"
            onClick={() => setCursor((c) => c + 1)}
            aria-label="Next site"
          >
            ►
          </button>
        </span>
      )}
      {subject ? (
        <span className="text-ink-muted">
          <button
            type="button"
            className="lnk font-bold"
            onClick={() => {
              selectSite(subject.id);
              if (!modeForPath(window.location.pathname)) navigate('/explore');
            }}
          >
            {subject.name}
          </button>
          {sample && (
            <>
              {' '}
              — <span className="text-sun">{sample.lit ? 'Sunset' : 'Sunrise'}</span> {when(toSun)}
              {sample.earthVisible !== null && (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-earth">
                    {sample.earthVisible ? 'Earthset' : 'Earthrise'}
                  </span>{' '}
                  {when(toEarth)}
                </>
              )}
            </>
          )}
          {selected && (
            <>
              {' '}
              <button type="button" className="lnk text-[10px]" onClick={() => selectSite(null)}>
                [clear]
              </button>
            </>
          )}
        </span>
      ) : (
        <span className="text-ink-muted">Loading…</span>
      )}
      <span className="ml-auto flex items-center gap-3">
        {isMock && (
          <span
            className="chip border-warn/60 text-warn bg-warn/10"
            title="The app is showing invented placeholder data until the real pipeline output lands."
          >
            Mock data
          </span>
        )}
        <span className="text-ink-muted">
          <span className="label mr-1">Sim time</span>
          <span className="num text-ink">{formatUtc(currentTimeUTC)}</span>
        </span>
      </span>
    </div>
  );
}
