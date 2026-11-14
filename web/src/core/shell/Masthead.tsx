/**
 * Masthead: poster-style banner with wordmark + site finder, tab bar, audience shortcuts and an
 * EVENTS strip (next sunrise/sunset and Earthrise/Earthset, simulation day, Pro mode switch).
 */
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAppStore } from '../store';
import { useData, useSelectedSite, useTimeseries } from '../data';
import { AUDIENCES, TABS, modeForPath, pathForMode } from '../navigation';
import { formatHours, formatUtc } from '../format';
import { dayOfWindow, friendlyHours } from '../metrics';
import { hoursUntilChange, sampleAt } from '../timeseries';
import { Logo } from './Logo';

export function Masthead() {
  return (
    <header className="portal border-edge-hi overflow-hidden rounded-[6px] border shadow-[var(--shadow-card)]">
      <Banner />
      <TabBar />
      <AudienceBar />
      <EventsStrip />
    </header>
  );
}

/** Decorative retro sun and sparkles on the banner's right side (synthwave motif, original art). */
function Starbursts() {
  const sparkle = (cx: number, cy: number, r: number) => (
    <g stroke="#ffe3f3" strokeWidth={r / 6} strokeLinecap="round">
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} />
    </g>
  );
  return (
    <svg
      className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[420px] sm:block"
      viewBox="0 0 420 96"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="retro-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="0.55" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff3fa4" />
        </linearGradient>
        <clipPath id="sun-stripes">
          <rect x="0" y="0" width="420" height="58" />
          <rect x="0" y="61" width="420" height="5" />
          <rect x="0" y="69" width="420" height="4" />
          <rect x="0" y="76" width="420" height="3" />
        </clipPath>
      </defs>
      <circle
        cx="350"
        cy="74"
        r="40"
        fill="url(#retro-sun)"
        clipPath="url(#sun-stripes)"
        opacity="0.9"
      />
      {sparkle(268, 22, 6)}
      {sparkle(404, 18, 4)}
      {sparkle(300, 52, 3)}
      <circle cx="232" cy="40" r="1.5" fill="#ffe3f3" />
      <circle cx="388" cy="40" r="1.2" fill="#ffe3f3" />
    </svg>
  );
}

