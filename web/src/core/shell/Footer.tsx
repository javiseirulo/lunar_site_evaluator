import { Link } from 'react-router';
import { useData } from '../data';
import { ALL_PAGES } from '../navigation';

const LINKS = ALL_PAGES.map((t) => ({ to: t.path, label: t.label }));

export function Footer() {
  const manifest = useData((s) => s.manifest);
  return (
    <footer className="portal text-ink-faint mt-3 mb-6 px-1 text-center text-[11px]">
      <p className="mb-2">
        {LINKS.map((l, i) => (
          <span key={l.to}>
            {i > 0 && ' | '}[
            <Link to={l.to} className="lnk">
              {l.label}
            </Link>
            ]
          </span>
        ))}
      </p>
      <div className="border-edge border-t pt-2 leading-relaxed">
        <p>
          Built for the NASA Space Apps Challenge 2026 · Madrid local event · Independent project,
          not affiliated with or endorsed by NASA.
        </p>
        <p>
          Data: LOLA (LRO) topography · NAIF SPICE ephemerides · JPL Horizons checks
          {manifest && (
            <>
              {' '}
              · Data files generated{' '}
              <span className="num">{manifest.generated_utc.slice(0, 10)}</span>
              {manifest.mock && <span className="text-warn"> (mock)</span>}
            </>
          )}
        </p>
      </div>
    </footer>
  );
}
