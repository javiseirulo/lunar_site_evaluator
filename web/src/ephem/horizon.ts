/**
 * Terrain horizon profiles `data/horizon/<site_id>.json` (written by Pablo; contract v1.1).
 * A missing file is not an error: the site just uses the flat horizon ("flat (no terrain)").
 *
 *   const profile = await loadHorizon('shackleton_rim_01');   // HorizonProfile | null
 *   const { status, horizon } = useHorizon(siteId);
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { HorizonProfile } from '@lunar/contracts';
import { dataUrl } from '@/core';
import { createSignal, isHtmlFallback } from './signal';

const signal = createSignal();
const cache = new Map<string, HorizonProfile | null>();
const errors = new Map<string, string>();
const inflight = new Map<string, Promise<HorizonProfile | null>>();

function isProfile(p: unknown): p is HorizonProfile {
  const h = p as Partial<HorizonProfile> | null;
  return (
    !!h &&
    h.version === 1 &&
    Array.isArray(h.elev_deg) &&
    h.elev_deg.length > 0 &&
    typeof h.az_step_deg === 'number' &&
    h.az_step_deg > 0
  );
}

/** Horizon profile of a site, cached. Resolves null when the site has no published profile. */
export function loadHorizon(siteId: string): Promise<HorizonProfile | null> {
  if (cache.has(siteId)) return Promise.resolve(cache.get(siteId)!);
  const existing = inflight.get(siteId);
  if (existing) return existing;
  const p = (async () => {
    const res = await fetch(dataUrl(`horizon/${encodeURIComponent(siteId)}.json`));
    if (res.status === 404 || (res.ok && isHtmlFallback(res))) return null;
    if (!res.ok) throw new Error(`horizon/${siteId}.json: HTTP ${res.status}`);
    const json: unknown = await res.json();
    if (!isProfile(json))
      throw new Error(`horizon/${siteId}.json does not follow HorizonProfile v1`);
    return json;
  })()
    .then((profile) => {
      cache.set(siteId, profile);
      errors.delete(siteId);
      signal.bump();
      return profile;
    })
    .catch((err: unknown) => {
      errors.set(siteId, err instanceof Error ? err.message : String(err));
      signal.bump();
      throw err;
    })
    .finally(() => inflight.delete(siteId));
  inflight.set(siteId, p);
  return p;
}

export interface HorizonState {
  /** 'ready' with horizon null = no profile for this site (use the flat horizon). */
  status: 'idle' | 'loading' | 'ready' | 'error';
  horizon: HorizonProfile | null;
  error: string | null;
}

/** Horizon profile for a site (null id → idle). */
export function useHorizon(siteId: string | null | undefined): HorizonState {
  useSyncExternalStore(signal.subscribe, signal.version, signal.version);
  useEffect(() => {
    if (siteId) loadHorizon(siteId).catch(() => undefined);
  }, [siteId]);
  if (!siteId) return { status: 'idle', horizon: null, error: null };
  if (cache.has(siteId)) return { status: 'ready', horizon: cache.get(siteId)!, error: null };
  const error = errors.get(siteId);
  return error
    ? { status: 'error', horizon: null, error }
    : { status: 'loading', horizon: null, error: null };
}

/** Test hook: preload (or clear with undefined) a profile without fetching. */
export function __setHorizonForTests(siteId: string, profile: HorizonProfile | null | undefined) {
  if (profile === undefined) cache.delete(siteId);
  else cache.set(siteId, profile);
  signal.bump();
}
