/** Title screen: pick a mode (South Pole now, Historical later) and the difficulty. */
import { Lock, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { useData } from '@/core';
import { difficultyHint, type Difficulty } from '../engine/bars';
import { southPoleSites } from '../engine/deal';
import { useGame } from '../state/gameStore';
import { MENU_BG, MODE_HISTORICAL, MODE_SOUTH_POLE } from './assets';
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
      <GameImage
        src={MENU_BG}
        alt=""
        className="absolute inset-0 size-full opacity-60"
        fallback={
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,#2a5aa6_0%,#061022_55%,#02050c_100%)]"
          />
        }
      />
      <div aria-hidden className="mission-scan absolute inset-0" />

      <header className="relative text-center">
        <p className="text-warn font-mono text-[11px] tracking-[0.4em] uppercase">
          Lunar landing site navigator
        </p>
        <h1 className="font-mono text-4xl font-bold tracking-[0.15em] text-white uppercase [text-shadow:4px_4px_0_#000]">
          Mission
        </h1>
      </header>

      <div className="relative grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start()}
          data-sfx="hover"
          className="mission-pixel group flex cursor-pointer flex-col border-4 border-black bg-navy-800 text-left hover:border-warn focus-visible:border-warn"
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
            <Play className="text-warn size-5 group-hover:scale-125" aria-hidden />
          </span>
        </button>

        <button
          type="button"
          disabled
          aria-describedby="mission-historical-soon"
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
                'cursor-pointer px-5 py-1.5 font-mono text-[12px] font-bold tracking-wider uppercase',
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
    </div>
  );
}
