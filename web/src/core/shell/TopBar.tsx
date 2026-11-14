import { Link, NavLink } from 'react-router';
import { Info, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { useData, useSelectedSite } from '../data';
import { MODES, pathForMode } from '../navigation';
import { Logo } from './Logo';

export function TopBar() {
  const isMock = useData((s) => s.isMock);
  const site = useSelectedSite();
  const selectSite = useAppStore((s) => s.selectSite);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);

  return (
    <header className="border-line bg-space-950/80 relative z-20 flex h-14 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-md md:px-5">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Lunar Site Evaluator home">
        <Logo className="size-7" />
        <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
          Lunar Site Evaluator
        </span>
      </Link>

      <nav aria-label="Modes" className="ml-4 hidden items-center gap-1 md:flex">
        {MODES.map((m) => (
          <NavLink
            key={m.id}
            to={pathForMode(m.id, selectedSiteId)}
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-space-700 text-ink'
                  : 'text-ink-muted hover:text-ink hover:bg-space-800',
              )
            }
          >
            {m.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {isMock && (
          <span
            className="border-warn/40 text-warn rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase"
            title="The app is showing invented placeholder data until the real pipeline output lands."
          >
            Mock data
          </span>
        )}
        {site && (
          <span className="bg-space-800 border-line flex max-w-[50vw] items-center gap-1.5 rounded-lg border py-1 pr-1 pl-2.5 text-sm">
            <MapPin className="text-accent size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{site.name}</span>
            <button
              type="button"
              onClick={() => selectSite(null)}
              className="text-ink-faint hover:text-ink rounded p-0.5"
              aria-label="Clear selected site"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
        <NavLink
          to="/about"
          className={({ isActive }) =>
            cn(
              'rounded-lg p-2 transition-colors',
              isActive ? 'bg-space-700 text-ink' : 'text-ink-muted hover:text-ink',
            )
          }
          aria-label="About and data credits"
        >
          <Info className="size-4" />
        </NavLink>
      </div>
    </header>
  );
}
