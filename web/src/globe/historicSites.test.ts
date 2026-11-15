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
    expect(summaryText(s)).toBe('4 landings shown · 1 south of 80°S');
  });

  it('reflects the real file as it is', () => {
    const file = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'public', 'data', 'historic_sites.json'), 'utf8'),
    ) as { sites: HistoricSite[] };
    const s = historicSummary(parseHistoricSites({ version: 1, sites: file.sites }));
    expect(s.total).toBe(file.sites.length);
    expect(s.southOf80).toBe(file.sites.filter((x) => x.lat < -80).length);
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

  it('marks the layer unavailable when the file is missing or broken', async () => {
    await loadHistoricSites(() => Promise.resolve(response({}, false)));
    expect(useHistoric.getState().status).toBe('error');
    await loadHistoricSites(() => Promise.resolve(response({ nope: true })));
    expect(useHistoric.getState().status).toBe('error');
    await loadHistoricSites(() => Promise.reject(new Error('offline')));
    expect(useHistoric.getState().status).toBe('error');
  });
});
