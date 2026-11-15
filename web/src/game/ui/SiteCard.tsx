/**
 * One landing-site card. Slides in face-down and flips face-up on the deal timeline; the
 * real site name is never shown here ("Landing site N"), only in the verdict.
 */
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import type { Site } from '@lunar/contracts';
import { qualityBars, type Difficulty } from '../engine/bars';
import type { Card } from '../engine/deal';
import type { DealTimeline } from './format';
import { GameImage } from './GameImage';
import { QualityBar } from './QualityBar';

/** Fixed star field for the card back. Not an agency mark. */
const STARS = [
  [12, 18, 1.2],
  [28, 40, 0.8],
  [46, 14, 1.4],
  [70, 32, 0.7],
  [84, 58, 1.1],
  [18, 72, 0.9],
  [36, 88, 1.3],
  [58, 70, 0.6],
  [78, 86, 1],
  [90, 22, 0.8],
  [8, 48, 0.7],
  [52, 46, 1.5],
  [64, 12, 0.6],
  [22, 28, 0.5],
  [40, 60, 0.9],
] as const;

export type CardState = 'idle' | 'picked' | 'dismissed';

interface SiteCardProps {
  card: Card;
  site: Site | undefined;
  difficulty: Difficulty;
  image: string | null;
  index: number;
  /** True when this card is being dealt (slide + flip); false shows it face-up with a fade. */
  dealt: boolean;
  timeline: DealTimeline;
  state: CardState;
  clickable: boolean;
  onPick: (slot: number) => void;
  /** Historical mode: Sun elevation (degrees) at the real touchdown time at this site. */
  landingSunEl?: number;
}

const ANIMATE = {
  idle: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 },
  picked: { opacity: 1, x: 0, y: -22, rotate: 0, scale: 1.06 },
  dismissed: { opacity: 0, x: 0, y: 24, rotate: 0, scale: 0.9 },
};

export function SiteCard(props: SiteCardProps) {
  const {
    card,
    site,
    difficulty,
    image,
    index,
    dealt,
    timeline,
    state,
    clickable,
    onPick,
    landingSunEl,
  } = props;
  const label = `Landing site ${card.slot}`;
  const bars = site ? qualityBars(site, difficulty) : [];

  return (
    <motion.div
      className="[perspective:900px]"
      initial={dealt ? { opacity: 0, x: 60, y: -50, rotate: 8, scale: 1 } : { opacity: 0 }}
      animate={ANIMATE[state]}
      transition={
        state === 'idle'
          ? {
              delay: dealt ? timeline.slideDelay(index) : 0,
              duration: dealt ? timeline.slideDuration : 0.25,
            }
          : { duration: 0.4 }
      }
    >
      <motion.button
        type="button"
        disabled={!clickable}
        data-sfx={clickable ? 'hover' : undefined}
        onClick={() => onPick(card.slot)}
        aria-label={`Choose ${label}`}
        className={clsx(
          'group relative block w-full text-left [transform-style:preserve-3d] focus-visible:outline-none',
          clickable ? 'cursor-pointer' : 'cursor-default',
        )}
        initial={{ rotateY: dealt ? 180 : 0 }}
        animate={{ rotateY: 0 }}
        transition={{
          delay: dealt ? timeline.flipDelay(index) : 0,
          duration: timeline.flipDuration,
        }}
      >
        {/* Front (face-up). */}
        <div
          className={clsx(
            'mission-pixel flex flex-col gap-2 border-4 border-black bg-navy-850 p-2 [backface-visibility:hidden]',
            'transition-[translate,box-shadow,border-color] duration-150 ease-out',
            clickable &&
              'group-hover:border-warn group-hover:-translate-y-1 group-hover:shadow-[4px_8px_0_#000,0_0_18px_#ffcc4d55] group-focus-visible:border-warn group-focus-visible:-translate-y-1 group-focus-visible:shadow-[4px_8px_0_#000,0_0_0_3px_#ffcc4d] group-active:translate-y-0 group-active:shadow-[2px_2px_0_#000]',
            state === 'picked' && 'border-warn',
          )}
        >
          <div className="flex items-center justify-between gap-1 border-b-2 border-black pb-1">
            <span className="text-warn font-mono text-[13px] font-bold tracking-wider uppercase">
              {label}
            </span>
            {clickable && (
              <kbd
                aria-hidden
                className="shrink-0 border border-black bg-black px-1 font-mono text-[10px] text-ink-muted"
              >
                {card.slot}
              </kbd>
            )}
          </div>
          <GameImage
            src={image}
            alt={`${label} terrain illustration`}
            label="Illustration pending"
            className="h-24 w-full border-2 border-black"
          />
          {landingSunEl !== undefined && (
            <p className="flex items-center justify-between gap-1 border-2 border-black bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-ink">
              <span className="text-sun">☀ Sun at touchdown</span>
              <span className="font-bold text-white">{`${landingSunEl.toFixed(0)}°`}</span>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {bars.map((b) => (
              <QualityBar key={b.key} bar={b} showValue={difficulty === 'expert'} />
            ))}
          </div>
          {clickable && (
            <span className="text-center font-mono text-[10px] tracking-widest text-ink-muted uppercase group-hover:text-warn">
              ▶ Land here
            </span>
          )}
        </div>

        {/* Back (face-down). */}
        <div
          aria-hidden
          className="mission-pixel absolute inset-0 overflow-hidden border-4 border-black bg-black [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
            {STARS.map(([x, y, r]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#f4f7ff" />
            ))}
          </svg>
          <div className="relative flex size-full items-end justify-center p-3">
            <span className="border border-white/30 bg-black/70 px-2 py-0.5 font-mono text-[12px] font-bold tracking-wider text-white uppercase">
              {label}
            </span>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
