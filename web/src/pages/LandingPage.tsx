import { Link, useNavigate } from 'react-router';
import { useAppStore, useData, useSelectedSite } from '@/core';
import { PolarMap, scoreColor } from '@/layers';

const PLACES: { to: string; title: string; line: string }[] = [
  {
    to: '/explore',
    title: 'Explore',
    line: 'Open the south-pole map, turn layers on, and pick a site.',
  },
  {
    to: '/compare',
    title: 'Compare',
    line: 'Put two or three sites side by side and see which one wins.',
  },
  {
    to: '/game',
    title: 'Mission',
    line: 'A landing site just fell through. Choose another and watch the days play out.',
  },
  {
    to: '/learn',
    title: 'Learn',
    line: 'Why a few kilometres of ground decide power and a call home.',
  },
  {
    to: '/sites',
    title: 'All sites',
    line: 'The full list, with a score out of 100 for each one.',
  },
  {
    to: '/streetview',
    title: 'Street View',
    line: 'Stand on the ground and watch the Sun and Earth move.',
  },
  {
    to: '/about',
    title: 'Data and method',
    line: 'Where the numbers come from, and what is still mock data.',
  },
];

/**
 * Home is a landing page: a short pitch and the live map, then buttons for every page.
 * The header and the footer carry the same trips on every other screen.
 */
export function LandingPage() {
  const sites = useData((s) => s.sites);
  const selected = useSelectedSite();
  const best = sites
    ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score)[0]
    : null;
  const site = selected ?? best;
  const navigate = useNavigate();
  const selectSite = useAppStore((s) => s.selectSite);

  const openMap = () => {
    if (site && !selected) selectSite(site.id);
    navigate('/explore');
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="box grid overflow-hidden md:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <p className="label">A tool for the lunar south pole</p>
          <h1 className="font-display mt-3 text-[40px] leading-[1.05] tracking-[-0.02em] sm:text-[46px]">
            Where should the next lander touch down?
          </h1>
          <p className="text-ink mt-4 max-w-[38ch] text-[16px] leading-relaxed">
            Near the south pole the Sun stays low, so a short move can decide whether a lander has
            power and can see Earth. Compare sites and dates before the mission slips.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn btn-go h-[42px] px-5 text-[15px]" onClick={openMap}>
              Explore the map
            </button>
            <Link to="/compare" className="btn h-[42px] px-5 text-[15px]">
              Compare sites
            </Link>
          </div>
        </div>

        <div className="space flex flex-col justify-center p-5 sm:p-7">
          <div className="mx-auto aspect-square w-full max-w-[480px]">
            <PolarMap className="size-full" />
          </div>
          {site && (
            <p className="mt-3 text-center text-[13px] text-[#c8c2b4]">
              {selected ? 'Selected' : 'Best in this data'}: {site.name}
              <span
                className="mx-2 inline-block size-2.5 align-middle"
                style={{ background: scoreColor(site.score) }}
                aria-hidden
              />
              <span className="num text-[#f4f0e6]">{Math.round(site.score * 100)}</span>
              <span className="text-[#8d877c]"> / 100</span>
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="places-heading">
        <h2 id="places-heading" className="font-display text-[28px] text-[#f4f0e6]">
          Start anywhere
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLACES.map((place) => (
            <Link
              key={place.to}
              to={place.to}
              className="box hover:border-edge-lo flex flex-col px-5 py-4 transition-colors duration-150"
            >
              <span className="font-display text-heading text-[22px]">{place.title}</span>
              <span className="text-ink-muted mt-1 text-[14px] leading-snug">{place.line}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
