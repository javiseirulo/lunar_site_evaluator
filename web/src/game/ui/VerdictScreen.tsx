/**
 * Result of the chosen card: stars on a win, cause + lesson on a loss, and the real site name.
 * The chosen card's bars come back with the deciding one highlighted, and a loss names the
 * landing sites that would have survived.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '@/core';
import { CAUSE_BAR, qualityBars } from '../engine/bars';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import { sfx } from '../audio/sfx';
import { useGame } from '../state/gameStore';
import { verdictImage } from './assets';
import { CAUSE_HEADLINE, lessonFor } from './content';
import { GameButtons } from './GameButtons';
import { countUp } from './format';
import { GameImage } from './GameImage';
import { QualityBar } from './QualityBar';
import { survivorsLine, verdictSummary } from './reveal';

const DAYS = DEFAULT_REQUIREMENTS.surface_days;
const MISSION_HOURS = DAYS * 24;

/** Seconds before star `n` (1-based) pops in. */
const starDelay = (n: number) => 0.5 + n * 0.3;

/** Three big stars, the middle one raised, filled up to `count`. */
function Stars({ count }: { count: number }) {
  // One "pop" per earned star, in time with its spring.
  useEffect(() => {
    const ids = Array.from({ length: count }, (_, i) =>
      window.setTimeout(() => sfx.starPop(i), starDelay(i + 1) * 1000),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [count]);

  return (
    <div
      role="img"
      aria-label={`${count} of 3 stars`}
      className="flex items-end justify-center gap-1"
    >
      {[1, 2, 3].map((n) => {
        const on = n <= count;
        return (
          <motion.span
            key={n}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: starDelay(n), type: 'spring', stiffness: 260, damping: 12 }}
            className={clsx('relative block', n === 2 && '-translate-y-3')}
          >
            {on && (
              // Small burst behind the star as it lands.
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,#ffd23f_0%,#ffd23f66_35%,transparent_70%)]"
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.2, 1.9], opacity: [0.9, 0] }}
                transition={{ delay: starDelay(n) + 0.05, duration: 0.6, ease: 'easeOut' }}
              />
            )}
            <Star
              aria-hidden
              strokeWidth={2.5}
              className={clsx(
                n === 2 ? 'size-20' : 'size-14',
                on
                  ? 'fill-[#ffd23f] text-[#7a4a00] drop-shadow-[3px_3px_0_#000]'
                  : 'fill-navy-800 text-black',
              )}
            />
          </motion.span>
        );
      })}
    </div>
  );
}

const COUNT_MS = 1100;

