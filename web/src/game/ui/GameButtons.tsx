/**
 * End-of-round buttons shared by the verdict and timeout screens. "Retry this hand" is the main
 * button after a loss; after a win "New mission" is.
 */
import { clsx } from 'clsx';
import { Home, RotateCcw, Shuffle } from 'lucide-react';
import { useGame } from '../state/gameStore';

export function GameButtons() {
  const canRetry = useGame((s) => s.hand !== null);
  const retry = useGame((s) => s.retry);
  const newGame = useGame((s) => s.newGame);
  const quit = useGame((s) => s.quit);
  const won = useGame(
    (s) =>
      s.phase === 'verdict' &&
      (s.hand?.cards.find((c) => c.slot === s.chosenSlot)?.verdict.win ?? false),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRetry && (
        <button
          type="button"
          className={clsx('btn h-10 px-4 text-[12px]', !won && 'btn-go')}
          onClick={() => retry()}
        >
          <RotateCcw className="size-4" aria-hidden />
          Retry this hand
        </button>
      )}
      <button
        type="button"
        className={clsx('btn h-10 px-4 text-[12px]', (won || !canRetry) && 'btn-go')}
        onClick={() => newGame()}
      >
        <Shuffle className="size-4" aria-hidden />
        New mission
      </button>
      <button type="button" className="btn h-10 px-3 text-[12px]" onClick={quit}>
        <Home className="size-4" aria-hidden />
        Menu
      </button>
    </div>
  );
}
