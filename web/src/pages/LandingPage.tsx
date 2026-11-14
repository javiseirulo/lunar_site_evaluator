import { Link, useNavigate } from 'react-router';
import { Globe, List, MapPin, Mountain, Play, Scale, Snowflake, Sun } from 'lucide-react';
import type { Site } from '@lunar/contracts';
import { pct, useAppStore, useData, verdictFor } from '@/core';
import { PolarMap, scoreColor } from '@/layers';

/** Front page: welcome + featured site, topic tiles, "How it works", bulletins and quick facts. */
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
            <h1 className="display text-[24px] leading-tight">
              Where should the next lander{' '}
              <span className="bg-gradient-to-r from-[#ff7cc4] to-[#ff8a3d] bg-clip-text text-transparent">
                touch down?
              </span>
            </h1>
            <p className="text-ink-muted mt-2 max-w-[58ch] text-[14px]">
              Near the Moon&apos;s south pole the Sun skims the horizon. Find a spot with plenty of{' '}
              <b className="text-sun">sunlight</b> for power and a clear view of{' '}
              <b className="text-earth">Earth</b> to call home.
            </p>
            {top && <FeaturedSite site={top} />}
          </div>
        </section>

        <TopicTiles />
      </div>

      <HowItWorks />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_300px]">
        {ranked.length > 0 && <Bulletins sites={ranked.slice(0, 4)} />}
        <section className="box self-start">
          <div className="box-head">Quick Facts</div>
          <table className="w-full text-[13px]">
            <tbody className="rows">
              <Fact label="Candidate sites" value={sites ? String(sites.length) : '…'} />
              <Fact
                label="Safe to land"
                value={sites ? String(sites.filter((s) => s.valid).length) : '…'}
              />
              <Fact
                label="Days simulated"
                value={
                  manifest
                    ? String(
                        Math.round(
                          (Date.parse(manifest.time_range.end_utc) -
                            Date.parse(manifest.time_range.start_utc)) /
                            86_400_000,
                        ),
                      )
                    : '…'
                }
              />
              <Fact
                label="Data"
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
      <th className="text-ink-muted px-4 py-2 text-left font-semibold">{label}</th>
      <td
        className={`num px-4 py-2 text-right font-extrabold ${warn ? 'text-warn' : 'text-heading'}`}
      >
        {value}
      </td>
    </tr>
  );
}

const STEPS = [
  { Icon: MapPin, title: 'Pick a spot', text: 'Click a diamond on the Moon map.', to: '/explore' },
  {
    Icon: Play,
    title: 'Press Play',
    text: 'Watch the days go by. When does it get dark?',
    to: '/explore',
  },
  {
    Icon: Scale,
    title: 'Compare picks',
    text: 'Put two or three spots side by side.',
    to: '/compare',
  },
];

function HowItWorks() {
  return (
    <section className="box">
      <div className="box-head-dark">How It Works</div>
      <ol className="grid gap-3 p-3 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, text, to }, i) => (
          <li key={title}>
            <Link
              to={to}
              className="lift bg-panel-2 border-edge group flex h-full gap-3 rounded-[6px] border p-3"
            >
              <span className="display bg-pink flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] text-white shadow-[0_0_14px_-2px_#ff3fa4]">
                {i + 1}
              </span>
              <span>
                <b className="text-heading flex items-center gap-1.5 text-[14px]">
                  <Icon className="text-violet-light size-4" aria-hidden />
                  {title}
                </b>
                <span className="text-ink-muted text-[13px]">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Grid of topic tiles. Map topics open Explore with that layer switched on. */
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
    {
      label: 'Terrain & Slope',
      Icon: Mountain,
      color: 'text-glow',
      go: () => openLayer('slope'),
    },
    { label: 'Icy Craters', Icon: Snowflake, color: 'text-psr', go: () => openLayer('psr') },
    { label: 'Compare', Icon: Scale, color: 'text-pink', go: () => navigate('/compare') },
    { label: 'All Sites', Icon: List, color: 'text-violet-light', go: () => navigate('/sites') },
  ];
  return (
    <section className="box self-start">
      <div className="box-head">Topics</div>
      <div className="grid grid-cols-2 gap-2 p-2">
        {tiles.map(({ label, Icon, color, go }) => (
          <button
            key={label}
            type="button"
            onClick={go}
            className="lift bg-panel-2 border-edge group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[6px] border text-center"
          >
            <Icon
              className={`size-8 ${color} drop-shadow-[0_0_8px_currentColor] transition-transform duration-200 group-hover:scale-110`}
              aria-hidden
            />
            <span className="text-heading text-[11px] font-extrabold tracking-[0.08em] uppercase">
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
  const verdict = verdictFor(site);
  return (
    <div className="bg-panel-2 border-edge mt-4 flex flex-col gap-4 rounded-[6px] border p-3 sm:flex-row">
      <div
        className="space pointer-events-none aspect-square w-full shrink-0 rounded-[4px] p-2 sm:w-[180px]"
        aria-hidden
      >
        <PolarMap className="size-full" />
      </div>
      <div className="min-w-0">
        <p className="label text-pink">Site of the day</p>
        <h2 className="display mt-1 text-[18px]">{site.name}</h2>
        <p className="text-ink-muted mt-1.5">
          Sunny <b className="text-sun">{pct(site.metrics.illum_pct)}</b> of the time, Earth in view{' '}
          <b className="text-earth">{pct(site.metrics.earth_vis_pct)}</b>.
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-3">
          <span
            className="num rounded-[4px] px-2 font-extrabold text-[#130b25]"
            style={{ background: scoreColor(site.score) }}
          >
            Score {Math.round(site.score * 100)}
          </span>
          <span className="chip bg-good border-transparent text-[#06210f]">{verdict.label}</span>
          <button type="button" className="btn btn-go" onClick={() => openSite(site.id)}>
            Explore this site →
          </button>
        </p>
      </div>
    </div>
  );
}

function Bulletins({ sites }: { sites: Site[] }) {
  const openSite = useOpenSite();
  return (
    <section className="box">
      <div className="box-head">
        Top Sites Right Now
        <Link
          to="/sites"
          className="ml-auto font-sans font-bold tracking-normal normal-case underline"
        >
          see all
        </Link>
      </div>
      <ul className="rows">
        {sites.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className="hover:bg-panel-2 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              onClick={() => openSite(s.id)}
            >
              <span className="display text-pink w-5 text-[15px]">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <b className="text-heading block">{s.name}</b>
                <span className="text-ink-muted text-[13px]">
                  Sunny {pct(s.metrics.illum_pct)} · Earth in view {pct(s.metrics.earth_vis_pct)}
                </span>
              </span>
              <span className="lnk more text-[13px]">Open</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
