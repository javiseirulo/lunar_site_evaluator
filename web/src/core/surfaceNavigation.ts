/** Shared coordinates and existing-route handoff; no second transition engine. */
import { useAppStore } from './store';
export interface MoonPoint {
  lat: number;
  lon: number;
}
export function validMoonPoint(point: MoonPoint) {
  return (
    Number.isFinite(point.lat + point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}
export function surfacePath(point: MoonPoint, siteId: string | null, time: string) {
  const params = new URLSearchParams({
    lat: point.lat.toFixed(8),
    lon: point.lon.toFixed(8),
    t: time,
  });
  return `/streetview/${encodeURIComponent(siteId ?? 'free')}?${params}`;
}
export function prepareSurfaceLocation(point: MoonPoint, siteId: string | null = null) {
  if (!validMoonPoint(point)) throw new RangeError('Invalid lunar coordinates');
  const app = useAppStore.getState();
  app.selectSite(siteId ?? 'free');
  app.setSelectedPoint(point);
  return surfacePath(point, siteId, app.currentTimeUTC);
}
