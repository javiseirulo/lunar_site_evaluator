/**
 * Hourly Sun/Earth vectors from `data/ephem/` (owner: Javi; contract v1.1 EphemIndex).
 *
 *   await ensureEphem('2027-03-01T00:00:00Z', '2027-03-08T00:00:00Z');   // fetches 2027.bin once
 *   vectorsAt('2027-03-02T12:30:00Z');   // { sunUnit, earthKm } in MOON_ME, interpolated
 *
 * Each year file is fetched once and kept in a module-level cache for the session.
 * React: `useEphem(start, end)` triggers the fetch and re-renders when the data is ready.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { EphemIndex } from '@lunar/contracts';
import { dataUrl } from '@/core';
import { createSignal, isHtmlFallback } from './signal';
import type { Vec3 } from './topo';

/** Prefix of every "data not published" error, so the UI can show a friendly state. */
export const EPHEM_UNAVAILABLE = 'Ephemeris not available yet';

const HOUR_MS = 3_600_000;
const COLS = 6;

export type TimeInput = Date | string | number;

export interface EphemVectors {
  /** Unit vector Moon centre → Sun, MOON_ME. */
  sunUnit: Vec3;
  /** Moon centre → Earth centre, km, MOON_ME. */
  earthKm: Vec3;
}

interface YearData {
  data: Float32Array;
  startMs: number;
  n: number;
}

const signal = createSignal();
let index: EphemIndex | null = null;
let indexPromise: Promise<EphemIndex> | null = null;
let indexError: string | null = null;
const years = new Map<number, YearData>();
const inflight = new Map<number, Promise<void>>();
const yearErrors = new Map<number, string>();

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

function toMs(t: TimeInput): number {
  if (typeof t === 'number') return t;
  if (t instanceof Date) return t.getTime();
  return Date.parse(t);
}

const utcYear = (ms: number) => new Date(ms).getUTCFullYear();

/**
 * Years a half-open window [start, end) needs, plus the next year when the window ends inside the
 * last hour of a year (interpolating there needs row 0 of the next file).
 */
