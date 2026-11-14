import { Link } from 'react-router';
import { TimeBar } from '@/core/shell/TimeBar';
import { useSelectedSite } from '@/core';
import { StreetView } from '@/streetview/StreetView';

export default function StreetViewPage() {
  const site = useSelectedSite();
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      <div className="min-h-0 flex-1">
        {site ? (
          <StreetView />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-ink-muted">Choose a site first.</p>
            <Link
              to="/explore"
              className="bg-ink text-space-950 hover:bg-accent rounded-lg px-4 py-2 text-sm font-medium"
            >
              Go to Explore
            </Link>
          </div>
        )}
      </div>
      <TimeBar className="shrink-0" />
    </div>
  );
}
