import { clsx } from 'clsx';
import type { BoardRow } from './types';

export function Ranking({
  board,
  limit,
  highlight,
}: {
  board: readonly BoardRow[];
  limit: number;
  highlight?: string;
}) {
  const rows = board.slice(0, limit);
  if (rows.length === 0)
    return <p className="text-ink-muted font-mono text-[12px]">No players yet.</p>;
  return (
    <ol className="mission-pixel flex flex-col border-4 border-black bg-navy-900">
      {rows.map((r, i) => (
        <li
          key={r.sid}
          className={clsx(
            'flex items-center justify-between gap-3 border-b-2 border-black px-3 py-1.5 font-mono text-[13px] last:border-b-0',
            r.sid === highlight && 'bg-warn text-black',
          )}
        >
          <span className="flex min-w-0 gap-3">
            <b className="w-5 text-right">{i + 1}</b>
            <span className="truncate">{r.name}</span>
          </span>
          <b>{r.score}</b>
        </li>
      ))}
    </ol>
  );
}

/** Top three, 2nd-1st-3rd, as stepped blocks. */
export function Podium({ board }: { board: readonly BoardRow[] }) {
  const order = [1, 0, 2];
  const heights = ['h-28', 'h-40', 'h-20'];
  return (
    <div className="flex items-end justify-center gap-2">
      {order.map((idx, col) => {
        const r = board[idx];
        if (!r) return <div key={idx} className="w-28" />;
        return (
          <div key={r.sid} className="flex w-28 flex-col items-center gap-1 md:w-36">
            <span className="max-w-full truncate font-mono text-[13px] font-bold">{r.name}</span>
            <span className="text-warn font-mono text-[12px]">{r.score}</span>
            <div
              className={clsx(
                'mission-pixel flex w-full items-start justify-center border-4 border-black bg-warn pt-2 font-mono text-3xl font-bold text-black',
                heights[col],
              )}
            >
              {idx + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
