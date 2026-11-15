import { Suspense, useEffect } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import { loadCoreData, useData } from '../data';
import { ModeSync } from '../ModeSync';
import { Masthead } from './Masthead';
import { Footer } from './Footer';
import { Loading } from './Loading';

export function AppShell() {
  const { pathname } = useLocation();
  const status = useData((s) => s.status);
  const error = useData((s) => s.error);

  useEffect(() => {
    void loadCoreData();
  }, []);

  const stage = pathname === '/explore' || pathname.startsWith('/compare');

  return (
    <div
      className={
        stage
          ? 'flex h-full flex-col overflow-hidden px-3 pt-3 sm:px-4'
          : 'flex min-h-full flex-col px-4 pt-4 sm:px-6 sm:pt-5'
      }
    >
      {/* New pages open at the top (Back restores the previous position; #anchors still work). */}
      <ScrollRestoration />
      <ModeSync />
      <Masthead />
      <main className={stage ? 'mt-1 flex min-h-0 flex-1 flex-col' : 'portal mt-3 flex-1'}>
        {status === 'error' ? (
          <div className="box">
            <div className="box-head">Data failed to load</div>
            <p className="box-body text-ink-muted">{error}</p>
          </div>
        ) : (
          <Suspense fallback={<Loading />} key={pathname.split('/')[1]}>
            <Outlet />
          </Suspense>
        )}
      </main>
      {!stage && <Footer />}
    </div>
  );
}
