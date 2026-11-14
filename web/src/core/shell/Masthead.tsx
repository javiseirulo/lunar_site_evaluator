/**
 * Portal masthead: wordmark + site finder, uppercase tab bar, and a status strip with the shared
 * state (selected site, data window, simulation clock).
 */
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { useData, useSelectedSite } from '../data';
import { MODES, modeForPath, pathForMode } from '../navigation';
import { formatUtc } from '../format';
import { Logo } from './Logo';

export function Masthead() {
  return (
    <header className="portal">
      <Banner />
      <TabBar />
      <StatusStrip />
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
  const tabs = [
    { to: '/', label: 'Home', end: true },
    ...MODES.map((m) => ({ to: pathForMode(m.id, selectedSiteId), label: m.label, end: false })),
    { to: '/about', label: 'Data & Method', end: false },
  ];
  return (
    <nav
      aria-label="Main"
      className="flex h-[30px] overflow-x-auto border border-black bg-black [scrollbar-width:none]"
    >
      {tabs.map((t) => (
        <NavLink key={t.label} to={t.to} end={t.end} className="tab">
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

function StatusStrip() {
  const isMock = useData((s) => s.isMock);
  const range = useData((s) => s.manifest?.time_range);
  const site = useSelectedSite();
  const selectSite = useAppStore((s) => s.selectSite);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);

  return (
    <div className="border-edge bg-navy-800 text-ink-muted flex min-h-[22px] flex-wrap items-center gap-x-4 gap-y-0.5 border border-t-0 px-2.5 py-0.5 text-[11px]">
      <span>
        <span className="label mr-1">Site:</span>
        {site ? (
          <>
            <span className="text-ink font-bold">{site.name}</span>{' '}
            <button type="button" className="lnk text-[10px]" onClick={() => selectSite(null)}>
              [clear]
            </button>
          </>
        ) : (
          <span>none selected</span>
        )}
      </span>
      {range && (
        <span className="hidden sm:inline">
          <span className="label mr-1">Data window:</span>
          <span className="num">
            {range.start_utc.slice(0, 10)} – {range.end_utc.slice(0, 10)}
          </span>
        </span>
      )}
      <span className="ml-auto flex items-center gap-3">
        {isMock && (
          <span
            className={cn('chip border-warn/60 text-warn bg-warn/10')}
            title="The app is showing invented placeholder data until the real pipeline output lands."
          >
            Mock data
          </span>
        )}
        <span>
          <span className="label mr-1">Sim time:</span>
          <span className="num text-ink">{formatUtc(currentTimeUTC)}</span>
        </span>
      </span>
    </div>
  );
}
