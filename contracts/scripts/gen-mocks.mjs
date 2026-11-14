#!/usr/bin/env node
/**
 * Generates MOCK data that follows contracts/types.ts so every web module can work
 * before the real pipeline exists. Everything here is invented: synthetic terrain,
 * approximate feature coordinates, toy Sun/Earth geometry. Files carry "mock": true.
 *
 * Usage (from repo root):  pnpm mocks
 * Output:                  web/public/data/{manifest,sites,layers}.json, layers/*.png, timeseries/*.json
 *
 * The real pipeline (python/export) must overwrite these same files with mock=false.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'web', 'public', 'data');
const GENERATED = '2026-11-14T00:00:00Z'; // fixed so regenerating gives identical files

const R_MOON = 1737400;
const LAT_LIMIT = -80;
const DEG = Math.PI / 180;
const HALF = 2 * R_MOON * Math.tan(((90 + LAT_LIMIT) / 2) * DEG); // ≈ 304 km
const N = 512;
const PX = (2 * HALF) / N;

// ----------------------------------------------------------------- helpers
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const G = 64;
const lattice = Float32Array.from({ length: G * G }, () => rand());
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const s = (t) => t * t * (3 - 2 * t);
  const g = (i, j) => lattice[(((j % G) + G) % G) * G + (((i % G) + G) % G)];
  const u = s(x - xi);
  const v = s(y - yi);
  const a = g(xi, yi);
  const b = g(xi + 1, yi);
  const c = g(xi, yi + 1);
  const d = g(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let f = 0;
  let amp = 0.5;
  let fr = 1;
  for (let o = 0; o < 5; o++) {
    f += amp * vnoise(x * fr, y * fr);
    amp *= 0.5;
    fr *= 2;
  }
  return f;
}
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** South polar stereographic, same formula documented in layers.json. */
function project(lat, lon) {
  const rho = 2 * R_MOON * Math.tan(((90 + lat) / 2) * DEG);
  return [rho * Math.sin(lon * DEG), rho * Math.cos(lon * DEG)];
}
function toPixel(lat, lon) {
  const [x, y] = project(lat, lon);
  return [Math.floor((x + HALF) / PX), Math.floor((HALF - y) / PX)];
}

// ----------------------------------------------------------------- synthetic terrain
// Approximate positions of real features, used only to make the mock look plausible.
const CRATERS = [
  { lat: -89.67, lon: 129.8, r: 10.5, depth: 4000 }, // Shackleton
  { lat: -88.5, lon: -87.1, r: 16, depth: 3000 }, // de Gerlache
  { lat: -87.3, lon: 77, r: 19.5, depth: 3200 }, // Faustini
  { lat: -87.45, lon: -5, r: 25, depth: 3500 }, // Haworth
  { lat: -88.1, lon: 44.9, r: 25.5, depth: 3000 }, // Shoemaker
  { lat: -88.3, lon: -152, r: 17, depth: 2500 }, // Sverdrup
  { lat: -84.9, lon: -35.5, r: 49, depth: 3500 }, // Cabeus
  { lat: -84.5, lon: 82.8, r: 51, depth: 3500 }, // Amundsen
  { lat: -85.2, lon: 53.5, r: 36, depth: 3000 }, // Nobile
  { lat: -88.1, lon: -110.5, r: 12, depth: 2000 }, // Slater
].map((c) => ({ ...c, xy: project(c.lat, c.lon), rm: c.r * 1000 }));
const MASSIFS = [
  { lat: -86, lon: 0, r: 20, h: 4000 }, // Malapert
  { lat: -85.4, lon: 31.7, r: 15, h: 3500 }, // Leibnitz beta
  { lat: -84.3, lon: 31, r: 18, h: 3000 }, // Mons Mouton
  { lat: -84.9, lon: -95, r: 16, h: 2500 }, // de Gerlache–Kocher massif
].map((m) => ({ ...m, xy: project(m.lat, m.lon), rm: m.r * 1000 }));

