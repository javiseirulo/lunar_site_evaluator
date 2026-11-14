import { Link } from 'react-router';
import { useData } from '../data';
import { ALL_PAGES } from '../navigation';

const LINKS = ALL_PAGES.map((t) => ({ to: t.path, label: t.label }));

export function Footer() {
  const manifest = useData((s) => s.manifest);
  return (
    <footer className="portal text-ink-faint mt-10 mb-8 px-1 text-center text-[12px]">
      <nav aria-label="All pages" className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="text-ink-muted hover:text-heading">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="border-edge border-t pt-2 leading-relaxed">
        <p>
          Built for the NASA Space Apps Challenge 2026 at the Madrid local event. An independent
          project, not affiliated with or endorsed by NASA.
        </p>
        <p>
          Data from LOLA (LRO) topography and NAIF SPICE ephemerides, checked against JPL Horizons.
          {manifest && (
            <>
              {' '}
              Data files generated{' '}
              <span className="num">{manifest.generated_utc.slice(0, 10)}</span>
              {manifest.mock && <span className="text-warn"> (mock)</span>}
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
