import { Link, useNavigate } from 'react-router';
import { Compass, Mountain, Rocket } from 'lucide-react';
import type { AppMode, Site } from '@lunar/contracts';
import { MODES, pathForMode, pct, useAppStore, useData } from '@/core';
import { PolarMap, scoreColor } from '@/layers';

const ICONS: Record<AppMode, typeof Compass> = {
  explore: Compass,
  streetview: Mountain,
  game: Rocket,
};

/** Front page laid out like a 2000s portal: feature story, quick facts, mode tiles, bulletins. */
export function LandingPage() {
  const sites = useData((s) => s.sites);
  const manifest = useData((s) => s.manifest);
  const ranked = sites ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score) : [];
  const top = ranked[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="box">
          <div className="box-head">Welcome</div>
          <div className="box-body">
            <h1 className="text-[20px] leading-tight font-bold text-white">
              Where should the next lander touch down?
            </h1>
            <p className="text-ink-muted mt-1.5 max-w-[60ch]">
              Compare candidate landing sites near the lunar south pole by how much{' '}
              <b className="text-sun">sunlight</b> they get for power and how often{' '}
              <b className="text-earth">Earth</b> is above the horizon for direct communications,
              and see how both change from one day to the next.
            </p>
            {top && <FeaturedSite site={top} />}
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <section className="box">
            <div className="box-head">Quick Facts</div>
            <table className="w-full text-[11px]">
              <tbody className="rows">
                <Fact label="Candidate sites" value={sites ? String(sites.length) : '…'} />
                <Fact
                  label="Pass hard filters"
                  value={sites ? String(sites.filter((s) => s.valid).length) : '…'}
                />
                <Fact
                  label="Data window"
                  value={
                    manifest
                      ? `${manifest.time_range.start_utc.slice(0, 10)} – ${manifest.time_range.end_utc.slice(5, 10)}`
                      : '…'
                  }
                />
                <Fact
                  label="Time step"
                  value={manifest ? `${manifest.time_range.step_s / 3600} h` : '…'}
                />
                <Fact
                  label="Data status"
                  value={
                    manifest ? (manifest.mock ? 'Mock (development)' : 'Pipeline output') : '…'
                  }
                  warn={manifest?.mock}
                />
              </tbody>
            </table>
          </section>
          <section className="box">
            <div className="box-head-dark">Why the south pole?</div>
            <p className="box-body text-ink-muted text-[11px]">
              Near the pole the Sun skims the horizon, so a few hundred metres of height or a few
              days of date can decide whether a lander has power — and whether it can see Earth to
              call home.{' '}
              <Link to="/about" className="lnk more">
                Data &amp; method
              </Link>
            </p>
          </section>
        </div>
      </div>

      <section aria-label="Modes" className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => {
          const Icon = ICONS[m.id];
          return (
            <Link
              key={m.id}
              to={pathForMode(m.id)}
              className="box group flex gap-2.5 p-2.5 hover:border-edge-hi"
            >
              <span
                className="flex size-12 shrink-0 items-center justify-center border border-black"
                style={{
                  background: 'linear-gradient(#5b8fd8 0%, #3567b4 48%, #24529a 52%, #1d4583 100%)',
                  boxShadow: 'inset 1px 1px 0 #ffffff40',
                }}
              >
                <Icon className="size-6 text-white" aria-hidden />
              </span>
              <span>
                <span className="font-head block text-[13px] font-bold tracking-[0.04em] text-white uppercase group-hover:text-link-hover">
                  {m.label}
                </span>
                <span className="text-ink-muted mt-0.5 block text-[11px]">{m.blurb}</span>
                <span className="lnk more mt-1 block text-[11px]">Open {m.label}</span>
              </span>
            </Link>
          );
        })}
      </section>

      {ranked.length > 0 && (
        <Bulletins sites={ranked.slice(0, 6)} start={manifest?.time_range.start_utc} />
      )}
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <tr>
      <th className="text-ink-muted px-2.5 py-1 text-left font-normal">{label}</th>
      <td className={`num px-2.5 py-1 text-right font-bold ${warn ? 'text-warn' : 'text-ink'}`}>
        {value}
      </td>
    </tr>
  );
}

function useOpenSite() {
  const selectSite = useAppStore((s) => s.selectSite);
  const navigate = useNavigate();
  return (id: string) => {
    selectSite(id);
    navigate('/explore');
  };
}

function FeaturedSite({ site }: { site: Site }) {
  const openSite = useOpenSite();
  return (
    <div className="border-edge bg-navy-950 mt-3 flex flex-col gap-3 border p-2 sm:flex-row">
      <div
        className="pointer-events-none aspect-square w-full shrink-0 bg-black sm:w-[170px]"
        aria-hidden
      >
        <PolarMap className="size-full" />
      </div>
      <div className="min-w-0">
        <p className="label text-accent">Featured site · top score</p>
        <h2 className="mt-0.5 text-[16px] font-bold text-white">{site.name}</h2>
        <p className="text-ink-muted mt-1 text-[11px]">
          With the default weights, {site.name} ranks first among the sites that pass every hard
          filter: sunlit <b className="text-sun">{pct(site.metrics.illum_pct)}</b> of the time,
          Earth in view <b className="text-earth">{pct(site.metrics.earth_vis_pct)}</b>, a{' '}
          {site.metrics.slope_deg.toFixed(1)}° slope and a longest night of{' '}
          {site.metrics.max_dark_hours} h.
        </p>
        <p className="mt-2 flex items-center gap-2">
          <span
            className="num border border-black px-1.5 text-[11px] font-bold text-black"
            style={{ background: scoreColor(site.score) }}
          >
            Score {Math.round(site.score * 100)}
          </span>
          <button type="button" className="lnk more text-[11px]" onClick={() => openSite(site.id)}>
            Explore this site
          </button>
        </p>
      </div>
    </div>
  );
}

function Bulletins({ sites, start }: { sites: Site[]; start?: string }) {
  const openSite = useOpenSite();
  const stamp = start ? `${start.slice(5, 7)}.${start.slice(8, 10)}.${start.slice(2, 4)}` : ''; // MM.DD.YY
  return (
    <section className="box">
      <div className="box-head">
        Site Bulletins
        <span className="ml-auto font-sans font-normal tracking-normal normal-case">
          top {sites.length} by score
        </span>
      </div>
      <ul className="rows">
        {sites.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-baseline gap-x-2 px-2.5 py-1.5 text-[11px]"
          >
            <span className="num text-accent font-bold">{stamp}</span>
            <button type="button" className="lnk font-bold" onClick={() => openSite(s.id)}>
              {s.name}
            </button>
            <span className="text-ink-muted">
              — sunlit {pct(s.metrics.illum_pct)}, Earth in view {pct(s.metrics.earth_vis_pct)},
              longest night {s.metrics.max_dark_hours} h, slope {s.metrics.slope_deg.toFixed(1)}°.
            </span>
            <button type="button" className="lnk more ml-auto" onClick={() => openSite(s.id)}>
              Details
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