function yearsFor(start: TimeInput, end: TimeInput): { required: number[]; spill: number | null } {
  const s = toMs(start);
  const e = toMs(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return { required: [], spill: null };
  const last = e > s ? e - 1 : s;
  const required: number[] = [];
  for (let y = utcYear(s); y <= utcYear(last); y++) required.push(y);
  const lastRow = Date.UTC(utcYear(last), 11, 31, 23);
  return { required, spill: last > lastRow ? utcYear(last) + 1 : null };
}

const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

function toFloat32LE(buf: ArrayBuffer): Float32Array {
  if (LITTLE_ENDIAN) return new Float32Array(buf);
  const view = new DataView(buf);
  const out = new Float32Array(buf.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

function setYear(year: number, data: Float32Array, startMs: number) {
  years.set(year, { data, startMs, n: Math.floor(data.length / COLS) });
  yearErrors.delete(year);
  signal.bump();
}

/** ephem/index.json (cached). Rejects with an `EPHEM_UNAVAILABLE…` error while it is not published. */
export function loadEphemIndex(): Promise<EphemIndex> {
  if (index) return Promise.resolve(index);
  if (indexPromise) return indexPromise;
  indexPromise = (async () => {
    let res: Response;
    try {
      res = await fetch(dataUrl('ephem/index.json'));
    } catch (err) {
      throw new Error(`${EPHEM_UNAVAILABLE} (${errText(err)})`);
    }
    if (!res.ok || isHtmlFallback(res)) {
      throw new Error(
        `${EPHEM_UNAVAILABLE} (ephem/index.json ${res.ok ? 'not found' : `HTTP ${res.status}`})`,
      );
    }
    const json = (await res.json()) as EphemIndex;
    if (json.version !== 1 || !Array.isArray(json.years)) {
      throw new Error('ephem/index.json does not follow the contract (EphemIndex v1)');
    }
    index = json;
    indexError = null;
    signal.bump();
    return json;
  })();
  indexPromise.catch((err: unknown) => {
    indexError = errText(err);
    indexPromise = null; // allow a retry on the next request
    signal.bump();
  });
  return indexPromise;
}

function loadYear(idx: EphemIndex, year: number): Promise<void> {
  if (years.has(year)) return Promise.resolve();
  const existing = inflight.get(year);
  if (existing) return existing;
  const entry = idx.years.find((y) => y.year === year);
  if (!entry) {
    const msg = `The ephemeris covers ${idx.start_utc.slice(0, 10)} to ${idx.end_utc.slice(0, 10)}; nothing for ${year}`;
    yearErrors.set(year, msg);
    signal.bump();
    return Promise.reject(new Error(msg));
  }
  const p = (async () => {
    const res = await fetch(dataUrl(`ephem/${entry.file}`));
    if (!res.ok || isHtmlFallback(res)) {
      throw new Error(
        `${EPHEM_UNAVAILABLE} (ephem/${entry.file} ${res.ok ? 'not found' : `HTTP ${res.status}`})`,
      );
    }
    const buf = await res.arrayBuffer();
    const expected = entry.n * COLS * 4;
    if (buf.byteLength !== expected) {
      throw new Error(`ephem/${entry.file}: expected ${expected} bytes, got ${buf.byteLength}`);
    }
    setYear(year, toFloat32LE(buf), Date.parse(entry.start_utc));
  })()
    .catch((err: unknown) => {
      yearErrors.set(year, errText(err));
      signal.bump();
      throw err;
    })
    .finally(() => inflight.delete(year));
  inflight.set(year, p);
  return p;
}

/** Fetch (once) every year file needed for [start, end). */
export async function ensureEphem(start: TimeInput, end: TimeInput): Promise<void> {
  if (isEphemLoaded(start, end)) return;
  const { required, spill } = yearsFor(start, end);
  const idx = await loadEphemIndex();
  const wanted = [...required];
  if (spill !== null && idx.years.some((y) => y.year === spill)) wanted.push(spill);
  await Promise.all(wanted.map((y) => loadYear(idx, y)));
}

/** True when `vectorsAt` can answer for every time in [start, end). */
export function isEphemLoaded(start: TimeInput, end: TimeInput): boolean {
  const { required, spill } = yearsFor(start, end);
  if (required.length === 0 || !required.every((y) => years.has(y))) return false;
  if (spill === null || years.has(spill)) return true;
  // The next year is only needed if the index has it (otherwise the data simply ends there).
  return !index?.years.some((y) => y.year === spill);
}

/** Why [start, end) cannot be served (null while loading or when ready). */
export function ephemError(start: TimeInput, end: TimeInput): string | null {
  if (isEphemLoaded(start, end)) return null;
  for (const y of yearsFor(start, end).required) {
    if (!years.has(y) && yearErrors.has(y)) return yearErrors.get(y)!;
  }
  return index ? null : indexError;
}

/** The loaded index (null until `loadEphemIndex` resolves). */
export function getEphemIndex(): EphemIndex | null {
  return index;
}

/**
 * Sun/Earth vectors at time `t`, linearly interpolated between the hourly rows (Sun vector
 * renormalised). null if that year is not loaded or `t` is outside the data.
 */
export function vectorsAt(t: TimeInput): EphemVectors | null {
  const ms = toMs(t);
  if (!Number.isFinite(ms)) return null;
  const year = utcYear(ms);
  const y = years.get(year);
  if (!y) return null;
  const x = (ms - y.startMs) / HOUR_MS;
  if (x < 0) return null;
  const i = Math.floor(x);
  const f = x - i;
  if (i >= y.n) return null;
  const a = y.data;
  const ai = i * COLS;
  let b = a;
  let bi = ai;
  if (f > 0) {
    if (i + 1 < y.n) {
      bi = ai + COLS;
    } else {
      const next = years.get(year + 1);
      if (!next || next.startMs !== y.startMs + y.n * HOUR_MS) return null;
      b = next.data;
      bi = 0;
    }
  }
  const lerp = (k: number) => a[ai + k]! + (b[bi + k]! - a[ai + k]!) * f;
  const sx = lerp(0);
  const sy = lerp(1);
  const sz = lerp(2);
  const sn = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
  return { sunUnit: [sx / sn, sy / sn, sz / sn], earthKm: [lerp(3), lerp(4), lerp(5)] };
}

/** Moon centre → Earth centre distance, km (null if not loaded). */
export function earthMoonDistanceKmAt(t: TimeInput): number | null {
  const v = vectorsAt(t);
  if (!v) return null;
  const [x, y, z] = v.earthKm;
  return Math.sqrt(x * x + y * y + z * z);
}

/** Unit vector Moon → Sun in MOON_ME (globe lighting). null if not loaded. */
export function sunDirectionMoonME(t: TimeInput): Vec3 | null {
  return vectorsAt(t)?.sunUnit ?? null;
}

/** Re-render on every cache change (internal; used by the hooks of this module). */
export function useEphemVersion(): number {
  return useSyncExternalStore(signal.subscribe, signal.version, signal.version);
}

/**
 * Load the ephemeris for [start, end) and report when it is ready.
 * `error` starts with `EPHEM_UNAVAILABLE` while the data is not published.
 */
export function useEphem(
  start: string | null | undefined,
  end: string | null | undefined,
): { ready: boolean; error: string | null } {
  useEphemVersion();
  useEffect(() => {
    if (start && end) ensureEphem(start, end).catch(() => undefined);
  }, [start, end]);
  if (!start || !end) return { ready: false, error: null };
  const ready = isEphemLoaded(start, end);
  return { ready, error: ready ? null : ephemError(start, end) };
}

// ---------------------------------------------------------------------------
// Test hooks (vitest, node env: no fetch of public/data)
// ---------------------------------------------------------------------------

/** Inject a synthetic year: `data` = 6 Float32 values per hour from `startUtc`. */
export function __setEphemYearForTests(
  year: number,
  data: Float32Array,
  startUtc = `${year}-01-01T00:00:00Z`,
): void {
  setYear(year, data, Date.parse(startUtc));
}

export function __resetEphemForTests(): void {
  index = null;
  indexPromise = null;
  indexError = null;
  years.clear();
  inflight.clear();
  yearErrors.clear();
  signal.bump();
}
