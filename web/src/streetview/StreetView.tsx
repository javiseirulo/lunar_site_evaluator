/** Pablo's viewer: real shared ephemerides, sourced catalogue, local camera. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { dataUrl, formatUtc, useAppStore } from '@/core';
import { choiceGroups } from '@/core/siteChoices';
import { CESIUM_APPLICATION_TOKEN } from './cesiumAccess';
import { useEphem, useHorizon } from '@/ephem';
import { observerSky, type TerrainSite } from './sky';
import { surfaceDistance } from './navigation';
import type { Observer } from './lunarScene';
import { DEFAULT_VIEW, initialPoint, makeViewLink, readViewLink, type ViewState } from './viewLink';
import { ShareView } from './ShareView';
import { StreetViewClock } from './StreetViewClock';
import './streetview.css';

const LunarViewport = lazy(() => import('./LunarViewport'));
interface Catalog {
  version: number;
  mock: boolean;
  sites: TerrainSite[];
}

export function StreetView() {
  const { siteId } = useParams();
  const selected = useAppStore((s) => s.selectedSiteId);
  const id = siteId || selected || 'shackleton_rim_01';
  return <ObserverView key={id} siteId={id} />;
}

function ObserverView({ siteId }: { siteId: string }) {
  const navigate = useNavigate();
  const time = useAppStore((s) => s.currentTimeUTC);
  const setTime = useAppStore((s) => s.setTime);
  const selectSite = useAppStore((s) => s.selectSite);
  const selectedPoint = useAppStore((s) => s.selectedPoint);
  const setSelectedPoint = useAppStore((s) => s.setSelectedPoint);
  const margin = useAppStore((s) => s.missionConfig.antenna_margin_deg ?? 2);
  const [shared] = useState(() => readViewLink(new URL(window.location.href)));
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [retry, setRetry] = useState(0);
  const [startingPoint] = useState(() =>
    initialPoint(shared.point, siteId, useAppStore.getState().selectedSiteId, selectedPoint),
  );
  const [activePoint, setActivePoint] = useState<Observer | null>(startingPoint);
  const [view, setView] = useState<ViewState>(shared.view);
  const [meshGround, setMeshGround] = useState<number | null>(null);
  const [token, setToken] = useState(CESIUM_APPLICATION_TOKEN);
  const [draft, setDraft] = useState('');
  const [configure, setConfigure] = useState(false);
  const [accessRevision, setAccessRevision] = useState(0);
  useEffect(() => {
    if (shared.time) setTime(shared.time);
  }, [shared, setTime]);
  useEffect(() => {
    const abort = new AbortController();
    void fetch(dataUrl('terrain/catalog.json'), { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The sourced terrain catalogue could not be loaded.');
        const data = (await response.json()) as Catalog;
        if (
          data.version !== 1 ||
          data.mock ||
          !data.sites?.length ||
          data.sites.some((s) => !Number.isFinite(s.lat + s.lon + s.elev_m))
        )
          throw new Error('Invalid terrain catalogue.');
        setCatalog(data);
        setCatalogError('');
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setCatalogError(error instanceof Error ? error.message : 'Catalogue unavailable.');
      });
    return () => abort.abort();
  }, [retry]);
  const site = catalog?.sites.find((s) => s.id === siteId) ?? null;
  const observer = useMemo(() => (site ? { lat: site.lat, lon: site.lon } : null), [site]);
  const activeObserver = activePoint ?? observer;
  useEffect(() => {
    if (catalog && activeObserver) setSelectedPoint(activeObserver);
  }, [catalog, activeObserver, setSelectedPoint]);
  const terrainPoint = useMemo(
    () =>
      activeObserver
        ? (catalog?.sites.find((s) => surfaceDistance(s, activeObserver) < 0.01) ?? null)
        : null,
    [activeObserver, catalog],
  );
  const horizon = useHorizon(terrainPoint?.horizon_file ? terrainPoint.id : null);
  const parsedTime = Date.parse(time);
  const ephem = useEphem(
    time,
    Number.isFinite(parsedTime) ? new Date(parsedTime + 1).toISOString() : time,
  );
  const sample =
    activeObserver && horizon.status !== 'loading'
      ? observerSky(activeObserver, time, view.height, terrainPoint, horizon.horizon, margin)
      : null;
  const onObserver = useCallback((point: Observer) => {
    setActivePoint(point);
    setMeshGround(null);
  }, []);
  const onView = useCallback((state: ViewState) => setView(state), []);
  const returnToMap = useCallback(() => {
    if (activeObserver) useAppStore.getState().setSelectedPoint(activeObserver);
    navigate('/explore?view=3d');
  }, [activeObserver, navigate]);
  const initialObserver = useMemo(() => startingPoint ?? observer, [startingPoint, observer]);
  const shareUrl = useMemo(
    () =>
      activeObserver
        ? makeViewLink(new URL(window.location.href), siteId, activeObserver, time, view)
        : '',
    [activeObserver, siteId, time, view],
  );
  if (!catalog)
    return (
      <div className="streetview-shell" role="status">
        <p>{catalogError || 'Loading the sourced lunar catalogue…'}</p>
        {catalogError && (
          <button className="btn" onClick={() => setRetry((v) => v + 1)}>
            Retry catalogue
          </button>
        )}
      </div>
    );
  return (
    <div className="streetview-shell">
      <div className="lunar-site-bar">
        <label>
          Location
          <select
            aria-label="Lunar catalogue location"
            value={site ? siteId : siteId === 'free' ? 'free' : ''}
            onChange={(event) => {
              const id = event.target.value;
              selectSite(id);
            }}
          >
            <option value="" disabled>
              Choose a location
            </option>
            {siteId === 'free' && (
              <option value="free" disabled>
                Custom location
              </option>
            )}
            {choiceGroups(catalog.sites).map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        {(!token || configure || !initialObserver) && (
          <button className="btn" onClick={returnToMap}>
            Back to 3D map
          </button>
        )}
        {activeObserver && (
          <span className="font-mono">
            {activeObserver.lat.toFixed(5)}° · {activeObserver.lon.toFixed(5)}° E
          </span>
        )}
        {(!token || configure || !initialObserver) && shareUrl && <ShareView url={shareUrl} />}
        {import.meta.env.DEV && (
          <button className="btn" onClick={() => setConfigure(!configure)}>
            Access settings
          </button>
        )}
      </div>
      {shared.error && <p role="alert">{shared.error}</p>}
      {!site && siteId !== 'free' && (
        <p role="alert">This catalogue id was not found. Select a sourced location above.</p>
      )}
      <div className="lunar-main">
        {!token || configure ? (
          import.meta.env.DEV ? (
            <form
              className="lunar-access-panel"
              onSubmit={(event) => {
                event.preventDefault();
                if (draft.trim()) {
                  setToken(draft.trim());
                  setDraft('');
                  setConfigure(false);
                  setAccessRevision((n) => n + 1);
                }
              }}
            >
              <p>Connect Cesium Moon</p>
              <label>
                Application access token
                <input
                  aria-label="Application access token"
                  type="password"
                  autoComplete="off"
                  required
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </label>
              <button className="btn" type="submit">
                Load lunar surface
              </button>
              {token && (
                <button className="btn" type="button" onClick={() => setConfigure(false)}>
                  Keep current access
                </button>
              )}
              <small>
                Read access to Moon asset 2684829. Never stored in links or browser storage.
              </small>
            </form>
          ) : (
            <p>Terrain is not configured for this deployment. Real sky data is available below.</p>
          )
        ) : (
          initialObserver && (
            <Suspense fallback={<p>Loading lunar viewer…</p>}>
              <LunarViewport
                key={`${siteId}:${accessRevision}`}
                observer={initialObserver}
                token={token}
                sample={sample}
                initialView={shared.view ?? DEFAULT_VIEW}
                shareUrl={shareUrl}
                onReturn={returnToMap}
                onObserver={onObserver}
                onView={onView}
                onGround={setMeshGround}
              />
            </Suspense>
          )
        )}
      </div>
      <details className="lunar-sky-details">
        <summary>
          {sample ? 'Real SPICE sky' : 'Loading sky / horizon'} ·{' '}
          {sample?.terrainMatched
            ? 'LOLA terrain horizon'
            : sample
              ? 'Terrain visibility not calculated'
              : '2026–2055'}
        </summary>
        <div aria-live="polite">
          {sample ? (
            <>
              <p>
                {formatUtc(sample.t_utc)} UTC · hourly vectors, interpolated · Sun disc visible{' '}
                {(100 * sample.sunFraction).toFixed(1)}%
              </p>
              <p>
                Sun az {sample.sun_az.toFixed(2)}° / el {sample.sun_el.toFixed(3)}° · horizon{' '}
                {sample.sunHorizon.toFixed(3)}°
              </p>
              <p>
                Earth az {sample.earth_az.toFixed(2)}° / el {sample.earth_el.toFixed(3)}° ·{' '}
                {sample.earth_km.toFixed(0)} km · direct link{' '}
                {sample.earthVisible ? 'clear' : 'blocked'} ({margin}° margin)
              </p>
              <p>
                Horizon: {sample.horizonSource}.{' '}
                {sample.elevationKnown
                  ? 'Independent DEM elevation used for parallax.'
                  : 'Free point: reference-sphere elevation; local DEM/horizon unavailable.'}
              </p>
              {terrainPoint && (
                <p>
                  DEM elevation {terrainPoint.elev_m.toFixed(1)} m · visual mesh{' '}
                  {meshGround === null ? 'pending' : meshGround.toFixed(1) + ' m'} · slope{' '}
                  {terrainPoint.slope_deg?.toFixed(2) ?? 'unknown'}°
                  {terrainPoint.slope_coarse ? ' (coarse 1 km baseline)' : ''}. Heights are not
                  calibrated by a constant offset.
                </p>
              )}
              {terrainPoint && (
                <a href={terrainPoint.source_url} target="_blank" rel="noreferrer">
                  Coordinate source · {terrainPoint.precision.replaceAll('_', ' ')}
                </a>
              )}
              <p>
                Terrain and visibility are sampled estimates, not flight-certified. Reading light is
                artificial; the markers indicate directions.
              </p>
            </>
          ) : (
            <p>
              {ephem.error ||
                horizon.error ||
                'Loading ephemeris and the matching terrain horizon; no mock sky is substituted.'}
            </p>
          )}
        </div>
      </details>
      <StreetViewClock />
    </div>
  );
}
