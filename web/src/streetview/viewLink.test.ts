import { expect, it } from 'vitest';
import { DEFAULT_VIEW, END_UTC, initialPoint, makeViewLink, readViewLink } from './viewLink';

it('keeps shared coordinates authoritative and rejects a point owned by another route', () => {
  const point = { lat: 12, lon: 23 };
  const shared = { lat: -89, lon: 20 };
  expect(initialPoint(null, 'a', 'b', point)).toBeNull();
  expect(initialPoint(null, 'a', 'a', point)).toEqual(point);
  expect(initialPoint(shared, 'a', 'b', point)).toEqual(shared);
});

it('restores a reproducible lunar position, UTC epoch and camera pose', () => {
  const base = new URL('https://user:secret@moon.example/streetview/a?token=do-not-share#old');
  const url = makeViewLink(base, 'a', { lat: -89.7755, lon: -156.448 }, '2034-03-02T12:30:00Z', {
    heading: 359.2,
    pitch: -12.5,
    fov: 40,
    height: 7,
  });
  const restored = readViewLink(new URL(url));
  expect(restored.error).toBeNull();
  expect(restored.point).toEqual({ lat: -89.7755, lon: -156.448 });
  expect(restored.time).toBe('2034-03-02T12:30:00Z');
  expect(restored.view).toEqual({ heading: 359.2, pitch: -12.5, fov: 40, height: 7 });
  expect(url).not.toContain('secret');
  expect(url).not.toContain('token');
  expect(url).not.toContain('#');
});
it.each([
  'lat=91&lon=0',
  'lat=NaN&lon=0',
  'lat=&lon=0',
  'lat=0&lon=0&h=0',
  'lat=0&lon=0&fov=2',
  'lat=0&lon=0&t=2056-01-01T00:00:00Z',
  'lat=0&lon=0&t=invalid',
])('rejects an invalid shared view: %s', (query) => {
  const result = readViewLink(new URL(`https://moon.example/?${query}`));
  expect(result.point).toBeNull();
  expect(result.error).not.toBeNull();
  expect(result.view).toEqual(DEFAULT_VIEW);
});
it('accepts the last published epoch without extrapolating beyond it', () => {
  expect(readViewLink(new URL(`https://moon.example/?lat=0&lon=0&t=${END_UTC}`)).time).toBe(
    END_UTC,
  );
});