function Banner() {
  return (
    <div className="space relative flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
      <Starbursts />
      <Link
        to="/"
        className="relative flex items-center gap-3"
        aria-label="Lunar Site Evaluator home"
      >
        <Logo className="size-14 shrink-0 drop-shadow-[0_0_10px_#ff3fa4aa]" />
        <span className="leading-none">
          <span className="display block bg-gradient-to-b from-[#ffe3f3] via-[#ff7cc4] to-[#ff8a3d] bg-clip-text text-[26px] tracking-[0.02em] text-transparent italic drop-shadow-[0_0_10px_#ff3fa480]">
            Lunar Site Evaluator
          </span>
          <span className="text-ink-muted mt-1.5 block text-[11.5px] font-bold tracking-[0.14em] uppercase">
            Find a safe, sunny place to land near the Moon&apos;s south pole
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
      className="bg-panel/85 border-edge-hi relative ml-auto flex items-center gap-2 rounded-[6px] border px-2.5 py-2 shadow-[0_0_18px_-6px_#9b5cffaa] backdrop-blur-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        selectSite(value);
        const mode = modeForPath(window.location.pathname);
        if (mode === 'streetview') navigate(pathForMode('streetview', value));
        else if (mode !== 'explore') navigate('/explore');
      }}
    >
      <label htmlFor="site-finder" className="label text-violet-light">
        Find a site
      </label>
      <select
        id="site-finder"
        className="field w-44"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">Choose a site…</option>
        {sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-go" disabled={!value}>
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
      className="bg-night flex h-[36px] overflow-x-auto [scrollbar-width:none]"
    >
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

function AudienceBar() {
  return (
    <div className="bg-panel-3 border-edge text-ink flex flex-wrap items-center gap-x-1 border-b px-4 py-1.5 text-[12.5px]">
      {AUDIENCES.map((a, i) => (
        <span key={a.label} className="whitespace-nowrap">
          {i > 0 && <span className="text-edge-lo mx-2">|</span>}
          <Link to={a.path} className="hover:text-link-hover font-extrabold transition-colors">
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
  const range = useData((s) => s.manifest?.time_range);
  const selected = useSelectedSite();
  const selectSite = useAppStore((s) => s.selectSite);
  const currentTimeUTC = useAppStore((s) => s.currentTimeUTC);
  const proMode = useAppStore((s) => s.proMode);
  const setProMode = useAppStore((s) => s.setProMode);
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(0);

  const ranked = sites ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score) : [];
  const subject =
    selected ?? ranked[((cursor % ranked.length) + ranked.length) % ranked.length] ?? null;
  const ts = useTimeseries(subject?.id);
  const sample = ts ? sampleAt(ts, currentTimeUTC) : null;
  const toSun = ts ? hoursUntilChange(ts, ts.lit, currentTimeUTC) : null;
  const toEarth = ts?.earth_visible ? hoursUntilChange(ts, ts.earth_visible, currentTimeUTC) : null;
  const when = (h: number | null) =>
    h === null ? 'not in this window' : proMode ? `in ${formatHours(h)}` : `in ${friendlyHours(h)}`;
  const day = range ? dayOfWindow(currentTimeUTC, range.start_utc, range.end_utc) : null;

  return (
    <div className="bg-panel flex min-h-[34px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-[12.5px]">
      <span className="text-pink text-[12px] font-extrabold tracking-[0.12em] uppercase [text-shadow:0_0_8px_#ff3fa4aa]">
        Coming up
      </span>
      {!selected && ranked.length > 1 && (
        <span className="flex gap-1">
          <button
            type="button"
            className="btn btn-quiet h-[22px] w-[22px] px-0 text-[9px]"
            onClick={() => setCursor((c) => c - 1)}
            aria-label="Previous site"
          >
            ◄
          </button>
          <button
            type="button"
            className="btn btn-quiet h-[22px] w-[22px] px-0 text-[9px]"
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
            className="lnk"
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
              — <b className="text-sun">{sample.lit ? 'sunset' : 'sunrise'}</b> {when(toSun)}
              {sample.earthVisible !== null && (
                <>
                  {' · '}
                  <b className="text-earth">
                    {sample.earthVisible ? 'Earthset' : 'Earthrise'}
                  </b>{' '}
                  {when(toEarth)}
                </>
              )}
            </>
          )}
          {selected && (
            <>
              {' '}
              <button type="button" className="lnk text-[11px]" onClick={() => selectSite(null)}>
                clear
              </button>
            </>
          )}
        </span>
      ) : (
        <span className="text-ink-muted">Loading…</span>
      )}
      <span className="ml-auto flex items-center gap-4">
        {isMock && (
          <span
            className="chip border-warn/50 text-warn bg-warn/10"
            title="The app is showing invented placeholder data until the real pipeline output lands."
          >
            Mock data
          </span>
        )}
        <span className="text-ink-muted">
          {proMode ? (
            <>
              <span className="label mr-1">Sim time</span>
              <span className="num text-ink font-bold">{formatUtc(currentTimeUTC)}</span>
            </>
          ) : (
            day && (
              <b className="text-ink num">
                Day {day.day} of {day.total}
              </b>
            )
          )}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={proMode}
          onClick={() => setProMode(!proMode)}
          className="flex cursor-pointer items-center gap-1.5 font-bold"
          title="Pro mode shows technical names, UTC times, coordinates and fine layer controls"
        >
          <span className="switch" data-on={proMode} aria-hidden />
          Pro mode
        </button>
      </span>
    </div>
  );
}
