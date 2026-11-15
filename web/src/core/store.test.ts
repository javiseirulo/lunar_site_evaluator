import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LayersManifest } from '@lunar/contracts';
import { DEFAULT_TIME_UTC, useAppStore } from './store';

const manifest = {
  layers: [
    { id: 'elevation', default_visible: true, default_opacity: 1 },
    { id: 'slope', default_visible: false, default_opacity: 0.5 },
    { id: 'psr', default_visible: true, default_opacity: 0.8 },
  ],
} as unknown as LayersManifest;

const initial = useAppStore.getState();

describe('app store', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('starts with the contract defaults', () => {
    const s = useAppStore.getState();
    expect(s.selectedSiteId).toBeNull();
    expect(s.selectedPoint).toBeNull();
    expect(s.currentTimeUTC).toBe(DEFAULT_TIME_UTC);
    expect(s.activeLayers).toEqual([]);
    expect(s.mode).toBe('explore');
  });

  it('applies layer defaults once', () => {
    const s = useAppStore.getState();
    s.initLayers(manifest);
    expect(useAppStore.getState().activeLayers).toEqual(['elevation', 'psr']);
    expect(useAppStore.getState().layerOpacity.slope).toBe(0.5);
    useAppStore.getState().toggleLayer('psr');
    useAppStore.getState().initLayers(manifest);
    expect(useAppStore.getState().activeLayers).toEqual(['elevation']);
  });

  it('toggles and reorders layers', () => {
    const s = useAppStore.getState();
    s.initLayers(manifest);
    s.toggleLayer('slope');
    expect(useAppStore.getState().activeLayers).toEqual(['elevation', 'psr', 'slope']);
    s.moveLayer('slope', -1);
    expect(useAppStore.getState().activeLayers).toEqual(['elevation', 'slope', 'psr']);
    s.moveLayer('elevation', -1); // already at the bottom: no-op
    expect(useAppStore.getState().activeLayers).toEqual(['elevation', 'slope', 'psr']);
  });

  it('clamps opacity', () => {
    useAppStore.getState().setLayerOpacity('slope', 3);
    expect(useAppStore.getState().layerOpacity.slope).toBe(1);
  });

  it('merges mission config patches', () => {
    const s = useAppStore.getState();
    s.setMissionConfig({ time_mode: 'mission', surface_days: 9 });
    const cfg = useAppStore.getState().missionConfig;
    expect(cfg.time_mode).toBe('mission');
    expect(cfg.surface_days).toBe(9);
    expect(cfg.trajectory).toBe(s.missionConfig.trajectory);
  });
  it('shares a free location without mutating its caller or reusing it for another site', () => {
    const point = { lat: 10, lon: 120 };
    useAppStore.getState().setSelectedPoint(point);
    point.lat = 0;
    expect(useAppStore.getState().selectedPoint).toEqual({ lat: 10, lon: 120 });
    useAppStore.getState().selectSite('shackleton_rim_01');
    expect(useAppStore.getState().selectedPoint).toBeNull();
    expect(() => useAppStore.getState().setSelectedPoint({ lat: 91, lon: 0 })).toThrow(RangeError);
    expect(useAppStore.getState().selectedSiteId).toBe('shackleton_rim_01');
  });
});

describe('simulationStarted (Normal mode Simulate)', () => {
  beforeEach(() => useAppStore.setState(initial, true));

  it('starts false and is set by setSimulationStarted', () => {
    expect(useAppStore.getState().simulationStarted).toBe(false);
    useAppStore.getState().setSimulationStarted(true);
    expect(useAppStore.getState().simulationStarted).toBe(true);
  });

  it('resets when another site is selected', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    useAppStore.getState().selectSite('site_b');
    expect(useAppStore.getState().simulationStarted).toBe(false);
  });

  it('resets when a site is deselected', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    useAppStore.getState().selectSite(null);
    expect(useAppStore.getState().simulationStarted).toBe(false);
  });

  it('keeps the flag when the same site is selected again', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    useAppStore.getState().selectSite('site_a');
    expect(useAppStore.getState().simulationStarted).toBe(true);
    expect(useAppStore.getState().selectedSiteId).toBe('site_a');
  });

  it('resets when a free point is set to different coordinates', () => {
    const s = useAppStore.getState();
    s.setSelectedPoint({ lat: -89.5, lon: 10 });
    s.setSimulationStarted(true);
    useAppStore.getState().setSelectedPoint({ lat: -89.5, lon: 11 });
    expect(useAppStore.getState().simulationStarted).toBe(false);
  });

  it('keeps the flag when the same point coordinates are set again', () => {
    const s = useAppStore.getState();
    s.setSelectedPoint({ lat: -89.5, lon: 10 });
    s.setSimulationStarted(true);
    useAppStore.getState().setSelectedPoint({ lat: -89.5, lon: 10 });
    expect(useAppStore.getState().simulationStarted).toBe(true);
  });

  it('resets when a site is swapped for a free point and back', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    useAppStore.getState().setSelectedPoint({ lat: -80, lon: 0 });
    expect(useAppStore.getState().simulationStarted).toBe(false);
    useAppStore.getState().setSimulationStarted(true);
    useAppStore.getState().selectSite('site_a');
    expect(useAppStore.getState().simulationStarted).toBe(false);
  });
});