const elev = new Float32Array(N * N);
const inBowl = new Uint8Array(N * N);
const inside = new Uint8Array(N * N);
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const x = -HALF + (i + 0.5) * PX;
    const y = HALF - (j + 0.5) * PX;
    const k = j * N + i;
    if (Math.hypot(x, y) > HALF) continue;
    inside[k] = 1;
    let h = 2600 * (fbm(i / 40, j / 40) - 0.5);
    for (const c of CRATERS) {
      const d = Math.hypot(x - c.xy[0], y - c.xy[1]) / c.rm;
      if (d < 1) {
        h -= c.depth * (1 - d * d);
        inBowl[k] = 1;
      }
      h += 0.18 * c.depth * Math.exp(-(((d - 1) / 0.3) ** 2));
    }
    for (const m of MASSIFS) {
      const d = Math.hypot(x - m.xy[0], y - m.xy[1]) / m.rm;
      h += m.h * Math.exp(-(d * d));
    }
    elev[k] = h;
  }
}

const slope = new Float32Array(N * N);
const at = (i, j) => elev[Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i))];
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const k = j * N + i;
    if (!inside[k]) continue;
    const dx = (at(i + 1, j) - at(i - 1, j)) / (2 * PX);
    const dy = (at(i, j + 1) - at(i, j - 1)) / (2 * PX);
    // Exaggerate so the 1.2 km grid shows a useful range for the mock.
    slope[k] = Math.atan(Math.hypot(dx, dy) * 6) / DEG;
  }
}

let eMin = Infinity;
let eMax = -Infinity;
for (let k = 0; k < N * N; k++) {
  if (!inside[k]) continue;
  eMin = Math.min(eMin, elev[k]);
  eMax = Math.max(eMax, elev[k]);
}

const illum = new Float32Array(N * N);
const psr = new Uint8Array(N * N);
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const k = j * N + i;
    if (!inside[k]) continue;
    const en = (elev[k] - eMin) / (eMax - eMin);
    const x = -HALF + (i + 0.5) * PX;
    const y = HALF - (j + 0.5) * PX;
    const polar = 1 - Math.hypot(x, y) / HALF;
    let v = 0.05 + 0.95 * en ** 1.6 + 0.15 * polar + 0.12 * (fbm(i / 12 + 7, j / 12) - 0.5);
    if (inBowl[k]) v *= 0.35;
    illum[k] = clamp(v);
    psr[k] = inBowl[k] && illum[k] < 0.12 ? 1 : 0;
  }
}

function earthVisAt(k, lat, lon) {
  const en = (elev[k] - eMin) / (eMax - eMin);
  const colat = 90 + lat;
  const facing = Math.cos(lon * DEG) * clamp(colat / 10);
  let v = 0.45 + 0.4 * facing + 0.35 * (en - 0.5);
  if (inBowl[k]) v *= 0.4;
  return clamp(v);
}

const WEIGHTS = {
  illum_pct: 0.4,
  earth_vis_pct: 0.3,
  slope_deg: 0.2,
  max_dark_hours: 0.1,
  psr_dist_km: 0,
};
const score = new Float32Array(N * N);
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const k = j * N + i;
    if (!inside[k]) continue;
    const x = -HALF + (i + 0.5) * PX;
    const y = HALF - (j + 0.5) * PX;
    const lon = Math.atan2(x, y) / DEG;
    const lat = -90 + (2 * Math.atan(Math.hypot(x, y) / (2 * R_MOON))) / DEG;
    score[k] = clamp(
      0.45 * illum[k] + 0.3 * earthVisAt(k, lat, lon) + 0.25 * clamp(1 - slope[k] / 25),
    );
  }
}

