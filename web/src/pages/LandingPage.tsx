import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Compass, Mountain, Rocket } from 'lucide-react';
import type { AppMode } from '@lunar/contracts';
import { MODES, formatUtc, pathForMode, useData } from '@/core';

const ICONS: Record<AppMode, typeof Compass> = {
  explore: Compass,
  streetview: Mountain,
  game: Rocket,
};

const rise = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.5, ease: [0.2, 0.7, 0.2, 1] as const },
  }),
};

export function LandingPage() {
  const sites = useData((s) => s.sites);
  const manifest = useData((s) => s.manifest);

  return (
    <div className="relative flex-1 overflow-y-auto">
      {/* Horizon glow: a low Sun grazing the limb, which is what the south pole looks like. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%]"
        style={{
          background:
            'radial-gradient(120% 80% at 70% 105%, rgb(245 183 74 / 0.16), transparent 55%), radial-gradient(90% 60% at 20% 110%, rgb(90 174 255 / 0.10), transparent 60%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-14 px-5 pt-16 pb-24 md:pt-24">
        <section className="max-w-2xl">
          <motion.p
            className="eyebrow mb-4"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={0}
          >
            Lunar south pole · landing site planner
          </motion.p>
          <motion.h1
            className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={1}
          >
            Where the Sun never quite sets,{' '}
            <span className="text-ink-muted">and Earth stays in view.</span>
          </motion.h1>
          <motion.p
            className="text-ink-muted mt-5 max-w-xl text-lg leading-relaxed"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={2}
          >
            Compare landing sites and dates by how much sunlight they get for power and how often
            Earth is above the horizon for direct communications.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            variants={rise}
            initial="hidden"
            animate="show"
            custom={3}
          >
            <Link
              to="/explore"
              className="bg-ink text-space-950 hover:bg-accent flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition-colors"
            >
              Start exploring <ArrowRight className="size-4" />
            </Link>
            <Link to="/about" className="text-ink-muted hover:text-ink px-3 py-3 text-sm">
              Data and method
            </Link>
          </motion.div>
          {sites && manifest && (
            <motion.dl
              className="text-ink-muted mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm"
              variants={rise}
              initial="hidden"
              animate="show"
              custom={4}
            >
              <div>
                <dt className="eyebrow">Candidate sites</dt>
                <dd className="num text-ink mt-1 text-2xl">{sites.length}</dd>
              </div>
              <div>
                <dt className="eyebrow">Time window</dt>
                <dd className="num text-ink mt-1 text-2xl">
                  {formatUtc(manifest.time_range.start_utc).slice(0, 10)} →{' '}
                  {formatUtc(manifest.time_range.end_utc).slice(0, 10)}
                </dd>
              </div>
            </motion.dl>
          )}
        </section>

        <section aria-label="Modes" className="grid gap-3 md:grid-cols-3">
          {MODES.map((m, i) => {
            const Icon = ICONS[m.id];
            return (
              <motion.div key={m.id} variants={rise} initial="hidden" animate="show" custom={5 + i}>
                <Link
                  to={pathForMode(m.id)}
                  className="panel hover:border-line-strong group flex h-full flex-col gap-3 p-5 transition-colors"
                >
                  <Icon
                    className="text-ink-muted group-hover:text-accent size-5 transition-colors"
                    aria-hidden
                  />
                  <h2 className="font-medium">{m.label}</h2>
                  <p className="text-ink-muted text-sm leading-relaxed">{m.blurb}</p>
                  <ArrowRight
                    className="text-ink-faint group-hover:text-ink mt-auto size-4 transition-all group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              </motion.div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
