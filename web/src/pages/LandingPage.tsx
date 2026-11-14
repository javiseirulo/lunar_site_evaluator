import { Link, useNavigate } from 'react-router';
import { Globe, List, Mountain, Scale, Snowflake, Sun } from 'lucide-react';
import type { Site } from '@lunar/contracts';
import { pct, useAppStore, useData } from '@/core';
import { PolarMap, scoreColor } from '@/layers';

/** Front page laid out like a mid-2000s science portal: feature story + topic tiles, bulletins + facts. */
export function LandingPage() {
  const sites = useData((s) => s.sites);
  const manifest = useData((s) => s.manifest);
  const ranked = sites ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score) : [];
  const top = ranked[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="box">
          <div className="box-head">Welcome</div>
          <div className="box-body">
            <h1 className="text-[22px] leading-tight font-bold text-white">
              Where should the next lander touch down?
            </h1>
            <p className="text-ink-muted mt-2 max-w-[58ch] text-[13px]">
              Compare candidate landing sites near the lunar south pole by how much{' '}
              <b className="text-sun">sunlight</b> they get for power and how often{' '}
              <b className="text-earth">Earth</b> is above the horizon for direct communications.
            </p>
            {top && <FeaturedSite site={top} />}
          </div>
        </section>

        <TopicTiles />
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
        {ranked.length > 0 && (
          <Bulletins sites={ranked.slice(0, 4)} start={manifest?.time_range.start_utc} />
        )}
        <section className="box self-start">
          <div className="box-head">Quick Facts</div>
          <table className="w-full text-[12px]">
            <tbody className="rows">
              <Fact label="Candidate sites" value={sites ? String(sites.length) : '…'} />
              <Fact
                label="Pass filters"
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
                label="Data status"
                value={manifest ? (manifest.mock ? 'Mock' : 'Real') : '…'}
                warn={manifest?.mock}
              />
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <tr>
      <th className="text-ink-muted px-4 py-2 text-left font-normal">{label}</th>
      <td className={`num px-4 py-2 text-right font-bold ${warn ? 'text-warn' : 'text-ink'}`}>
        {value}
      </td>
    </tr>
  );
}

/** 2007-style grid of square topic tiles. Map topics open Explore with that layer switched on. */
function TopicTiles() {
  const navigate = useNavigate();
  const setLayerActive = useAppStore((s) => s.setLayerActive);
  const openLayer = (layerId: string) => {
    setLayerActive(layerId, true);
    navigate('/explore');
  };
  const tiles = [
    { label: 'Sunlight', Icon: Sun, color: 'text-sun', go: () => openLayer('illumination') },
    { label: 'Earth View', Icon: Globe, color: 'text-earth', go: () => navigate('/learn#earth') },
    { label: 'Terrain & Slope', Icon: Mountain, color: 'text-white', go: () => openLayer('slope') },
    { label: 'Shadowed Craters', Icon: Snowflake, color: 'text-psr', go: () => openLayer('psr') },
    { label: 'Compare Sites', Icon: Scale, color: 'text-white', go: () => navigate('/compare') },
    { label: 'Site Directory', Icon: List, color: 'text-white', go: () => navigate('/sites') },
  ];
  return (
    <section className="box self-start">
      <div className="box-head">Topics</div>
      <div className="grid grid-cols-2 gap-px bg-black p-px">
        {tiles.map(({ label, Icon, color, go }) => (
          <button
            key={label}
            type="button"
            onClick={go}
            className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 text-center"
            style={{ background: 'linear-gradient(#1b3a6e 0%, #102750 55%, #0a1a38 100%)' }}
          >
            <Icon
              className={`size-8 ${color} drop-shadow-[0_1px_0_#000] group-hover:scale-110`}
              aria-hidden
            />
            <span className="font-head group-hover:text-link-hover text-[10.5px] font-bold tracking-[0.06em] text-white uppercase">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
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
    <div className="border-edge bg-navy-950 mt-4 flex flex-col gap-4 border p-3 sm:flex-row">
      <div
        className="pointer-events-none aspect-square w-full shrink-0 bg-black sm:w-[180px]"
        aria-hidden
      >
        <PolarMap className="size-full" />
      </div>
      <div className="min-w-0">
        <p className="label text-accent">Site of the day · top score</p>
        <h2 className="mt-1 text-[17px] font-bold text-white">{site.name}</h2>
        <p className="text-ink-muted mt-1.5">
          Sunlit <b className="text-sun">{pct(site.metrics.illum_pct)}</b> of the time, Earth in
          view <b className="text-earth">{pct(site.metrics.earth_vis_pct)}</b>, longest night{' '}
          {site.metrics.max_dark_hours} h.
        </p>
        <p className="mt-3 flex items-center gap-3">
          <span
            className="num border border-black px-1.5 font-bold text-black"
            style={{ background: scoreColor(site.score) }}
          >
            Score {Math.round(site.score * 100)}
          </span>
          <button type="button" className="lnk more" onClick={() => openSite(site.id)}>
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
        <Link
          to="/sites"
          className="ml-auto font-sans font-normal tracking-normal normal-case underline"
        >
          all sites
        </Link>
      </div>
      <ul className="rows">
        {sites.map((s) => (
          <li key={s.id} className="px-4 py-2.5">
            <span className="num text-accent mr-2 font-bold">{stamp}</span>
            <button type="button" className="lnk font-bold" onClick={() => openSite(s.id)}>
              {s.name}
            </button>
            <p className="text-ink-muted mt-0.5">
              Sunlit {pct(s.metrics.illum_pct)}, Earth in view {pct(s.metrics.earth_vis_pct)},
              longest night {s.metrics.max_dark_hours} h.{' '}
              <button type="button" className="lnk more" onClick={() => openSite(s.id)}>
                Read more
              </button>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
