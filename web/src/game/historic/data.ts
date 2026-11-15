/**
 * Historical mode data (#114): the mission list and each mission's options, written by
 * `python/export/historic.py` into `public/data/historic/`. The options' series are added to the
 * shared timeseries cache under their own ids (`<mission>__<option>`), so the cockpit, recon and
 * verdict read them like any other site; their sites stay in this store (not in the shared site
 * list, so they never show up in Explore).
 */
import { create } from 'zustand';
import type { Site, Timeseries } from '@lunar/contracts';
import { useData } from '@/core';
import type { Emergency } from '../ui/content';

export interface Narrator {
  name: string;
  role: string;
  /** Portrait file name under `public/game/characters/historic/` (without `.png`). */
  art: string;
}

export interface HistoricAlarm {
  /** Which emergency effect to play (an existing emergency id: guidance, propulsion...). */
  scene: string;
  title: string;
  alarm: string;
  briefing: string;
}

export interface MissionSummary {
  id: string;
  name: string;
  country: string;
  year: number;
  landing_utc: string;
  narrator: Narrator;
  alarm: boolean;
  playable: boolean;
  lat: number;
  lon: number;
}

export interface HistoricOption {
  option: string;
  basis: 'flown' | 'candidate' | 'nearby';
  history: boolean;
  terrain_horizon: boolean;
  landing_sun_el: number;
  outcome: string;
  site: Site;
  timeseries: Timeseries;
}

export interface HistoricMission {
  id: string;
  name: string;
  country: string;
  year: number;
  landing_utc: string;
  light: { rule: string; min?: number; max?: number };
  surface_days: number;
  relay: boolean;
  playable: boolean;
  narrator: Narrator;
  intro: string[];
  briefing: string[];
  fact: string;
  alarm: HistoricAlarm | null;
  options: HistoricOption[];
}

const url = (file: string) => `${import.meta.env.BASE_URL}data/historic/${file}`;

async function fetchJson<T>(file: string): Promise<T> {
  const res = await fetch(url(file));
  if (!res.ok) throw new Error(`Failed to load historic/${file}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

interface HistoricState {
  missions: MissionSummary[] | null;
  listError: string | null;
  loaded: Record<string, HistoricMission>;
  errors: Record<string, string>;
}

export const useHistoric = create<HistoricState>()(() => ({
  missions: null,
  listError: null,
  loaded: {},
  errors: {},
}));

let listing: Promise<void> | null = null;

/** Loads the mission list once (the picker calls it). */
export function loadMissionList(): Promise<void> {
  if (useHistoric.getState().missions) return Promise.resolve();
  listing ??= fetchJson<{ missions: MissionSummary[] }>('missions.json')
    .then((f) => useHistoric.setState({ missions: f.missions, listError: null }))
    .catch((err: unknown) => {
      listing = null;
      useHistoric.setState({ listError: err instanceof Error ? err.message : String(err) });
    });
  return listing;
}

const inflight = new Map<string, Promise<HistoricMission | null>>();

/** Loads a mission and puts its options' series in the shared timeseries cache. */
export function loadMission(id: string): Promise<HistoricMission | null> {
  const have = useHistoric.getState().loaded[id];
  if (have) return Promise.resolve(have);
  const existing = inflight.get(id);
  if (existing) return existing;
  const p = fetchJson<HistoricMission>(`${encodeURIComponent(id)}.json`)
    .then((m) => {
      const series: Record<string, Timeseries> = {};
      for (const o of m.options) series[o.site.id] = o.timeseries;
      useData.setState((s) => ({ timeseries: { ...s.timeseries, ...series } }));
      useHistoric.setState((s) => ({ loaded: { ...s.loaded, [id]: m } }));
      return m;
    })
    .catch((err: unknown) => {
      useHistoric.setState((s) => ({
        errors: { ...s.errors, [id]: err instanceof Error ? err.message : String(err) },
      }));
      return null;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/** Portrait of a mission's narrator. */
export const narratorImage = (n: Narrator): string =>
  `${import.meta.env.BASE_URL}game/characters/historic/${n.art}.png`;

/** A mission's alarm in the shape of a South Pole emergency (the alert screen shows either). */
export function alarmAsEmergency(m: HistoricMission): Emergency | null {
  if (!m.alarm) return null;
  return {
    id: m.alarm.scene,
    title: m.alarm.title,
    alarm: m.alarm.alarm,
    briefing: m.alarm.briefing,
    catastrophe: `The clock ran out before a site was chosen. ${m.name} drifts past every safe landing site.`,
  };
}
