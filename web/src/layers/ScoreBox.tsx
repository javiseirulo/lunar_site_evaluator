import { scoreColor } from './scoreColor';

/** Score in a glowing outlined box, coloured by score. */
export function ScoreBox({ score, size = 'md' }: { score: number; size?: 'md' | 'lg' }) {
  const color = scoreColor(score);
  return (
    <div
      className="rounded-[6px] border-2 px-3 py-1 text-center"
      style={{
        borderColor: color,
        color,
        boxShadow: `0 0 14px -4px ${color}, inset 0 0 12px -6px ${color}`,
      }}
      title="Score from 0 to 100"
    >
      {size === 'md' && <div className="text-ink text-[12px]">Score</div>}
      <div
        className={`num font-black ${size === 'lg' ? 'text-[34px]' : 'text-[26px]'} leading-none`}
      >
        {Math.round(score * 100)}
      </div>
    </div>
  );
}
