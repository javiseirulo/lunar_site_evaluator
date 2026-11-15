/**
 * Intro page shown at "/" before the app: a night-sky hero, a Moon that rises and fills with light as
 * you scroll (rendered from NASA's Moon texture, south pole in view), drifting mist, and one honest
 * paragraph about why the project exists. The app itself lives at /explore and friends.
 *
 * Layout idea adapted from a hero brief supplied by the team (video hero + parallax quote section).
 * No video or stock image is used: the sky is CSS, the Moon is a canvas, the mist is generated art.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import '@fontsource/dancing-script/600.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/inter';
import './intro.css';
import { Moon, type MoonHandle } from './Moon';
import { sunLonForProgress } from './moonSphere';

/** Brand shown in the nav. One constant, so the team can rename it in one place. */
const BRAND = 'Dark Side Landing';

const NAV: { label: string; to: string }[] = [
  { label: 'Explore', to: '/explore' },
  { label: 'Mission', to: '/game' },
  { label: 'Learn', to: '/learn' },
  { label: 'About', to: '/about' },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const PILL =
  'lp-button-glow items-center justify-center rounded-full bg-white text-sm font-medium tracking-wide text-black transition-all duration-300 hover:bg-white/90';

/** Viewport size, debounced; mobile toolbars resizing the height by a little don't count. */
function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setV((prev) => {
          const w = window.innerWidth;
          const h = window.innerHeight;
          if (Math.abs(w - prev.w) < 2 && Math.abs(h - prev.h) < 120) return prev;
          return { w, h };
        });
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return v;
}