/** A number that counts up from 0 (shows the final value straight away with reduced motion). */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const reduced = useReducedMotion() ?? false;
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (reduced) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const v = countUp(now - t0, COUNT_MS, to);
      setValue(v);
      if (v !== to) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, reduced]);
  return (
    <span className="tabular-nums">
      {reduced ? to : value}
      {suffix}
    </span>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center border-2 border-black bg-black/50 px-1 py-1.5 text-center">
      <span className="font-mono text-[18px] leading-none font-bold text-white">{children}</span>
      <span className="text-ink-muted mt-1 font-mono text-[9.5px] leading-tight tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}

export function VerdictScreen() {
  const hand = useGame((s) => s.hand);
  const chosenSlot = useGame((s) => s.chosenSlot);
  const sites = useData((s) => s.sites);
  // Focus the result heading on arrival so keyboard and screen-reader users start there.
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);
  const difficulty = useGame((s) => s.difficulty);
  const card = hand?.cards.find((c) => c.slot === chosenSlot);
  const site = sites?.find((s) => s.id === card?.siteId);

  if (!card) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="font-mono text-white uppercase">No landing recorded.</p>
        <GameButtons />
      </div>
    );
  }

  const v = card.verdict;
  const siteName = site?.name ?? card.siteId;
  const bars = site ? qualityBars(site, difficulty) : [];
  const decidingKey = v.win || !v.cause ? null : CAUSE_BAR[v.cause];
  const runLoss = v.cause === 'cold' || v.cause === 'blackout';
  const survivors = v.win ? null : survivorsLine(hand?.cards ?? []);
  // Shortfalls judged over the whole mission (failHour = last hour) did survive every hour.
  const hoursSurvived =
    v.win || v.failHour === null || v.failHour >= MISSION_HOURS - 1 ? MISSION_HOURS : v.failHour;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={clsx(
        'mission-scan flex flex-1 flex-col gap-4 border-4 p-4 md:flex-row',
        v.win ? 'border-good bg-[#06140c]' : 'border-bad bg-[#14060a]',
      )}
    >
      <div className="mission-pixel relative h-48 w-full shrink-0 overflow-hidden border-4 border-black md:h-auto md:min-h-64 md:w-2/5">
        {/* Slow push-in on the scene. */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1 }}
          animate={{ scale: 1.08 }}
          transition={{ duration: 9, ease: 'easeOut' }}
        >
          <GameImage
            src={verdictImage(v.win ? 'win' : (v.cause ?? 'slope'))}
            alt={v.win ? 'Lander safe on the surface' : 'Lander mission failure'}
            label="Scene pending"
            className="size-full"
          />
        </motion.div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2
          ref={headingRef}
          tabIndex={-1}
          aria-live="polite"
          className={clsx(
            'font-mono text-2xl font-bold tracking-widest uppercase outline-none',
            v.win ? 'text-good' : 'text-bad',
          )}
        >
          {v.win ? 'Mission success' : 'Mission failed'}
        </h2>

        {v.win ? (
          <>
            <Stars count={v.stars} />
            <p className="text-ink-muted text-center font-mono text-[10.5px] tracking-wide">
              ★ survived · ★★ good margins · ★★★ beat every objective
            </p>
            <p className="text-[14px] font-bold text-white">
              Congratulations! The site you chose is fit for the mission!
            </p>
          </>
        ) : (
          <p className="text-[16px] font-bold text-white">
            {v.cause ? CAUSE_HEADLINE[v.cause] : 'The mission did not survive.'}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Stat label={`of ${MISSION_HOURS} h survived`}>
            <CountUp to={hoursSurvived} />
          </Stat>
          <Stat label="Sunlight">
            <CountUp to={Math.round(v.metrics.illum_pct * 100)} suffix="%" />
          </Stat>
          <Stat label="Earth link">
            <CountUp to={Math.round(v.metrics.comm_pct * 100)} suffix="%" />
          </Stat>
        </div>

        <p className="text-ink">
          You landed at <span className="text-warn font-bold">{siteName}</span>{' '}
          <span className="text-ink-faint">(Landing site {card.slot})</span>.
        </p>
        <p className="font-mono text-[11.5px] text-ink-muted">
          {verdictSummary(v.detail, v.win ? null : v.failHour, MISSION_HOURS, DAYS)}
          {runLoss && ' Your week was harsher than the yearly average on the card.'}
        </p>
        {bars.length > 0 && (
          <div className="border-2 border-black bg-black/50 p-2">
            <p className="text-ink-muted mb-1.5 font-mono text-[10px] tracking-wider uppercase">
              Your card (Landing site {card.slot}, yearly averages)
            </p>
            <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
              {bars.map((b) => (
                <QualityBar
                  key={b.key}
                  bar={b}
                  showValue={difficulty === 'expert'}
                  highlight={b.key === decidingKey}
                />
              ))}
            </div>
          </div>
        )}
        {survivors && <p className="text-good text-[12.5px] font-bold">{survivors}</p>}
        <div className="border-2 border-black bg-black/50 p-2 text-[12px] text-ink">
          <span className="text-warn font-mono font-bold uppercase">Lesson: </span>
          {lessonFor(v.win ? null : v.cause)}
        </div>
        <div className="mt-auto pt-1">
          <GameButtons />
        </div>
      </div>
    </motion.div>
  );
}
