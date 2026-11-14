import { Link } from 'react-router';
import { TimeBar } from '@/core/shell/TimeBar';
import { useSelectedSite } from '@/core';
import { StreetView } from '@/streetview/StreetView';

export default function StreetViewPage() {
  const site = useSelectedSite();
  return (
    <div className="flex flex-col gap-3">
      <section className="box">
        <div className="box-head">
          Street View
          {site && <span className="ml-auto font-sans font-normal">{site.name}</span>}
        </div>
        <div className="space h-[460px] p-3">
          {site ? (
            <StreetView />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-ink-muted">No site selected. Choose one first.</p>
              <Link to="/explore" className="btn btn-go">
                Go to Explore
              </Link>
            </div>
          )}
        </div>
      </section>
      <TimeBar />
    </div>
  );
}
