import { Link, useNavigate } from 'react-router';
import { useAppStore, useData, useSelectedSite } from '@/core';
import { figureSrc } from '@/core/shell/Figure';
import { SpinningMoon } from '@/intro/SpinningMoon';

/** Home: the question, the Moon, and the two photos that explain the south pole. */
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
            <Link to="/streetview" className="btn h-[44px] px-6 text-[13px]">
              Stand on a site
            </Link>
          </div>
        </div>

        <div className="space flex flex-col justify-center p-5 sm:p-7">
          <SpinningMoon className="mx-auto aspect-square w-full max-w-[440px]" />
        </div>
      </section>

      <section
        aria-label="The two things a south-pole site needs"
        className="mx-auto grid w-full max-w-4xl grid-cols-1 items-stretch justify-center gap-4 sm:grid-cols-2"
      >
        <figure className="box flex h-full flex-col overflow-hidden">
          <img
            src={figureSrc('ridge-shadow.jpg')}
            alt="A long shadow cast across the ground near Shackleton crater."
            className="h-64 w-full bg-black object-cover object-center sm:h-72"
          />
          <figcaption className="text-ink-muted flex-1 px-4 py-3 text-[14px] leading-snug">
            Near Shackleton, the low Sun throws a shadow across the ground. Step into it and the
            power goes.{' '}
            <Link to="/learn#sun" className="lnk">
              Why the light is so uneven
            </Link>
          </figcaption>
        </figure>
        <figure className="box flex h-full flex-col overflow-hidden">
          <img
            src={figureSrc('south-pole-sunlight.jpg')}
            alt="The lunar south pole in low sunlight, with Shackleton and de Gerlache labeled."
            className="h-64 w-full bg-black object-cover object-center sm:h-72"
          />
          <figcaption className="text-ink-muted flex-1 px-4 py-3 text-[14px] leading-snug">
            Shackleton and de Gerlache under that same low Sun. Lit ground and darkness sit side by
            side.{' '}
            <Link to="/learn#pole" className="lnk">
              Why the south pole
            </Link>
          </figcaption>
        </figure>
      </section>
    </div>
  );
}
