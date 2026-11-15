/** Result of the chosen card: stars on a win, cause + lesson on a loss, and the real site name. */
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '@/core';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import type { Verdict } from '../engine/simulate';
import { useGame } from '../state/gameStore';
import { verdictImage } from './assets';
import { CAUSE_HEADLINE, lessonFor } from './content';
import { GameButtons } from './GameButtons';
import { GameImage } from './GameImage';

const MISSION_HOURS = DEFAULT_REQUIREMENTS.surface_days * 24;

/** Three big stars, the middle one raised, filled up to `count`. */
function Stars({ count }: { count: number }) {
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
            transition={{ delay: 0.3 + n * 0.25, type: 'spring', stiffness: 260, damping: 12 }}
            className={clsx('block', n === 2 && '-translate-y-3')}
          >
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

function failedWhen(v: Verdict): string {
  if (v.failHour === null) return '';
  if (v.failHour === 0) return 'Failed on touchdown.';
  return `Failed at hour ${v.failHour} of ${MISSION_HOURS}.`;
}

export function VerdictScreen() {
  const hand = useGame((s) => s.hand);
  const chosenSlot = useGame((s) => s.chosenSlot);
  const sites = useData((s) => s.sites);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={clsx(
        'mission-scan flex flex-1 flex-col gap-4 border-4 p-4 md:flex-row',
        v.win ? 'border-good bg-[#06140c]' : 'border-bad bg-[#14060a]',
      )}
    >
      <GameImage
        src={verdictImage(v.win ? 'win' : (v.cause ?? 'slope'))}
        alt={v.win ? 'Lander safe on the surface' : 'Lander mission failure'}
        label="Scene pending"
        className="mission-pixel h-48 w-full shrink-0 border-4 border-black md:h-auto md:w-2/5"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2
          className={clsx(
            'font-mono text-2xl font-bold tracking-widest uppercase',
            v.win ? 'text-good' : 'text-bad',
          )}
        >
          {v.win ? 'Mission success' : 'Mission failed'}
        </h2>

        {v.win ? (
          <>
            <Stars count={v.stars} />
            <p className="text-[14px] font-bold text-white">
              Congratulations! The site you chose is fit for the mission!
            </p>
          </>
        ) : (
          <p className="text-[16px] font-bold text-white">
            {v.cause ? CAUSE_HEADLINE[v.cause] : 'The mission did not survive.'}
          </p>
        )}

        <p className="text-ink">
          You landed at <span className="text-warn font-bold">{siteName}</span>{' '}
          <span className="text-ink-faint">(Landing site {card.slot})</span>.
        </p>
        <p className="font-mono text-[11.5px] text-ink-muted">
          {v.detail}
          {!v.win && ` ${failedWhen(v)}`}
        </p>
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
