/** End-of-round buttons shared by the verdict and timeout screens. */
import { Home, RotateCcw, Shuffle } from 'lucide-react';
import { useGame } from '../state/gameStore';

export function GameButtons() {
  const canRetry = useGame((s) => s.hand !== null);
  const retry = useGame((s) => s.retry);
  const newGame = useGame((s) => s.newGame);
  const quit = useGame((s) => s.quit);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRetry && (
        <button type="button" className="btn btn-go h-10 px-4 text-[12px]" onClick={() => retry()}>
          <RotateCcw className="size-4" aria-hidden />
          Try again
        </button>
      )}
      <button type="button" className="btn h-10 px-4 text-[12px]" onClick={() => newGame()}>
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
