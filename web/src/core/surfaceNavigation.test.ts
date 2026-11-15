import { beforeEach, expect, it, vi } from 'vitest';
import { useAppStore } from './store';
import { prepareSurfaceLocation } from './surfaceNavigation';
import { useCustomPins } from './savedPlaces';
import { readViewLink } from '@/streetview/viewLink';

const initialApp = useAppStore.getState();
beforeEach(() => {
  useAppStore.setState(initialApp, true);
  useCustomPins.setState({ pins: [] });
});
it('opens the existing route with the selected coordinates and unchanged UTC', () => {
  useAppStore.getState().setTime('2034-04-01T12:00:00Z');
  const point = { lat: -12, lon: 178.3 };
  const path = prepareSurfaceLocation(point);
  const restored = readViewLink(new URL(path, 'https://moon.example'));
  expect(restored.point).toEqual(point);
  expect(restored.time).toBe('2034-04-01T12:00:00Z');
  expect(path).toContain('/streetview/free?');
  expect(useAppStore.getState().selectedPoint).toEqual(point);
  expect(useAppStore.getState().mode).toBe('explore');
});
it('shares saved locations using the existing Marta shape and validates coordinates', () => {
  const pin = useCustomPins.getState().addPin({ lat: 89, lon: -160, name: '  My ridge  ' });
  expect(pin.name).toBe('My ridge');
  expect(pin.id).toMatch(/^custom-/);
  expect(useCustomPins.getState().pins).toEqual([pin]);
  expect(() => useCustomPins.getState().addPin({ lat: 95, lon: 0 })).toThrow(RangeError);
  expect(() => prepareSurfaceLocation({ lat: NaN, lon: 0 })).toThrow(RangeError);
});
it('rehydrates the original Marta pin format without a migration or key change', async () => {
  const legacy = { id: 'custom-old', name: 'Existing ridge', lat: -89.3, lon: 40.2 };
  const getItem = vi.fn((key: string) =>
    key === 'lunar-globe-custom-pins'
      ? JSON.stringify({ state: { pins: [legacy] }, version: 0 })
      : null,
  );
  vi.stubGlobal('localStorage', { getItem, setItem: vi.fn(), removeItem: vi.fn() });
  try {
    await useCustomPins.persist.rehydrate();
    expect(useCustomPins.getState().pins).toEqual([legacy]);
    expect(getItem).toHaveBeenCalledWith('lunar-globe-custom-pins');
  } finally {
    vi.unstubAllGlobals();
  }
});
