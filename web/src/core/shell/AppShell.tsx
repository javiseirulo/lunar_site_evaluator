import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { loadCoreData, useData } from '../data';
import { ModeSync } from '../ModeSync';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { Loading } from './Loading';

export function AppShell() {
  const { pathname } = useLocation();
  const status = useData((s) => s.status);
  const error = useData((s) => s.error);

  useEffect(() => {
    void loadCoreData();
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        className="starfield animate-twinkle pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
      />
      <ModeSync />
      <TopBar />
      <main className="relative flex min-h-0 flex-1 flex-col pb-14 md:pb-0">
        {status === 'error' ? (
          <div className="m-auto max-w-md p-6 text-center">
            <p className="eyebrow mb-2">Data failed to load</p>
            <p className="text-ink-muted text-sm">{error}</p>
          </div>
        ) : (
          <Suspense fallback={<Loading />} key={pathname.split('/')[1]}>
            <Outlet />
          </Suspense>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
