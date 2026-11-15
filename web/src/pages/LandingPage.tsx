import { Link, useNavigate } from 'react-router';
import { useAppStore, useData, useSelectedSite } from '@/core';
import { figureSrc } from '@/core/shell/Figure';
import { SpinningMoon } from '@/intro/SpinningMoon';

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
  const proMode = useAppStore((s) => s.proMode);
  const selectSite = useAppStore((s) => s.selectSite);

  const openMap = () => {
    if (site && !selected) selectSite(site.id);
    navigate('/explore');
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="box grid overflow-hidden md:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <p className="eyebrow">Lunar landing site navigator</p>
          <h1 className="mt-3 text-[32px] leading-[1.1] sm:text-[40px]">
            Where should the next lander touch down?
          </h1>
          <p className="text-ink mt-4 max-w-[38ch] text-[16px] leading-relaxed">
            Near the Moon&apos;s south pole the Sun stays low. A short move can decide whether a
            lander has power and can see Earth.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-go h-[44px] px-6 text-[13px]"
              onClick={openMap}
            >
              Explore the map
            </button>
            <Link to="/game" className="btn h-[44px] px-6 text-[13px]">
              Play Mission
            </Link>
          </div>
        </div>

        <div className="space flex flex-col justify-center p-5 sm:p-7">
          <SpinningMoon className="mx-auto aspect-square w-full max-w-[440px]" />
        </div>
      </section>

      <section
        aria-label="The two things a south-pole site needs"
        className="grid items-start gap-3 md:grid-cols-2"
      >
        <figure className="box overflow-hidden">
          <img
            src={figureSrc('ridge-shadow.jpg')}
            alt="A long shadow cast across the ground near Shackleton crater."
            className="block w-full bg-black"
          />
          <figcaption className="text-ink-muted px-4 py-3 text-[14px] leading-snug">
            Near Shackleton, the low Sun throws a shadow across the ground. Step into it and the
            power goes.{' '}
            <Link to="/learn#sun" className="lnk">
              Why the light is so uneven
            </Link>
          </figcaption>
        </figure>
        <figure className="box overflow-hidden">
          <img
            src={figureSrc('south-pole-sunlight.jpg')}
            alt="The lunar south pole in low sunlight, with Shackleton and de Gerlache labeled."
            className="block w-full bg-black"
          />
          <figcaption className="text-ink-muted px-4 py-3 text-[14px] leading-snug">
            Shackleton and de Gerlache under that same low Sun. Lit ground and darkness sit side by
            side.{' '}
            <Link to="/learn#pole" className="lnk">
              Why the south pole
            </Link>
          </figcaption>
        </figure>
      </section>

      {proMode && (
        <section aria-labelledby="places-heading">
          <h2 id="places-heading" className="text-[18px] tracking-[0.12em] uppercase">
            All pages
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLACES.map((place) => (
              <Link
                key={place.to}
                to={place.to}
                className="box hover:border-edge-lo flex flex-col px-5 py-4 transition-colors duration-150"
              >
                <span className="text-heading font-mono text-[15px] font-bold tracking-[0.08em] uppercase">
                  {place.title}
                </span>
                <span className="text-ink-muted mt-1 text-[14px] leading-snug">{place.line}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
