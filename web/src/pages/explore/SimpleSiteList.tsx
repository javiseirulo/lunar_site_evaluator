/**
 * Normal-mode site picker for Explore: every site, one tap to select.
 * Expert mode uses the requirements-driven list in `@/globe` instead.
 */
import { useAppStore, useData } from '@/core';
import { cn } from '@/lib/utils';
import { YourPoints } from '@/globe';

export function SimpleSiteList({ className }: { className?: string }) {
  const sites = useData((s) => s.sites);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const requestSelection = useAppStore((s) => s.requestSelection);
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
        Select a site to learn whether it works for the mission
      </p>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sorted.map((s) => {
          const selected = s.id === selectedSiteId;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  requestSelection(selected ? null : { kind: 'site', id: s.id, name: s.name })
                }
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-[7px] text-left text-[14px]',
                  selected ? 'bg-warn text-black' : 'hover:bg-panel-2',
                )}
              >
                <span
                  className={cn(
                    'size-2 shrink-0 border',
                    selected ? 'border-black' : 'border-ink-muted',
                  )}
                  aria-hidden
                />
                <span className="truncate">{s.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <YourPoints />
    </section>
  );
}
