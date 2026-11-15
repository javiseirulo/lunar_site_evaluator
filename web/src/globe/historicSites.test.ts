import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { HistoricSite } from '@lunar/contracts';
import {
  historicSummary,
  loadHistoricSites,
  parseHistoricSites,
  summaryText,
  useHistoric,
} from './historicSites';

const site = (id: string, lat: number, outcome: HistoricSite['outcome']): HistoricSite => ({
  id,
  name: id,
  agency: 'A',
  country: 'C',
  date_utc: '2020-01-01T00:00:00Z',
  lat,
  lon: 0,
  outcome,
  kind: 'lander',
  note: 'n',
  source: 'https://example.org',
});

const response = (body: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 404, json: () => Promise.resolve(body) }) as Response;

describe('parseHistoricSites', () => {
  it('rejects a file with the wrong shape', () => {
    expect(() => parseHistoricSites({ sites: [] })).toThrow();
    expect(() => parseHistoricSites(null)).toThrow();
  });

  it('drops entries with unusable coordinates or outcome', () => {
    const sites = parseHistoricSites({
      version: 1,
      sites: [site('ok', 10, 'success'), site('bad_lat', 95, 'success'), { id: 'x' }],
    });
    expect(sites.map((s) => s.id)).toEqual(['ok']);
  });
});

describe('historicSummary', () => {
  it('counts outcomes and sites strictly south of 80°S', () => {
    const s = historicSummary([
      site('a', 0, 'success'),
      site('b', -80, 'partial'), // on the line: not south of it
      site('c', -84.8, 'partial'),
      site('d', 47, 'failed'),
    ]);
    expect(s).toEqual({ total: 4, southOf80: 1, byOutcome: { success: 1, partial: 2, failed: 1 } });
    expect(summaryText(s)).toBe('4 sites (1 crash) · 1 south of 80°S');
  });

  it('keeps every row of the real file and finds the known south-polar landings', () => {
    const file = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'public', 'data', 'historic_sites.json'), 'utf8'),
    ) as { sites: HistoricSite[] };
    const sites = parseHistoricSites({ version: 1, sites: file.sites });
    expect(sites).toHaveLength(file.sites.length); // nothing silently dropped
    // Fixed expectation (not the same formula as the code): only IM-1 and IM-2 lie south of 80°S.
    const south = sites
      .filter((x) => x.lat < -80)
      .map((x) => x.id)
      .sort();
    expect(south).toEqual(['im1_odysseus', 'im2_athena']);
    expect(historicSummary(sites).southOf80).toBe(2);
  });
});

describe('loadHistoricSites', () => {
  beforeEach(() => useHistoric.setState({ status: 'idle', sites: [], visible: false }));

  it('stores the sites when the file loads', async () => {
    await loadHistoricSites(() =>
      Promise.resolve(response({ version: 1, sites: [site('a', 1, 'success')] })),
    );
    expect(useHistoric.getState().status).toBe('ready');
    expect(useHistoric.getState().sites).toHaveLength(1);
  });

  it('fetches once for concurrent and repeated calls', async () => {
    let calls = 0;
    const f = () => {
      calls += 1;
      return Promise.resolve(response({ version: 1, sites: [site('a', 1, 'success')] }));
    };
    await Promise.all([loadHistoricSites(f), loadHistoricSites(f)]);
    await loadHistoricSites(f);
    expect(calls).toBe(1);
  });

  it('retries after an error (the switch calls it again)', async () => {
    await loadHistoricSites(() => Promise.reject(new Error('offline')));
    expect(useHistoric.getState().status).toBe('error');
    await loadHistoricSites(() =>
      Promise.resolve(response({ version: 1, sites: [site('a', 1, 'success')] })),
    );
    expect(useHistoric.getState().status).toBe('ready');
  });

  it('marks the layer unavailable when the file is missing or broken', async () => {
    await loadHistoricSites(() => Promise.resolve(response({}, false)));
    expect(useHistoric.getState().status).toBe('error');
    await loadHistoricSites(() => Promise.resolve(response({ nope: true })));
    expect(useHistoric.getState().status).toBe('error');
    await loadHistoricSites(() => Promise.reject(new Error('offline')));
    expect(useHistoric.getState().status).toBe('error');
  });
});
