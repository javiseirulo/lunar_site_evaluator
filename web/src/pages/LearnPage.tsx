/**
 * Educational explainer (for educators, students and the public). Keep to well-established facts;
 * anything quantitative beyond these basics must cite a source (CLAUDE.md §4).
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAppStore } from '@/core';
import { Figure, figureSrc } from '@/core/shell/Figure';

const SECTIONS = [
  { id: 'pole', title: 'Why the south pole?' },
  { id: 'sun', title: 'Sunlight and power' },
  { id: 'earth', title: 'Earth and communications' },
  { id: 'horizon', title: 'What counts as the horizon' },
  { id: 'use', title: 'Using this site' },
  { id: 'glossary', title: 'Glossary' },
];

const GLOSSARY: [string, string][] = [
  ['Azimuth', 'Direction along the horizon, measured in degrees clockwise from local north.'],
  ['Elevation', 'Angle above (positive) or below (negative) the horizon.'],
  ['Terrain horizon', 'The skyline formed by hills, crater rims and mountains around a site.'],
  ['Sunlight (%)', 'Share of the time window during which the Sun is above the terrain horizon.'],
  [
    'Earth in view (%)',
    'Share of the time window during which Earth is above the terrain horizon.',
  ],
  ['Longest night', 'The longest continuous stretch without direct sunlight.'],
  ['PSR', 'Permanently shadowed region: ground that never receives direct sunlight.'],
  [
    'Libration',
    'The small apparent wobble of the Moon that makes Earth drift around in the lunar sky.',
  ],
  ['DEM', 'Digital elevation model: a grid of terrain heights, here from laser altimetry.'],
  ['Ephemeris', 'A table of where bodies such as the Sun and Earth are at given times.'],
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="border-edge mb-1.5 scroll-mt-4 border-b pb-0.5 text-[14px] font-bold text-heading"
    >
      {children}
    </h2>
  );
}

/** Text on one side, the picture on the other, alternating so the page stays short. */
function Beside({
  id,
  title,
  imageFirst,
  src,
  alt,
  caption,
  children,
}: {
  id: string;
  title: string;
  imageFirst?: boolean;
  src: string;
  alt: string;
  caption: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <H id={id}>{title}</H>
      <div className="mt-2 grid items-center gap-4 md:grid-cols-2">
        <div className={imageFirst ? 'md:order-2' : undefined}>{children}</div>
        <Figure
          src={src}
          alt={alt}
          className={`border-edge border ${imageFirst ? 'md:order-1' : ''}`}
        >
          {caption}
        </Figure>
      </div>
    </section>
  );
}

