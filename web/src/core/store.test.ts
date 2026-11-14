import { beforeEach, describe, expect, it } from 'vitest';
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
});
