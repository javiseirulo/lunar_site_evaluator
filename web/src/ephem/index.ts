/**
 * Public API of Javi's ephemeris module: import from '@/ephem'.
 * Sun/Earth sky for ANY lat/lon and window (2026–2055) from the published hourly MOON_ME vectors,
 * with the same topocentric math as python/ephem (contracts/README.md v1.1).
 */
export {
  R_MOON_KM,
  OBSERVER_HEIGHT_M,
  SUN_RADIUS_DEG,
  DEFAULT_ANTENNA_MARGIN_DEG,
  FLAT_HORIZON_SOURCE,
  enuBasis,
  siteVectorKm,
  azEl,
  wrap360,
  flatHorizonDeg,
  horizonAt,
  sunDiscFraction,
} from './topo';
export type { Vec3, EnuBasis, AzEl } from './topo';
export {
  EPHEM_UNAVAILABLE,
  loadEphemIndex,
  ensureEphem,
  isEphemLoaded,
  ephemError,
  getEphemIndex,
  availableYears,
  formatYearRanges,
  missingEphemYears,
  useEphemIndex,
  vectorsAt,
  earthMoonDistanceKmAt,
  sunDirectionMoonME,
  useEphem,
  useEphemVersion,
  __setEphemYearForTests,
  __resetEphemForTests,
} from './ephem';
export type { EphemVectors, TimeInput } from './ephem';
export { skyAt, skyFromVectors } from './sky';
export type { Sky, SkyOptions } from './sky';
export { buildTimeseries, isoSeconds } from './timeseries';
export type { TimeseriesSite, BuildTimeseriesOptions, EphemTimeseries } from './timeseries';
export { loadHorizon, useHorizon, __setHorizonForTests } from './horizon';
export type { HorizonState } from './horizon';
export { loadGrid, parseGrid, sampleGrid, gridCell, __resetGridsForTests } from './grid';
export type { Grid } from './grid';
export { useActiveSeries, pointSeries, pointSeriesKey, pointName, pointSite } from './activeSeries';
export type { ActiveSeries, ActiveSite } from './activeSeries';
