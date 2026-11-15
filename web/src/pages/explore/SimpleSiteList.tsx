/**
 * Normal-mode site picker for Explore: every site, best first, one tap to select.
 * Expert mode uses the requirements-driven list in `@/globe` instead.
 */
import { evaluationLabel, lowScoreReason, useAppStore, useData } from '@/core';
import { scoreColor } from '@/layers';
import { cn } from '@/lib/utils';

export function SimpleSiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const evaluation = useData((s) => s.sitesFile?.evaluation);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  if (!sites) return null;
  const sorted = [...sites].sort((a, b) => b.score - a.score);

  return (
    <section className={cn('box flex min-h-0 flex-col', className)} aria-labelledby="sites-heading">
      <h2
        id="sites-heading"
        className="px-5 pt-4 pb-2 font-mono text-[13px] tracking-[0.12em] uppercase"
      >
        Pick a site
      </h2>
      <p className="text-ink-muted px-5 pb-2 text-[12px]">
        {evaluationLabel(evaluation) ?? 'Site score'} · every site can be explored
      </p>
      <ul className="max-h-[420px] overflow-y-auto px-2 pb-3">
        {sorted.map((s) => {
          const selected = s.id === selectedSiteId;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={selected}
                title={lowScoreReason(s) ?? undefined}
                onClick={() => selectSite(selected ? null : s.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-[7px] text-left text-[14px]',
                  selected ? 'bg-warn text-black' : 'hover:bg-panel-2',
                )}
              >
                <span
                  className="size-2.5 shrink-0 border border-black"
                  style={{ background: scoreColor(s.score) }}
                  aria-hidden
                />
                <span className="truncate">{s.name}</span>
                <span className="num ml-auto text-[12px]">{Math.round(s.score * 100)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
