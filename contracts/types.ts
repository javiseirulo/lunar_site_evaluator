/**
 * Shared data contracts (v1) between the Python pipeline and the web app.
 *
 * Rule: any change here goes through a PR to `contracts/` and the whole team is told.
 * JSON Schemas for the files live next to this file (*.schema.json).
 *
 * Files served from `web/public/data/`:
 *   manifest.json            -> DataManifest
 *   sites.json               -> SitesFile
 *   timeseries/<site_id>.json -> Timeseries
 *   layers.json              -> LayersManifest (+ the PNGs it points to under layers/)
 */

// ---------------------------------------------------------------------------
// manifest.json — entry point: what was generated, from what, and for which window
// ---------------------------------------------------------------------------
export interface DataManifest {
  version: 1;
  /** true while the files are invented placeholders, false once the real pipeline writes them. */
  mock: boolean;
  generated_utc: string;
  /** Time window covered by every timeseries file. */
  time_range: { start_utc: string; end_utc: string; step_s: number };
  /** Datasets/kernels used to build the files (shown on the About page). */
  sources: string[];
}

// ---------------------------------------------------------------------------
// sites.json — candidate landing sites (owner: Javi / scoring)
// ---------------------------------------------------------------------------
export interface SiteMetrics {
  /** Fraction of time the Sun is above the local horizon over the time window, 0–1. */
  illum_pct: number;
  /** Fraction of time the Earth is above the local horizon over the time window, 0–1. */
  earth_vis_pct: number;
  /** Local slope in degrees. */
  slope_deg: number;
  /** Longest continuous period without sunlight, in hours. */
  max_dark_hours: number;
  /** Distance to the nearest permanently shadowed region, in km. */
  psr_dist_km: number;
}

/** Machine-readable reasons; the UI maps them to human text. */
export type SiteReason =
  | 'slope_ok'
  | 'slope_high'
  | 'illum_ok'
  | 'illum_low'
  | 'earth_ok'
  | 'earth_low'
  | 'dark_ok'
  | 'dark_long'
  | (string & {});

export interface Site {
  id: string;
  name: string;
  /** Planetocentric latitude, degrees (south is negative). */
  lat: number;
  /** East longitude, degrees in [-180, 180]. */
  lon: number;
  elev_m: number;
  /** Passes the hard filters (slope, minimum light, ...). */
  valid: boolean;
  /** Weighted score 0–1 with the default weights. */
  score: number;
  metrics: SiteMetrics;
  reasons: SiteReason[];
  /** Where the coordinates come from (paper, mission page, "custom", "mock"). */
  source?: string;
}

export interface SitesFile {
  version: 1;
  mock: boolean;
  generated_utc: string;
  /** Default score weights; the UI may let users change them and re-rank client-side. */
  weights: Record<keyof SiteMetrics, number>;
  sites: Site[];
}

// ---------------------------------------------------------------------------
// timeseries/<site_id>.json — Sun/Earth sky position per time step (owner: Javi)
// ---------------------------------------------------------------------------
export interface Timeseries {
  version: 1;
  mock: boolean;
  site_id: string;
  /** Seconds between samples (3600 = hourly). */
  step_s: number;
  /** ISO 8601 UTC timestamps, one per sample. All arrays below have the same length. */
  t_utc: string[];
  /** Azimuth in degrees, clockwise from local north, [0, 360). */
  sun_az: number[];
  /** Elevation above the mathematical horizon, degrees. */
  sun_el: number[];
  earth_az: number[];
  earth_el: number[];
  /** 1 if the Sun clears the terrain horizon at that sample, else 0. */
  lit: (0 | 1)[];
  /** 1 if the Earth clears the terrain horizon at that sample, else 0. Optional in v1. */
  earth_visible?: (0 | 1)[];
}

// ---------------------------------------------------------------------------
// layers.json — raster overlays in south polar stereographic (owner: Pablo/Javi → Marta/Javi2)
// ---------------------------------------------------------------------------
export type PaletteStop = [position: number, color: string];

export interface LayerDef {
  id: string;
  label: string;
  /** Path relative to `data/`, e.g. "layers/elevation.png". */
  file: string;
  /**
   * How the PNG stores values. "gray8": 8-bit gray + alpha, value = min + gray/255 · (max - min);
   * alpha 0 = no data.
   */
  encoding: 'gray8' | 'gray16';
  kind: 'continuous' | 'categorical';
  units: string;
  value_range: [min: number, max: number];
  /** Color ramp over the normalised value [0, 1]. */
  palette: PaletteStop[];
  /** Labels for categorical layers, keyed by the raw value. */
  categories?: Record<string, string>;
  default_visible: boolean;
  default_opacity: number;
  description: string;
  source: string;
}

export interface LayersManifest {
  version: 1;
  mock: boolean;
  /** PROJ string of the raster grid. */
  projection: string;
  /** Forward projection used for pins: rho = 2R·tan((90° + lat)/2), x = rho·sin(lon), y = rho·cos(lon). */
  radius_m: number;
  /** [min_x, min_y, max_x, max_y] in projected metres. Row 0 of each PNG is max_y. */
  bounds_m: [number, number, number, number];
  /** Northernmost latitude covered (e.g. -80). */
  lat_limit: number;
  width_px: number;
  height_px: number;
  layers: LayerDef[];
}

// ---------------------------------------------------------------------------
// Front-end store contract — the ONLY interface between web modules
// ---------------------------------------------------------------------------
export type AppMode = 'explore' | 'streetview' | 'game';

export interface AppEvents {
  selectedSiteId: string | null;
  /** ISO 8601 UTC. */
  currentTimeUTC: string;
  /** Layer ids, drawn bottom → top in this order. */
  activeLayers: string[];
  mode: AppMode;
}