// ----------------------------------------------------------------- PNG (gray + alpha, 8-bit)
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function grayAlphaPng(values, [vmin, vmax]) {
  const raw = Buffer.alloc(N * (1 + N * 2));
  for (let j = 0; j < N; j++) {
    const row = j * (1 + N * 2);
    raw[row] = 0;
    for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const o = row + 1 + i * 2;
      if (!inside[k]) continue; // gray 0, alpha 0 = no data
      raw[o] = Math.round(clamp((values[k] - vmin) / (vmax - vmin)) * 255);
      raw[o + 1] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(N, 0);
  ihdr.writeUInt32BE(N, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 4; // gray + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- write layers
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'layers'), { recursive: true });
mkdirSync(join(OUT, 'timeseries'), { recursive: true });

const MOCK_SRC = 'MOCK — synthetic terrain, replace with LOLA-derived product';
const LAYERS = [
  {
    id: 'elevation',
    label: 'Elevation',
    values: elev,
    kind: 'continuous',
    units: 'm',
    value_range: [Math.floor(eMin / 100) * 100, Math.ceil(eMax / 100) * 100],
    palette: [
      [0, '#14151d'],
      [0.45, '#5d6170'],
      [1, '#f1efe9'],
    ],
    default_visible: true,
    default_opacity: 1,
    description: 'Height relative to the 1737.4 km reference sphere.',
  },
  {
    id: 'slope',
    label: 'Slope',
    values: slope,
    kind: 'continuous',
    units: '°',
    value_range: [0, 30],
    palette: [
      [0, '#0d0887'],
      [0.5, '#cc4778'],
      [1, '#f0f921'],
    ],
    default_visible: false,
    default_opacity: 0.7,
    description: 'Terrain steepness. Landers generally need gentle slopes.',
  },
  {
    id: 'illumination',
    label: 'Sunlight',
    values: illum,
    kind: 'continuous',
    units: '% of time',
    value_range: [0, 1],
    palette: [
      [0, '#09090d'],
      [0.5, '#9a5b19'],
      [1, '#ffe7a3'],
    ],
    default_visible: false,
    default_opacity: 0.75,
    description: 'Share of the time window with the Sun above the local horizon.',
  },
  {
    id: 'psr',
    label: 'Permanent shadow',
    values: Float32Array.from(psr),
    kind: 'categorical',
    units: '',
    value_range: [0, 1],
    palette: [
      [0, '#00000000'],
      [1, '#7c6cff'],
    ],
    categories: { 0: 'Sometimes lit', 1: 'Permanently shadowed' },
    default_visible: false,
    default_opacity: 0.8,
    description: 'Regions that never receive direct sunlight (cold traps, possible ice).',
  },
  {
    id: 'score',
    label: 'Site score',
    values: score,
    kind: 'continuous',
    units: '0–1',
    value_range: [0, 1],
    palette: [
      [0, '#2a1638'],
      [0.5, '#1f7a8c'],
      [1, '#b8f36b'],
    ],
    default_visible: false,
    default_opacity: 0.7,
    description: 'Weighted combination of sunlight, Earth visibility and slope.',
  },
];

for (const l of LAYERS)
  writeFileSync(join(OUT, 'layers', `${l.id}.png`), grayAlphaPng(l.values, l.value_range));

writeFileSync(
  join(OUT, 'layers.json'),
  JSON.stringify(
    {
      version: 1,
      mock: true,
      projection: `+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=${R_MOON} +units=m +no_defs`,
      radius_m: R_MOON,
      bounds_m: [-round(HALF, 0), -round(HALF, 0), round(HALF, 0), round(HALF, 0)],
      lat_limit: LAT_LIMIT,
      width_px: N,
      height_px: N,
      layers: LAYERS.map(({ values: _v, ...l }) => ({
        ...l,
        file: `layers/${l.id}.png`,
        encoding: 'gray8',
        source: MOCK_SRC,
      })),
    },
    null,
    2,
  ),
);

// ----------------------------------------------------------------- sites
// Approximate coordinates of commonly discussed south-pole areas; metrics are invented.
const SITE_SEEDS = [
  ['shackleton_rim_01', 'Shackleton rim A', -89.9, 0],
  ['shackleton_rim_02', 'Shackleton rim B', -89.45, 141],
  ['connecting_ridge', 'Connecting ridge', -89.45, -137],
  ['de_gerlache_rim_01', 'de Gerlache rim A', -88.7, -68],
  ['de_gerlache_rim_02', 'de Gerlache rim B', -88.25, -95],
  ['peak_near_shackleton', 'Peak near Shackleton', -88.8, 124],
  ['malapert_massif', 'Malapert massif', -85.99, -0.1],
  ['leibnitz_beta', 'Leibnitz beta plateau', -85.4, 31.7],
  ['haworth_rim', 'Haworth rim', -86.6, -15],
  ['nobile_rim_01', 'Nobile rim A', -84.4, 63],
  ['nobile_rim_02', 'Nobile rim B', -85.7, 41],
  ['faustini_rim', 'Faustini rim', -86.4, 82],
  ['amundsen_rim', 'Amundsen rim', -83.6, 80],
  ['cabeus_b', 'Cabeus B', -82.2, -55],
  ['shoemaker_rim', 'Shoemaker rim', -87.0, 46],
  ['sverdrup_rim', 'Sverdrup rim', -87.6, -150],
  ['slater_plain', 'Slater plain', -87.6, -112],
  ['de_gerlache_kocher', 'de Gerlache–Kocher massif', -84.9, -95],
  ['mons_mouton', 'Mons Mouton', -84.3, 31],
  ['plain_81s', 'Plain at 81°S', -81.5, 120],
];

const psrPixels = [];
for (let k = 0; k < N * N; k++) if (psr[k]) psrPixels.push(k);

function reasonsFor(m) {
  return [
    m.slope_deg <= 15 ? 'slope_ok' : 'slope_high',
    m.illum_pct >= 0.5 ? 'illum_ok' : 'illum_low',
    m.earth_vis_pct >= 0.5 ? 'earth_ok' : 'earth_low',
    m.max_dark_hours <= 200 ? 'dark_ok' : 'dark_long',
  ];
}

// Raster values at each site are only *targets* that shape the toy horizon. The published
// metrics are then measured from the generated timeseries, so sites.json, the timeseries and
// the UI (detail card, time bar, game) always agree — as the contract defines them.
const seeds = SITE_SEEDS.map(([id, name, lat, lon]) => {
  const [i, j] = toPixel(lat, lon);
  const k = j * N + i;
  let best = Infinity;
  for (const p of psrPixels) {
    const d = Math.hypot((p % N) - i, Math.floor(p / N) - j);
    if (d < best) best = d;
  }
  return {
    id,
    name,
    lat,
    lon,
    elev_m: Math.round(elev[k]),
    slope_deg: round(slope[k], 1),
    psr_dist_km: round((best * PX) / 1000, 1),
    targetSun: illum[k],
    targetEarth: earthVisAt(k, lat, lon),
  };
});

// ----------------------------------------------------------------- timeseries
// Toy geometry: for a near-pole observer at colatitude c, a body over longitude L and
// latitude d sits at azimuth ≈ L - lon and elevation ≈ c·cos(az) - d.
const START = Date.UTC(2027, 0, 1);
const STEP_S = 3600;
const STEPS = 30 * 24;
const SYNODIC = 29.530589 * 86400;
const LIB_LON = 27.55455 * 86400;
const LIB_LAT = 27.212221 * 86400;
const YEAR = 365.25 * 86400;
const wrap = (a) => ((a % 360) + 360) % 360;

/** Longest run of zeros, in hours. */
function longestDarkHours(flags) {
  let best = 0;
  let run = 0;
  for (const f of flags) {
    run = f ? 0 : run + 1;
    if (run > best) best = run;
  }
  return (best * STEP_S) / 3600;
}

const sites = [];
for (const [idx, seed] of seeds.entries()) {
  const c = 90 + seed.lat;
  // Higher "target" → lower toy horizon, so brighter terrain is lit more often.
  const horizonFor = (target, salt) => (az) =>
    (1 - target) * (0.5 + 2.5 * fbm(az / 30 + idx * 3 + salt, idx)) - 1.8 * target;
  const sunHorizon = horizonFor(seed.targetSun, 0);
  const earthHorizon = horizonFor(seed.targetEarth, 11);
  const ts = {
    t_utc: [],
    sun_az: [],
    sun_el: [],
    earth_az: [],
    earth_el: [],
    lit: [],
    earth_visible: [],
  };
  for (let n = 0; n < STEPS; n++) {
    const t = n * STEP_S;
    const subSolarLon = 180 - (360 * t) / SYNODIC;
    const subSolarLat = 1.54 * Math.sin((2 * Math.PI * t) / YEAR + Math.PI);
    const sunAz = wrap(subSolarLon - seed.lon);
    const sunEl = c * Math.cos(sunAz * DEG) - subSolarLat;
    const subEarthLon = 7.9 * Math.sin((2 * Math.PI * t) / LIB_LON);
    const subEarthLat = 6.7 * Math.sin((2 * Math.PI * t) / LIB_LAT + 0.6);
    const earthAz = wrap(subEarthLon - seed.lon);
    const earthEl = c * Math.cos(earthAz * DEG) - subEarthLat;
    ts.t_utc.push(new Date(START + t * 1000).toISOString().replace('.000Z', 'Z'));
    ts.sun_az.push(round(sunAz));
    ts.sun_el.push(round(sunEl));
    ts.earth_az.push(round(earthAz));
    ts.earth_el.push(round(earthEl));
    ts.lit.push(sunEl > sunHorizon(sunAz) ? 1 : 0);
    ts.earth_visible.push(earthEl > earthHorizon(earthAz) ? 1 : 0);
  }
  writeFileSync(
    join(OUT, 'timeseries', `${seed.id}.json`),
    JSON.stringify({ version: 1, mock: true, site_id: seed.id, step_s: STEP_S, ...ts }),
  );

  const frac = (flags) => flags.reduce((a, b) => a + b, 0) / flags.length;
  const metrics = {
    illum_pct: round(frac(ts.lit)),
    earth_vis_pct: round(frac(ts.earth_visible)),
    slope_deg: seed.slope_deg,
    max_dark_hours: longestDarkHours(ts.lit),
    psr_dist_km: seed.psr_dist_km,
  };
  const s =
    WEIGHTS.illum_pct * metrics.illum_pct +
    WEIGHTS.earth_vis_pct * metrics.earth_vis_pct +
    WEIGHTS.slope_deg * clamp(1 - metrics.slope_deg / 20) +
    WEIGHTS.max_dark_hours * clamp(1 - metrics.max_dark_hours / 500);
  sites.push({
    id: seed.id,
    name: seed.name,
    lat: seed.lat,
    lon: seed.lon,
    elev_m: seed.elev_m,
    valid: metrics.slope_deg <= 15 && metrics.illum_pct >= 0.3,
    score: round(s),
    metrics,
    reasons: reasonsFor(metrics),
    source: 'mock',
  });
}

writeFileSync(
  join(OUT, 'sites.json'),
  JSON.stringify(
    { version: 1, mock: true, generated_utc: GENERATED, weights: WEIGHTS, sites },
    null,
    2,
  ),
);

writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify(
    {
      version: 1,
      mock: true,
      generated_utc: GENERATED,
      time_range: {
        start_utc: new Date(START).toISOString().replace('.000Z', 'Z'),
        end_utc: new Date(START + (STEPS - 1) * STEP_S * 1000).toISOString().replace('.000Z', 'Z'),
        step_s: STEP_S,
      },
      sources: ['MOCK data generated by contracts/scripts/gen-mocks.mjs — not real measurements'],
    },
    null,
    2,
  ),
);

console.log(
  `mocks written to ${OUT}: ${sites.length} sites, ${LAYERS.length} layers, ${STEPS} steps`,
);
