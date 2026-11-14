/**
 * Masthead: banner (logo, title, retro sun, site finder), five equal tabs, and — on every page but
 * Home — one slim info line (audience links, next sunrise/Earthset, day counter, Pro mode).
 */
import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { useData, useSelectedSite, useTimeseries } from '../data';
import { AUDIENCES, TABS, modeForPath, pathForMode } from '../navigation';
import { formatHours, formatUtc } from '../format';
import { dayOfWindow, friendlyHours } from '../metrics';
import { hoursUntilChange, sampleAt } from '../timeseries';
import { Logo } from './Logo';

export function Masthead() {
  const { pathname } = useLocation();
  return (
    <header className="portal border-violet/60 overflow-hidden rounded-[8px] border bg-[#07040f] shadow-[var(--shadow-card)]">
      <Banner />
      <TabBar />
      {pathname !== '/' && <InfoStrip />}
    </header>
  );
}

/** Striped retro sun with a few sparkles (original synthwave motif). */
function RetroSun() {
  const sparkle = (cx: number, cy: number, r: number) => (
    <g stroke="#ffe3f3" strokeWidth={r / 5} strokeLinecap="round">
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
    </g>
  );
  return (
    <svg
      className="pointer-events-none absolute bottom-0 left-[56%] hidden h-[88%] -translate-x-1/2 md:block"
      viewBox="0 0 200 84"
      aria-hidden
    >
      <defs>
        <linearGradient id="retro-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="0.5" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff3fa4" />
        </linearGradient>
        <clipPath id="sun-stripes">
          <rect x="0" y="0" width="200" height="50" />
          <rect x="0" y="54" width="200" height="7" />
          <rect x="0" y="65" width="200" height="6" />
          <rect x="0" y="75" width="200" height="5" />
        </clipPath>
        <filter id="sun-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <circle cx="100" cy="84" r="62" fill="#ff3fa4" opacity="0.35" filter="url(#sun-glow)" />
      <circle cx="100" cy="84" r="60" fill="url(#retro-sun)" clipPath="url(#sun-stripes)" />
      {sparkle(24, 22, 5)}
      {sparkle(182, 12, 4)}
      <circle cx="50" cy="8" r="1.4" fill="#ffe3f3" />
    </svg>
  );
}

function Banner() {
  return (
    <div className="space border-pink/70 relative flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-5 py-4">
      <RetroSun />
      <Link
        to="/"
        className="relative flex items-center gap-3"
        aria-label="Lunar Site Evaluator home"
      >
        <Logo className="size-16 shrink-0 drop-shadow-[0_0_10px_#ff3fa4aa]" />
        <span className="leading-tight">
          <span className="block bg-gradient-to-r from-[#ff6fb5] to-[#ff8a3d] bg-clip-text text-[28px] font-black tracking-[-0.01em] text-transparent italic drop-shadow-[0_0_10px_#ff3fa460]">
            Lunar Site Evaluator
          </span>
          <span className="text-ink block text-[13.5px]">
            Find a safe, sunny place to land near the Moon&apos;s south pole
          </span>
        </span>
      </Link>
      <SiteFinder />
    </div>
  );
}

/** "Find a site": picks a site and opens it in Explore (or the current mode). */
function SiteFinder() {
  const sites = useData((s) => s.sites);
  const selectSite = useAppStore((s) => s.selectSite);
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  if (!sites) return null;
  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form
      className="border-edge-hi relative ml-auto flex flex-col gap-1 rounded-[8px] border bg-[#120a22]/90 px-3 py-2 shadow-[0_0_16px_-6px_#9b5cffaa]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        selectSite(value);
        const mode = modeForPath(window.location.pathname);
        if (mode === 'streetview') navigate(pathForMode('streetview', value));
        else if (mode !== 'explore') navigate('/explore');
      }}
    >
      <label htmlFor="site-finder" className="text-ink text-[13px]">
        Find a site
      </label>
      <span className="flex gap-2">
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
        <button type="submit" className="btn btn-go" disabled={!value}>
          Go
        </button>
      </span>
    </form>
  );
}

function TabBar() {
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  return (
    <nav aria-label="Main" className="flex h-[44px] overflow-x-auto [scrollbar-width:none]">
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

/** One slim line: audience links | next sunrise / Earthset, day counter, mock badge, Pro mode. */
function InfoStrip() {
  const sites = useData((s) => s.sites);
  const isMock = useData((s) => s.isMock);
  const range = useData((s) => s.manifest?.time_range);
  const selected = useSelectedSite();
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const proMode = useAppStore((s) => s.proMode);
  const setProMode = useAppStore((s) => s.setProMode);
  const [cursor, setCursor] = useState(0);

  const ranked = sites ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score) : [];
  const subject =
    selected ?? ranked[((cursor % ranked.length) + ranked.length) % ranked.length] ?? null;
  const ts = useTimeseries(subject?.id);
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSun = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarth = ts?.earth_visible ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC) : null;
  const when = (h: number | null) =>
    h === null ? 'later' : proMode ? `in ${formatHours(h)}` : `in ${friendlyHours(h)}`;
  const day = range ? dayOfWindow(currentTimeUTC, range.start_utc, range.end_utc) : null;

  return (
    <div className="border-edge text-ink-muted flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t bg-[#0e0820] px-4 py-1.5 text-[11.5px]">
      <span className="hidden lg:inline">
        For:{' '}
        {AUDIENCES.map((a, i) => (
          <span key={a.label}>
            {i > 0 && <span className="text-edge-hi mx-1">|</span>}
            <Link to={a.path} className="hover:text-link-hover transition-colors">
              {a.label.replace('For ', '')}
            </Link>
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1.5 lg:ml-auto">
        <span className="text-pink font-bold">Coming up</span>
        {!selected && ranked.length > 1 && (
          <>
            <button
              type="button"
              className="hover:text-white"
              onClick={() => setCursor((c) => c - 1)}
              aria-label="Previous site"
            >
              ◄
            </button>
            <button
              type="button"
              className="hover:text-white"
              onClick={() => setCursor((c) => c + 1)}
              aria-label="Next site"
            >
              ►
            </button>
          </>
        )}
        {subject && (
          <span>
            <span className="text-ink">{subject.name}</span>
            {sample && (
              <>
                {' — '}
                {sample.lit ? 'sunset' : 'sunrise'} {when(toSun)}
                {sample.earthVisible !== null && (
                  <>
                    {' · '}
                    {sample.earthVisible ? 'Earthset' : 'Earthrise'} {when(toEarth)}
                  </>
                )}
              </>
            )}
          </span>
        )}
      </span>
      {isMock && (
        <span
          className="chip border-warn/50 text-warn"
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
        className="text-ink flex cursor-pointer items-center gap-1.5"
        title="Pro mode shows technical names, UTC times, coordinates and fine layer controls"
      >
        <span className="switch" data-on={proMode} aria-hidden />
        Pro mode
      </button>
    </div>
  );
}
