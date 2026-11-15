import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/core';
import { useCustomPins } from './customPins';
import { buildPointRows, removeCustomPin, selectCustomPin, useFlyRequest } from './pointList';

const pins = [
  { id: 'a', name: 'A', lat: -85, lon: 30 },
  { id: 'b', name: 'B', lat: 10, lon: 20 },
];

describe('buildPointRows', () => {
  it('lists every pin and highlights none when nothing is selected', () => {
    const rows = buildPointRows(pins, null, null);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rows.some((r) => r.selected)).toBe(false);
  });
  it('highlights the pin that matches the selected point', () => {
    const rows = buildPointRows(pins, { lat: -85, lon: 30 }, null);
    expect(rows.map((r) => r.selected)).toEqual([true, false]);
  });
  it('highlights nothing while a catalogue site is selected', () => {
    expect(buildPointRows(pins, { lat: -85, lon: 30 }, 'site_1').some((r) => r.selected)).toBe(
      false,
    );
  });
});

describe('selectCustomPin / removeCustomPin', () => {
  beforeEach(() => {
    useAppStore.setState({ selectedSiteId: null, selectedPoint: null });
    useCustomPins.setState({ pins: [...pins] });
    useFlyRequest.setState({ request: null });
  });
  it('switches cleanly from a catalogue site to the point and requests a flight', () => {
    useAppStore.getState().selectSite('site_1');
    selectCustomPin(pins[0]!);
    const s = useAppStore.getState();
    expect(s.selectedSiteId).toBeNull();
    expect(s.selectedPoint).toEqual({ lat: -85, lon: 30 });
    expect(useFlyRequest.getState().request).toMatchObject({ id: 'a', lat: -85, lon: 30 });
  });
  it('removing the active pin clears the point', () => {
    selectCustomPin(pins[0]!);
    removeCustomPin(pins[0]!);
    expect(useAppStore.getState().selectedPoint).toBeNull();
    expect(useCustomPins.getState().pins.map((p) => p.id)).toEqual(['b']);
  });
});