describe('guarded selection (requestSelection)', () => {
  const A = { kind: 'site' as const, id: 'site_a', name: 'Site A' };
  const B = { kind: 'site' as const, id: 'site_b', name: 'Site B' };
  const P = { kind: 'point' as const, lat: -85, lon: 30, name: 'Point' };
  const START = '2027-01-01T00:00:00Z';

  beforeEach(() => useAppStore.setState({ ...initial, proMode: false }, true));

  it('selects at once when no simulation is running (no dialog)', () => {
    useAppStore.getState().selectSite('site_a');
    useAppStore.getState().requestSelection(B);
    const s = useAppStore.getState();
    expect(s.selectedSiteId).toBe('site_b');
    expect(s.pendingSelection).toBeNull();
  });

  it('sets a pending switch when a simulation is running', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.requestSelection(B);
    const st = useAppStore.getState();
    expect(st.pendingSelection?.target).toEqual(B);
    expect(st.selectedSiteId).toBe('site_a');
    expect(st.simulationStarted).toBe(true);
  });

  it('asks for a free point switch too, and keeps the clock running state untouched on cancel', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.requestSelection(P);
    expect(useAppStore.getState().pendingSelection?.target).toEqual(P);
  });

  it('confirm resets the clock and simulation, then applies the pending site', () => {
    const after = vi.fn();
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.setTime('2027-01-03T12:00:00Z');
    const nonce = useAppStore.getState().clockResetNonce;
    s.requestSelection(B, after);
    useAppStore.getState().confirmPending(START);
    const st = useAppStore.getState();
    expect(st.selectedSiteId).toBe('site_b');
    expect(st.selectedPoint).toBeNull();
    expect(st.simulationStarted).toBe(false);
    expect(st.pendingSelection).toBeNull();
    expect(st.currentTimeUTC).toBe(START);
    expect(st.clockResetNonce).toBe(nonce + 1);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('confirm applies a pending free point', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.requestSelection(P);
    useAppStore.getState().confirmPending(START);
    const st = useAppStore.getState();
    expect(st.selectedSiteId).toBeNull();
    expect(st.selectedPoint).toEqual({ lat: -85, lon: 30 });
    expect(st.simulationStarted).toBe(false);
  });

  it('cancel keeps the selection and the simulation', () => {
    const after = vi.fn();
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.setTime('2027-01-03T12:00:00Z');
    s.requestSelection(B, after);
    useAppStore.getState().cancelPending();
    const st = useAppStore.getState();
    expect(st.selectedSiteId).toBe('site_a');
    expect(st.simulationStarted).toBe(true);
    expect(st.currentTimeUTC).toBe('2027-01-03T12:00:00Z');
    expect(st.pendingSelection).toBeNull();
    expect(after).not.toHaveBeenCalled();
  });

  it('the same site or point is never a pending switch', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.requestSelection(A);
    expect(useAppStore.getState().pendingSelection).toBeNull();
    expect(useAppStore.getState().simulationStarted).toBe(true);

    s.selectSite(null);
    s.setSelectedPoint({ lat: -85, lon: 30 });
    s.setSimulationStarted(true);
    s.requestSelection(P);
    expect(useAppStore.getState().pendingSelection).toBeNull();
    expect(useAppStore.getState().simulationStarted).toBe(true);
  });

  it('deselecting never asks', () => {
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.requestSelection(null);
    expect(useAppStore.getState().pendingSelection).toBeNull();
    expect(useAppStore.getState().selectedSiteId).toBeNull();
  });

  it('Expert mode selects at once even while a simulation runs', () => {
    useAppStore.setState({ proMode: true });
    const s = useAppStore.getState();
    s.selectSite('site_a');
    s.setSimulationStarted(true);
    s.requestSelection(B);
    expect(useAppStore.getState().selectedSiteId).toBe('site_b');
    expect(useAppStore.getState().pendingSelection).toBeNull();
  });
});
