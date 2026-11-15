/**
 * Everything below the quote: the challenge, why it is hard, what the app does, how it works, the
 * data, the limits, who it is for and who made it. Words live in content.ts. Layout is editorial
 * (hairlines, a sticky heading beside each block), not a grid of cards.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  AUDIENCE,
  CHALLENGE,
  CHALLENGE_URL,
  DATA,
  FEATURES,
  FINAL,
  HOW,
  FUTURE,
  STATS,
  TEAM,
  WHY_HARD,
} from './content';
import { figureSrc } from '@/core/shell/Figure';
import { LINK, PILL } from './ui';

/** One public-domain picture for each point in "Why the south pole is hard", same order. */
const WHY_HARD_PICTURES: { src: string; alt: string; credit: string }[] = [
  {
    src: figureSrc('south-pole-terminator.jpg'),
    alt: 'The southern Moon with the Sun grazing the edge, so craters throw long shadows.',
    credit:
      'The Sun setting over the southern Moon. NASA Scientific Visualization Studio, from LOLA.',
  },
  {
    src: figureSrc('earth-from-shackleton.jpg'),
    alt: 'Earth above the sunlit rim of Shackleton crater.',
    credit: 'Earth from the rim of Shackleton. NASA Scientific Visualization Studio.',
  },
  {
    src: figureSrc('south-pole-heights.jpg'),
    alt: 'The southern Moon colored by height, blue in the low South Pole-Aitken basin.',
    credit:
      'Height, not sunlight: blue is low, red is high. NASA Scientific Visualization Studio, from LOLA.',
  },
  {
    src: figureSrc('shackleton-floor.jpg'),
    alt: 'Shackleton crater with its floor in shadow and the rim catching the light.',
    credit: 'Shackleton’s floor, which the Sun never reaches. NASA/Goddard, from LOLA.',
  },
];

const BODY = 'text-base leading-relaxed text-white/75 md:text-lg';
const H2 = 'lp-display text-3xl leading-[1.05] text-white md:text-5xl';
const WRAP = 'mx-auto max-w-6xl px-6 md:px-12';

