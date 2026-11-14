/** Lunar Street View — Pablo. Selection, data and time remain owned by @/core. */
import { lazy, Suspense, useMemo, useState } from 'react';
import { formatUtc, useAppStore, useData, useSelectedSite, useTimeseries } from '@/core';
import { sampleSiteSky } from './geometry';

const LunarViewport = lazy(() => import('./LunarViewport'));

export function StreetView() {
  const site = useSelectedSite();
  const time = useAppStore((state) => state.currentTimeUTC);
  const series = useTimeseries(site?.id);
  const seriesError = useData((state) => (site ? state.timeseriesErrors[site.id] : undefined));
  const mockSites = useData((state) => state.sitesFile?.mock ?? true);
  const [token, setToken] = useState<string>(
    () => import.meta.env.VITE_CESIUM_ION_TOKEN?.trim() ?? '',
  );
  const [draftToken, setDraftToken] = useState('');
  const [configure, setConfigure] = useState(false);
  const [accessRevision, setAccessRevision] = useState(0);
  const instanceId = `${site?.id ?? ''}:${accessRevision}`;
  const observer = useMemo(() => (site ? { lat: site.lat, lon: site.lon } : null), [site]);
  const sample = useMemo(
    () => (site ? sampleSiteSky(series, site.id, time) : null),
    [site, series, time],
  );
  if (!site || !observer) return <p className="p-4">Choose a site in Explore.</p>;
  const isMock = mockSites || !!series?.mock;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-1 text-white">
        <span className="font-mono">
          {site.lat.toFixed(4)}° lat · {site.lon.toFixed(4)}° E
        </span>
        <span>
          {isMock ? 'MOCK coordinates / sky data' : 'Pipeline sky data'} · Cesium visual terrain
        </span>
        {import.meta.env.DEV && (
          <button className="btn" onClick={() => setConfigure((value) => !value)}>
            Access settings
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden border border-slate-500 bg-black">
        {!token || configure ? (
          import.meta.env.DEV ? (
            <form
              className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-white"
              onSubmit={(event) => {
                event.preventDefault();
                if (draftToken.trim()) {
                  setToken(draftToken.trim());
                  setDraftToken('');
                  setConfigure(false);
                  setAccessRevision((revision) => revision + 1);
                }
              }}
            >
              <p className="font-bold">Connect Cesium Moon</p>
              <p className="max-w-lg">
                Use a Cesium ion application token with read access to Cesium Moon (asset 2684829).
              </p>
              <label className="flex w-full max-w-sm flex-col gap-1 text-left">
                Application access token
                <input
                  className="field"
                  type="password"
                  value={draftToken}
                  autoComplete="off"
                  onChange={(event) => setDraftToken(event.target.value)}
                  required
                />
              </label>
              <button className="btn btn-go" type="submit">
                Load lunar surface
              </button>
              {token && (
                <button className="btn" type="button" onClick={() => setConfigure(false)}>
                  Keep current access
                </button>
              )}
              <p className="max-w-lg text-[10px]">
                Used while this view is open; not saved in browser storage. Scene imagery may
                contain baked-in shadows.
              </p>
              <a
                className="underline"
                href="https://ion.cesium.com/tokens"
                target="_blank"
                rel="noreferrer"
              >
                Open Cesium ion tokens
              </a>
            </form>
          ) : (
            <p className="p-4 text-white">
              Lunar terrain is not configured for this deployment. Sky data remains available below.
            </p>
          )
        ) : (
          <Suspense
            fallback={
              <p className="p-4 text-white" role="status">
                Loading the lunar viewer…
              </p>
            }
          >
            <LunarViewport key={instanceId} observer={observer} token={token} sample={sample} />
          </Suspense>
        )}
      </div>
      <div className="border border-slate-500 bg-slate-950 p-2 text-white" aria-live="polite">
        {sample ? (
          <>
            <p>
              Sky sample: {formatUtc(sample.t_utc)} · step {series!.step_s / 60} min
            </p>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-mono">
              <span className="text-sun">
                Sun az {sample.sun_az.toFixed(1)}° · el {sample.sun_el.toFixed(2)}° ·{' '}
                {sample.lit ? 'clear' : 'hidden'}
              </span>
              <span className="text-earth">
                Earth az {sample.earth_az.toFixed(1)}° · el {sample.earth_el.toFixed(2)}° ·{' '}
                {sample.earthVisible === null
                  ? 'visibility unavailable'
                  : sample.earthVisible
                    ? 'clear'
                    : 'hidden'}
              </span>
            </div>
            <p className="mt-1 text-[10px]">
              Markers show directions, not physical disk sizes. Visibility flags come from{' '}
              {isMock ? 'synthetic fixtures' : 'the pipeline'}, not rendered shadows.
            </p>
          </>
        ) : (
          <p>
            {seriesError
              ? 'Sky data could not be loaded.'
              : series
                ? 'No sky data for this observer and time. No extrapolation is shown.'
                : 'Loading sky data…'}
          </p>
        )}
      </div>
    </div>
  );
}
