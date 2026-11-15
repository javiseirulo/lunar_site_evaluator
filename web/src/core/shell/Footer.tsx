import { Link } from 'react-router';
import { useAppStore } from '../store';
import { useData } from '../data';
export function Footer() {
  const manifest = useData((s) => s.manifest);
  const proMode = useAppStore((s) => s.proMode);
  return (
    <footer className="portal mt-10 mb-8 px-1 text-center text-[12px] text-ink-faint">
      <div className="border-edge border-t pt-2 leading-relaxed">
        <p>
          Built for the NASA Space Apps Challenge 2026 at the Madrid local event. An independent
          project, not affiliated with or endorsed by NASA.
        </p>
        <p hidden={proMode}>
          <Link to="/about" className="lnk">
            Data and method
          </Link>
        </p>
        <p hidden={!proMode}>
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
      <Link to="/" className="btn mt-4 inline-flex h-[40px] px-5 text-[13px]">
        Back to the landing page
      </Link>
    </footer>
  );
}