/** A two-column block: sticky title and lead on the left, content on the right. */
function Block({
  id,
  title,
  lead,
  first,
  children,
}: {
  id?: string;
  title: string;
  lead?: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-20 md:py-28 ${first ? 'pt-28 md:pt-40' : 'border-t border-white/10'}`}
    >
      <div className={`${WRAP} grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16`}>
        <div className="md:sticky md:top-28 md:self-start">
          <h2 className={H2}>{title}</h2>
          {lead && <p className={`${BODY} mt-5 max-w-md`}>{lead}</p>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export function Details() {
  return (
    <div
      className="relative"
      style={{
        background:
          'linear-gradient(180deg, #54699c 0, #1e2d5c 170px, #0b1233 440px, #05060d 780px) top / 100% 780px no-repeat, #05060d',
      }}
    >
      <div className="lp-stars" style={{ opacity: 0.55 }} aria-hidden />
      <div className="relative z-20">
        <Challenge />
        <WhyHard />
        <Stats />
        <Features />
        <How />
        <Data />
        <Future />
        <WhoFor />
        <Team />
        <Final />
        <Footer />
      </div>
    </div>
  );
}

function Challenge() {
  return (
    <Block id="challenge" title={CHALLENGE.title} lead={CHALLENGE.lead} first>
      <div className="space-y-5">
        {CHALLENGE.body.map((p) => (
          <p key={p} className={BODY}>
            {p}
          </p>
        ))}
      </div>
      <h3 className="mt-12 text-lg font-semibold tracking-[-0.02em] text-white">
        {CHALLENGE.briefTitle}
      </h3>
      <ul className="mt-4 border-b border-white/15">
        {CHALLENGE.brief.map((b) => (
          <li key={b} className="border-t border-white/15 py-4 text-white/80">
            {b}
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <a href={CHALLENGE_URL} target="_blank" rel="noreferrer" className={LINK}>
          Read the official challenge
        </a>
      </p>
    </Block>
  );
}

function WhyHard() {
  return (
    <Block title={WHY_HARD.title}>
      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
        {WHY_HARD.items.map((it, i) => {
          const picture = WHY_HARD_PICTURES[i];
          return (
            <div key={it.title} className="border-t border-white/20 pt-5">
              {picture && (
                <figure className="mb-4">
                  <img
                    src={picture.src}
                    alt={picture.alt}
                    className="block max-h-64 w-full border border-white/15 bg-black object-contain"
                  />
                  <figcaption className="mt-2 text-xs text-white/45">{picture.credit}</figcaption>
                </figure>
              )}
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{it.title}</h3>
              <p className="mt-2 text-white/70">{it.text}</p>
            </div>
          );
        })}
      </div>
    </Block>
  );
}

/** Four real numbers, set in DM Mono Light in NASA's blue like the numerals on nasa.gov. */
function Stats() {
  return (
    <section
      aria-label="The project in numbers"
      className="border-t border-white/10 py-16 md:py-20"
    >
      <dl className={`${WRAP} grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3`}>
        {STATS.map((s) => (
          <div key={s.value} className="border-t border-white/20 pt-5">
            <dd className="lp-mono text-4xl text-[#288bff] md:text-6xl">{s.value}</dd>
            <dt className="mt-3 max-w-[22ch] text-sm leading-snug text-white/70">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Features() {
  return (
    <Block id="features" title={FEATURES.title} lead={FEATURES.lead}>
      <ul className="border-b border-white/15">
        {FEATURES.items.map((it) => (
          <li
            key={it.title}
            className="grid gap-2 border-t border-white/15 py-5 sm:grid-cols-[9rem_1fr] sm:gap-6"
          >
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{it.title}</h3>
            <div>
              <p className="text-white/75">{it.text}</p>
              <p className="mt-2">
                <Link to={it.to} className={LINK}>
                  {it.cta}
                </Link>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function How() {
  return (
    <Block id="how" title={HOW.title} lead={HOW.lead}>
      <ol className="border-b border-white/15">
        {HOW.steps.map((s, i) => (
          <li
            key={s.title}
            className="grid grid-cols-[2.75rem_1fr] gap-x-3 border-t border-white/15 py-6"
          >
            <span className="lp-mono pt-0.5 text-2xl text-[#288bff]">{i + 1}</span>
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{s.title}</h3>
              <p className="mt-2 text-white/70">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function Data() {
  return (
    <Block id="data" title={DATA.title} lead={DATA.lead}>
      <ul className="border-b border-white/15">
        {DATA.nasa.map((d) => (
          <li
            key={d.name}
            className="grid gap-1 border-t border-white/15 py-4 sm:grid-cols-[1fr_1fr] sm:gap-6"
          >
            <a href={d.href} target="_blank" rel="noreferrer" className={`${LINK} font-medium`}>
              {d.name}
            </a>
            <span className="text-white/70">{d.use}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/65">{DATA.note}</p>
    </Block>
  );
}

function Future() {
  return (
    <Block title={FUTURE.title} lead={FUTURE.lead}>
      <ul className="border-b border-white/15">
        {FUTURE.items.map((t) => (
          <li key={t} className="border-t border-white/15 py-4 text-white/80">
            {t}
          </li>
        ))}
      </ul>
    </Block>
  );
}

function WhoFor() {
  return (
    <section className="border-t border-white/10 py-20 md:py-28">
      <div className={WRAP}>
        <h2 className={H2}>{AUDIENCE.title}</h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {AUDIENCE.items.map((a) => (
            <div key={a.title} className="border-t border-white/20 pt-5">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{a.title}</h3>
              <p className="mt-2 text-white/70">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  return (
    <Block title={TEAM.title}>
      <p className={BODY}>{TEAM.body}</p>
    </Block>
  );
}

function Final() {
  return (
    <section className="border-t border-white/10 py-24 text-center md:py-36">
      <div className={WRAP}>
        <h2 className="lp-display text-4xl text-white md:text-7xl">{FINAL.title}</h2>
        <p className={`${BODY} mx-auto mt-5 max-w-xl`}>{FINAL.text}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <Link to="/home" className={`${PILL} inline-flex px-8 py-3.5`}>
            Open the map
          </Link>
          <Link to="/game" className={LINK}>
            Try the Mission game
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 pt-10 pb-12 text-center md:px-12">
      <nav
        aria-label="Pages"
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
      >
        <Link to="/explore" className="text-white/70 transition-colors hover:text-white">
          Explore
        </Link>
        <Link to="/game" className="text-white/70 transition-colors hover:text-white">
          Mission
        </Link>
        <Link to="/learn" className="text-white/70 transition-colors hover:text-white">
          Learn
        </Link>
        <Link to="/about" className="text-white/70 transition-colors hover:text-white">
          Data and method
        </Link>
      </nav>
      <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-white/60">
        {TEAM.disclaimer} Moon texture: NASA/GSFC Scientific Visualization Studio, CGI Moon Kit.
        Type set in Inter and DM Mono (SIL Open Font License).
      </p>
    </footer>
  );
}
