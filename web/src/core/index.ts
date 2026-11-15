/** Public API of the core for other modules: import from '@/core'. */
export { useAppStore, DEFAULT_TIME_UTC } from './store';
export { prepareSurfaceLocation, surfacePath, validMoonPoint } from './surfaceNavigation';
export type { MoonPoint } from './surfaceNavigation';
export { useCustomPins as useSavedPlaces } from './savedPlaces';
export type { CustomPin as SavedPlace } from './savedPlaces';
export type { AppState, PendingPin } from './store';
export { useData, useTimeseries, useSite, useSelectedSite, loadTimeseries, dataUrl } from './data';
export {
  sampleAt,
  indexAt,
  hoursUntilChange,
  fractionOn,
  nextChange,
  seriesSpanLabel,
  changeWhen,
  changeLead,
  changeClause,
} from './timeseries';
export type { SkySample, NextChange } from './timeseries';
export { MODES, TABS, ALL_PAGES, AUDIENCES, pathForMode } from './navigation';
export { windowsGradient, SUN_BAND, EARTH_BAND } from './timeline';
export { latLonToUv, uvToLatLon, projectSouthPolar } from './projection';
export { loadLayerTexture, colorizeGray, paletteCss, samplePalette } from './raster';
export * from './format';
export { METRICS, verdictFor, friendlyHours, dayOfWindow } from './metrics';
export type { MetricDef, Verdict } from './metrics';
export { Hint } from './shell/Hint';