export default function LearnPage() {
  const { hash } = useLocation();
  const proMode = useAppStore((s) => s.proMode);
  // Router links like /learn#earth don't scroll by themselves in a single-page app.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
      <nav className="box self-start" aria-label="Topics">
        <div className="box-head-dark">Topics</div>
        <ul className="box-body space-y-1.5 text-[12px]">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="lnk more">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="box">
        <div className="box-head">Light and line of sight at the lunar south pole</div>
        <div className="box-body space-y-8">
          <p className="text-ink-muted text-[13px]">
            Two questions decide whether a landing site near the lunar south pole can work: will the
            lander have <b className="text-sun">sunlight</b> for power, and will it be able to{' '}
            <b className="text-earth">see Earth</b> to talk to mission control? Both depend on the
            exact spot and the exact date.
          </p>

          <Beside
            id="pole"
            title="Why the south pole?"
            src={figureSrc('illumination-south-pole.jpg')}
            alt="A round map of the lunar south pole. Bright ground was sunlit often; crater floors are black."
            caption={
              <>
                How often the ground was sunlit, from six months of Lunar Reconnaissance Orbiter
                Camera images. Brighter means lit more of the time. Shackleton is the round dark
                crater near the center; its floor never sees the Sun. NASA/GSFC/Arizona State
                University.
              </>
            }
          >
            <p className="text-ink-muted">
              The Moon&apos;s spin axis is tilted only about 1.5° relative to its path around the
              Sun. Near the poles the Sun therefore never climbs high: it circles close to the
              horizon and casts very long shadows. Some high ridges and crater rims stay lit for
              most of the time, while the floors of some deep craters never see the Sun at all.
              Those permanently shadowed regions are among the coldest places known and can trap
              water ice, which is a big reason missions want to land nearby.
            </p>
          </Beside>

          <Beside
            id="sun"
            title="Sunlight and power"
            imageFirst
            src={figureSrc('rimlight-shackleton.jpg')}
            alt="Sunlight grazing the rim of Shackleton crater, with the ground beyond it in shadow."
            caption={
              <>
                Sunlight grazing Shackleton&apos;s rim. The lit strip is where solar panels can
                work. A few kilometres into the shadow, they cannot. NASA/GSFC/Arizona State
                University.
              </>
            }
          >
            <p className="text-ink-muted">
              Solar panels only work while the Sun is above the local horizon. With the Sun so low,
              a hill a few kilometres away can block it for days. A full lunar day, from one sunrise
              to the next, lasts about 29.5 Earth days, but near the pole the pattern of light and
              dark at a site depends on its height and surroundings, not just on that cycle. That is
              why we show both the share of time in sunlight and the <i>longest night</i>, which
              sets how big the batteries must be.
            </p>
          </Beside>

          <Beside
            id="earth"
            title="Earth and communications"
            src={figureSrc('south-pole-earth.jpg')}
            alt="Earth hanging just above the lunar horizon, seen from near the south pole."
            caption={
              <>
                Earth from near the south pole. It stays low, so the small wobble of libration can
                drop it behind a ridge. The red dot marks the horizon in this visualization; it is
                not a landing site. Drawn from LOLA terrain and a planetary ephemeris. NASA
                Scientific Visualization Studio.
              </>
            }
          >
            <p className="text-ink-muted">
              The Moon keeps the same face towards Earth, so from the near side Earth stays in
              roughly the same part of the sky. A slow wobble called libration moves it around by
              several degrees. From the south pole, Earth sits near the horizon, so that small
              wobble can hide it behind terrain. While Earth is hidden, a lander cannot send data
              directly home and has to wait or use a relay satellite.
            </p>
          </Beside>

          <Beside
            id="horizon"
            title="What counts as the horizon"
            imageFirst
            src={figureSrc('shackleton-heights.jpg')}
            alt="Shackleton crater shown two ways: height in color on the left, and shaded relief on the right."
            caption={
              <>
                Shackleton, measured by LOLA. Color on the left is height. The right side is the
                same crater in shade, and the floor stays black because the Sun never reaches it.
                NASA/Zuber et al., Nature, 2012.
              </>
            }
          >
            <p className="text-ink-muted">
              The Moon has no atmosphere, so light is not bent the way it is on Earth: what you see
              is what is there. The horizon at a site is the terrain around it plus the curvature of
              the Moon itself. We build it from laser-altimeter elevation data and compare it, hour
              by hour, with the positions of the Sun and Earth.
            </p>
          </Beside>

          <section>
            <H id="use">Using this site</H>
            <ul className="text-ink-muted list-[square] space-y-1 pl-5">
              <li>
                <Link to="/explore" className="lnk">
                  Explore
                </Link>{' '}
                — the polar map with map layers; pick a site to see its figures.
              </li>
              <li>
                <Link to="/sites" className="lnk">
                  Sites
                </Link>{' '}
                — every candidate in one sortable table.
              </li>
              {proMode && (
                <li>
                  <Link to="/compare" className="lnk">
                    Compare
                  </Link>{' '}
                  — up to three sites side by side, with their sunlight and Earth windows.
                </li>
              )}
              <li>
                <Link to="/streetview" className="lnk">
                  Street View
                </Link>{' '}
                — stand on a site and watch the sky.
              </li>
              <li>
                <Link to="/game" className="lnk">
                  Mission
                </Link>{' '}
                — a landing site falls through; choose a new one and see why it works or fails.
              </li>
            </ul>
          </section>

          <section>
            <H id="glossary">Glossary</H>
            <table className="border-edge w-full border-collapse border text-[12px]">
              <tbody>
                {GLOSSARY.map(([term, def], i) => (
                  <tr key={term} className={i % 2 ? 'bg-navy-850' : 'bg-navy-900'}>
                    <th className="border-edge w-40 border-r px-3 py-2 text-left align-top text-heading">
                      {term}
                    </th>
                    <td className="text-ink-muted px-3 py-2">{def}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </article>
    </div>
  );
}