export default function IntroPage() {
  const { w: vw, h: vh } = useViewport();
  const moonBox = useRef<HTMLDivElement>(null);
  const moon = useRef<MoonHandle>(null);
  const mistLeft = useRef<HTMLDivElement>(null);
  const mistRight = useRef<HTMLDivElement>(null);

  // On-screen size of the Moon, and how many canvas pixels back it.
  const D = Math.round(clamp(Math.min(vw * 0.92, vh * 0.86), 300, 900));
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const pixels = Math.round(Math.min(D * dpr, 1100));

  // One loop drives the whole scene from the scroll position, with smoothing so it feels weighty.
  useEffect(() => {
    const box = moonBox.current;
    if (!box) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let smoothT = -1;
    let mist = 0;

    const frame = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const t = clamp(window.scrollY / max, 0, 1);
      smoothT = smoothT < 0 || reduce ? t : smoothT + (t - smoothT) * 0.07;

      // Moon: peeks over the bottom of the hero, then rises, shrinks and fills with light.
      const scale = 1 - 0.5 * smoothT;
      const startCenter = vh * 0.64 + D / 2;
      const endCenter = vh * 0.05 + D / 4;
      const center = startCenter + (endCenter - startCenter) * smoothT;
      box.style.transform = `translate3d(-50%, ${(center - D / 2).toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      box.style.setProperty('--lp-glow', (0.25 + 0.75 * smoothstep(0, 0.85, smoothT)).toFixed(3));
      moon.current?.setSunLon(sunLonForProgress(smoothT));

      // Mist: slides in from both sides and drifts up as the quote section arrives.
      const target = smoothstep(0.18, 0.85, t);
      mist = reduce ? target : mist + (target - mist) * 0.045;
      const x = 220 * (1 - mist);
      const y = -50 * mist;
      const o = (mist * 0.9).toFixed(3);
      if (mistLeft.current) {
        mistLeft.current.style.transform = `translate3d(${-x}px, ${y}px, 0)`;
        mistLeft.current.style.opacity = o;
      }
      if (mistRight.current) {
        mistRight.current.style.transform = `translate3d(${x}px, ${y}px, 0) scaleX(-1)`;
        mistRight.current.style.opacity = o;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [vh, D]);

  const mistMask = {
    WebkitMaskImage: `url(${import.meta.env.BASE_URL}landing/mist.png)`,
    maskImage: `url(${import.meta.env.BASE_URL}landing/mist.png)`,
  };

  return (
    <div className="lp relative isolate min-h-screen bg-[#05060d]">
      <Nav />

      {/* The Moon lives outside both sections so one object can travel through the whole page. */}
      <div
        ref={moonBox}
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 z-[5] will-change-transform"
        style={{ width: D, height: D, transform: `translate3d(-50%, ${vh}px, 0)` }}
      >
        <div className="lp-moon-glow" />
        <Moon ref={moon} pixels={pixels} className="lp-moon-canvas absolute inset-0 size-full" />
      </div>

      {/* Section 1: hero */}
      <section
        className="relative min-h-[100svh] overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #05060d 0%, #070b1f 55%, #02030a 100%)' }}
      >
        <div className="lp-stars" aria-hidden />

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pb-32 md:pb-52">
          <h1 className="lp-serif lp-text-glow lp-rise max-w-5xl text-center text-[40px] leading-[0.92] tracking-tight text-balance text-white md:text-7xl lg:text-[110px]">
            Land where the light lasts.
          </h1>
          <p
            className="lp-rise mt-5 max-w-xl text-center text-sm text-white/70 md:mt-7 md:text-base"
            style={{ animationDelay: '180ms' }}
          >
            At the Moon&apos;s south pole the Sun never climbs high. See which landing sites keep
            their sunlight and a view of Earth, hour by hour through 2027.
          </p>
          <Link
            to="/explore"
            className={`${PILL} lp-rise mt-6 inline-flex px-8 py-3.5 md:mt-9`}
            style={{ animationDelay: '320ms' }}
          >
            Explore the sites
          </Link>
        </div>

        <div
          className="absolute bottom-8 left-8 z-10 hidden items-center gap-3 md:flex"
          aria-hidden
        >
          <span className="lp-glass flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/20">
            <span className="lp-cue-dot block size-1.5 rounded-full bg-white/80" />
          </span>
          <span className="text-xs leading-tight text-white/60">
            Scroll
            <br />
            to the south pole
          </span>
        </div>
      </section>

      {/* Section 2: the reason, with mist */}
      <section
        className="relative flex min-h-[100svh] flex-col items-center justify-end overflow-hidden px-6 pb-24 md:pb-28"
        style={{
          background: 'linear-gradient(180deg, #02030a 0%, #0b1233 35%, #1e2d5c 68%, #54699c 100%)',
        }}
      >
        <div className="lp-stars" aria-hidden />

        <div
          ref={mistLeft}
          aria-hidden
          className="lp-mist pointer-events-none absolute bottom-[10%] left-0 z-10 -ml-[12%] hidden aspect-[1024/400] w-[500px] opacity-0 sm:block md:w-[650px]"
          style={{ ...mistMask, transform: 'translate3d(-220px,0,0)' }}
        />
        <div
          ref={mistRight}
          aria-hidden
          className="lp-mist pointer-events-none absolute right-0 bottom-[15%] z-10 -mr-[12%] hidden aspect-[1024/400] w-[500px] opacity-0 sm:block md:w-[650px]"
          style={{ ...mistMask, transform: 'translate3d(220px,0,0) scaleX(-1)' }}
        />

        <figure className="relative z-20 max-w-4xl text-center">
          <blockquote>
            <p className="lp-serif lp-quote-shadow text-xl leading-[1.45] text-white sm:text-2xl md:text-4xl md:leading-[1.5] lg:text-[42px]">
              &ldquo;Near the pole the Sun skims the horizon, so a hill a few kilometres away can
              hide it for days, and Earth sits just as low. We built this to show which landing
              sites keep their power and their line home, so that when a launch slips you can find
              the next best place in minutes.&rdquo;
            </p>
          </blockquote>
          <figcaption className="mt-6 text-sm tracking-wide text-white/80 md:mt-8 md:text-base">
            The {BRAND} team
          </figcaption>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:mt-10">
            <Link to="/explore" className={`${PILL} inline-flex px-8 py-3.5`}>
              Open the map
            </Link>
            <Link
              to="/game"
              className="text-sm text-white/80 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white"
            >
              Try the Mission game
            </Link>
          </div>
        </figure>

        <p className="absolute inset-x-0 bottom-4 z-20 px-6 text-center text-[11px] leading-snug text-white/65">
          Moon texture: NASA/GSFC Scientific Visualization Studio, CGI Moon Kit. An independent
          project for the 2026 NASA Space Apps Challenge, not affiliated with or endorsed by NASA.
        </p>
      </section>
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ease = 'ease-[cubic-bezier(0.22,1,0.36,1)]';
  const line = `block h-[1.5px] w-6 rounded-full bg-white transition-all duration-500 ${ease}`;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[65] flex items-center justify-between bg-gradient-to-b from-[#05060d]/75 to-transparent px-6 py-5 md:px-12">
        <Link to="/" className="lp-dancing text-2xl text-white md:text-3xl" aria-label={BRAND}>
          {BRAND}
        </Link>

        <nav
          aria-label="Main"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 md:flex"
        >
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm tracking-wide text-white/80 transition-colors hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link to="/explore" className={`${PILL} hidden px-6 py-2.5 md:inline-flex`}>
          Open the app
        </Link>

        <button
          type="button"
          className="lp-glass relative z-[70] flex size-11 flex-col items-center justify-center gap-[7.5px] rounded-full md:hidden"
          aria-expanded={open}
          aria-controls="lp-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={line}
            style={{ transform: open ? 'translateY(9px) rotate(45deg)' : 'none' }}
          />
          <span
            className={line}
            style={{ opacity: open ? 0 : 1, transform: open ? 'scaleX(0)' : 'none' }}
          />
          <span
            className={line}
            style={{ transform: open ? 'translateY(-9px) rotate(-45deg)' : 'none' }}
          />
        </button>
      </header>

      <div
        className={`fixed inset-0 z-[55] bg-black/50 transition-opacity duration-500 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        id="lp-menu"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-[60] flex w-[85%] max-w-[340px] flex-col border-l border-white/10 bg-[#05060d]/95 px-8 pt-28 pb-10 backdrop-blur-xl transition-transform duration-500 md:hidden ${ease} ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav aria-label="Menu" className="flex flex-col gap-7">
          {NAV.map((n, i) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={`lp-serif text-3xl text-white/90 transition-all duration-500 ${ease} ${
                open ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
              }`}
              style={{ transitionDelay: open ? `${150 + i * 75}ms` : '0ms' }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/explore"
          onClick={() => setOpen(false)}
          className={`${PILL} mt-auto inline-flex px-8 py-3.5 transition-all duration-500 ${ease} ${
            open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
          style={{ transitionDelay: open ? '450ms' : '0ms' }}
        >
          Open the app
        </Link>
      </aside>
    </>
  );
}
