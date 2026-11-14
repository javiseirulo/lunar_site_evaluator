import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
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

  return (
    <div className="flex min-h-full flex-col px-4 pt-4 sm:px-6 sm:pt-5">
      <ModeSync />
      <Masthead />
      <main className="portal mt-3 flex-1">
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
      <Footer />
    </div>
  );
}
