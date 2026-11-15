import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCoreData, useData } from './data';
import { useAppStore } from './store';

const initialApp = useAppStore.getState();
const initialData = useData.getState();
const files = [
  {
    mock: false,
    time_range: { start_utc: '2027-01-01T00:00:00Z', end_utc: '2028-01-01T00:00:00Z' },
  },
  { mock: false, sites: [] },
  { mock: false, layers: [] },
];

describe('shared clock and asynchronous core loading', () => {
  beforeEach(() => {
    useAppStore.setState(initialApp, true);
    useData.setState(initialData, true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves a QR time outside the static export window', async () => {
    let index = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => files[index++] })),
    );
    useAppStore.getState().setTime('2034-04-01T12:00:00Z');
    await loadCoreData();
    expect(useData.getState().status).toBe('ready');
    expect(useAppStore.getState().currentTimeUTC).toBe('2034-04-01T12:00:00Z');
  });

  it('preserves a choice made while the manifest is loading', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let index = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const file = files[index++];
        await gate;
        return { ok: true, json: async () => file };
      }),
    );
    const pending = loadCoreData();
    useAppStore.getState().setTime('2040-01-01T00:00:00Z');
    release();
    await pending;
    expect(useAppStore.getState().currentTimeUTC).toBe('2040-01-01T00:00:00Z');
  });

  it('still initializes an untouched clock from the manifest', async () => {
    useAppStore.setState({ currentTimeUTC: '2026-01-01T00:00:00Z' });
    let index = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => files[index++] })),
    );
    await loadCoreData();
    expect(useAppStore.getState().currentTimeUTC).toBe('2027-01-01T00:00:00Z');
  });
});
