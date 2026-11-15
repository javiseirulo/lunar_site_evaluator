/**
 * Title screen: pick the difficulty, then a mode (South Pole now, Historical later). Drawn over
 * MissionGame's background globe (the spinning Moon).
 */
import { Lock, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '@/core';
import { difficultyHint, type Difficulty } from '../engine/bars';
import { southPoleSites } from '../engine/deal';
import { useGame } from '../state/gameStore';
import { MODE_HISTORICAL, MODE_SOUTH_POLE } from './assets';
import { GameImage } from './GameImage';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'expert', label: 'Expert' },
];

export function MenuScreen() {
  const difficulty = useGame((s) => s.difficulty);
  const setDifficulty = useGame((s) => s.setDifficulty);
  const start = useGame((s) => s.start);
  // The hint lists the bars a real card shows (pending metrics are omitted from the cards).
  const sample = useData((s) => (s.sites ? southPoleSites(s.sites)[0] : undefined));

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden p-6">
      {/* The spinning Moon behind comes from MissionGame's background globe (MENU_BG without WebGL). */}
      <div aria-hidden className="mission-scan absolute inset-0" />

      <header className="relative text-center">
        <p className="text-warn font-mono text-[11px] tracking-[0.4em] uppercase">
          Lunar landing site navigator
        </p>
        <h1 className="font-mono text-4xl font-bold tracking-[0.15em] text-white uppercase [text-shadow:4px_4px_0_#000]">
          Mission
        </h1>
        <p className="mt-2 font-mono text-[12px] text-ink">
          Pick a landing site in 3 minutes. Survive 7 days.
        </p>
      </header>

      <div className="relative flex flex-col items-center gap-2">
        <span className="label">Difficulty</span>
        <div
          role="group"
          aria-label="Difficulty"
          className="mission-pixel flex border-2 border-black"
        >
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={difficulty === d.id}
              onClick={() => setDifficulty(d.id)}
              className={clsx(
                'min-h-10 cursor-pointer px-5 font-mono text-[12px] font-bold tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current',
                difficulty === d.id
                  ? 'bg-warn text-black'
                  : 'bg-black text-ink-muted hover:text-white',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-ink-muted font-mono text-[11px]">{difficultyHint(difficulty, sample)}</p>
      </div>

      <div className="relative grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start()}
          data-sfx="hover"
          className="mission-pixel group flex cursor-pointer flex-col border-4 border-black bg-navy-800 text-left transition-[translate,border-color] duration-150 hover:-translate-y-1 hover:border-warn focus-visible:-translate-y-1 focus-visible:border-warn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn active:translate-y-0"
        >
          <GameImage
            src={MODE_SOUTH_POLE}
            alt="South Pole mission"
            label="South Pole art pending"
            className="h-32 w-full border-b-4 border-black"
          />
          <span className="flex items-center justify-between gap-2 p-3">
            <span className="font-mono text-[15px] font-bold tracking-wider text-white uppercase">
              South Pole mission
            </span>
            <Play
              className="text-warn size-5 transition-transform group-hover:scale-125"
              aria-hidden
            />
          </span>
        </button>

        <button
          type="button"
          disabled
          aria-label="Historical missions (coming soon)"
          className="mission-pixel relative flex cursor-not-allowed flex-col border-4 border-black bg-navy-900 text-left opacity-60 grayscale"
        >
          <GameImage
            src={MODE_HISTORICAL}
            alt="Historical missions"
            label="Historical art pending"
            className="h-32 w-full border-b-4 border-black"
          />
          <span className="flex items-center justify-between gap-2 p-3">
            <span className="font-mono text-[15px] font-bold tracking-wider text-white uppercase">
              Historical missions
            </span>
            <Lock className="size-5 text-ink-faint" aria-hidden />
          </span>
          <span
            id="mission-historical-soon"
            className="absolute top-2 right-2 border-2 border-black bg-warn px-1.5 font-mono text-[10px] font-bold text-black uppercase"
          >
            Coming soon
          </span>
        </button>
      </div>
    </div>
  );
}
