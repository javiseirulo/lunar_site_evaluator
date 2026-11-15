import { limitLook } from './geometry';
import { limitFov } from './navigation';
import type { Observer } from './lunarScene';

export const START_UTC = '2026-01-01T00:00:00Z';
export const END_UTC = '2055-12-31T23:00:00Z';
export interface ViewState {
  heading: number;
  pitch: number;
  fov: number;
  height: number;
}
export const DEFAULT_VIEW: ViewState = { heading: 0, pitch: 0, fov: 65, height: 5 };
export interface SharedView {
  point: Observer | null;
  time: string | null;
  view: ViewState;
  error: string | null;
}

export function readViewLink(url: URL): SharedView {
  const params = url.searchParams;
  const fallback = { point: null, time: null, view: DEFAULT_VIEW, error: null };
  if (!['lat', 'lon', 't', 'az', 'el', 'fov', 'h'].some((key) => params.has(key))) return fallback;
  const number = (key: string, value: number) =>
    params.has(key) ? (params.get(key)!.trim() ? Number(params.get(key)) : NaN) : value;
  const lat = number('lat', NaN),
    lon = number('lon', NaN);
  const view = {
    heading: number('az', 0),
    pitch: number('el', 0),
    fov: number('fov', 65),
    height: number('h', 5),
  };
  const time = params.get('t');
  const ms = time ? Date.parse(time) : NaN;
  if (
    !Number.isFinite(lat + lon + view.heading + view.pitch + view.fov + view.height) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180 ||
    Math.abs(view.pitch) > 85 ||
    view.fov < 25 ||
    view.fov > 90 ||
    view.height < 0.5 ||
    view.height > 20 ||
    (time && (!Number.isFinite(ms) || ms < Date.parse(START_UTC) || ms > Date.parse(END_UTC)))
  ) {
    return { ...fallback, error: 'Invalid shared view. Choose a location and date to continue.' };
  }
  return {
    point: { lat, lon },
    time: time ? new Date(ms).toISOString().replace('.000Z', 'Z') : null,
    view: { ...view, ...limitLook(view.heading, view.pitch) },
    error: null,
  };
}

export function makeViewLink(
  base: URL,
  siteId: string,
  point: Observer,
  time: string,
  view: ViewState,
) {
  const url = new URL(base);
  url.username = '';
  url.password = '';
  // Drop all existing parameters, including any accidentally supplied token.
  url.search = '';
  url.hash = '';
  url.pathname = `${import.meta.env.BASE_URL}streetview/${encodeURIComponent(siteId)}`;
  const values = {
    lat: point.lat.toFixed(8),
    lon: point.lon.toFixed(8),
    t: time,
    az: view.heading.toFixed(2),
    el: view.pitch.toFixed(2),
    fov: limitFov(view.fov).toFixed(2),
    h: view.height.toFixed(2),
  };
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.href;
}
