import { NavLink } from 'react-router';
import { Compass, Mountain, Rocket } from 'lucide-react';
import type { AppMode } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import { useAppStore } from '../store';
import { MODES, pathForMode } from '../navigation';

const ICONS: Record<AppMode, typeof Compass> = {
  explore: Compass,
  streetview: Mountain,
  game: Rocket,
};

export function MobileNav() {
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  return (
    <nav
      aria-label="Modes"
      className="border-line bg-space-950/95 fixed inset-x-0 bottom-0 z-30 flex h-14 border-t backdrop-blur-md md:hidden"
    >
      {MODES.map((m) => {
        const Icon = ICONS[m.id];
        return (
          <NavLink
            key={m.id}
            to={pathForMode(m.id, selectedSiteId)}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
                isActive ? 'text-ink' : 'text-ink-faint',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {m.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
