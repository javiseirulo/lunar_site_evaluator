// Parity: web buildTimeseries with Pablo's horizon == the Python-exported timeseries
// (python/export/all.py), for 2 polar sites over the first week of 2027.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { HorizonProfile, SitesFile, Timeseries } from '@lunar/contracts';
import { __resetEphemForTests, __setEphemYearForTests, buildTimeseries } from '.';

const DATA = join(__dirname, '..', '..', 'public', 'data');
const SITES = ['shackleton_rim_01', 'malapert_massif'];
const read = <T>(p: string) => JSON.parse(readFileSync(join(DATA, p), 'utf8')) as T;
const have =
  existsSync(join(DATA, 'ephem', '2027.bin')) &&
  SITES.every((id) => existsSync(join(DATA, 'horizon', `${id}.json`)));

afterEach(() => __resetEphemForTests());

describe.skipIf(!have)('terrain horizon parity with python/export', () => {
  it.each(SITES)('%s', (id) => {
    const buf = readFileSync(join(DATA, 'ephem', '2027.bin'));
    __setEphemYearForTests(
      2027,
      new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    );
    const site = read<SitesFile>('sites.json').sites.find((s) => s.id === id)!;
    const horizon = read<HorizonProfile>(`horizon/${id}.json`);
    const py = read<Timeseries>(`timeseries/${id}.json`);
    const ts = buildTimeseries(site, horizon, '2027-01-01T00:00:00Z', '2027-01-08T00:00:00Z')!;
    const n = ts.t_utc.length;
    expect(n).toBe(168);
    expect(ts.horizon_source).toBe(py.horizon_source);
    for (const k of ['sun_el', 'earth_el'] as const)
      ts[k].forEach((v, i) => expect(Math.abs(v - py[k][i]!)).toBeLessThanOrEqual(0.011));
    // sun_frac is published at 2 decimals by the export.
    ts.sun_frac!.forEach((v, i) =>
      expect(Math.abs(v - py.sun_frac![i]!)).toBeLessThanOrEqual(0.011),
    );
    const diff = (a: number[], b: number[]) => a.filter((v, i) => v !== b[i]).length;
    expect(diff(ts.earth_visible!, py.earth_visible!.slice(0, n))).toBeLessThanOrEqual(1);
    expect(diff(ts.lit, py.lit.slice(0, n))).toBeLessThanOrEqual(1);
  });
});
