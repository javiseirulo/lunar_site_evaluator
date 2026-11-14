/**
 * Public API of Javi's scoring/mission module: import from '@/scoring'.
 * Used by Explore (Marta), Mission (Cristóbal) and the pages (docs/10 §5 Javi, J0 #1).
 */
export { DEFAULT_MISSION_CONFIG } from './defaults';
export {
  computeArrival,
  landingTime,
  missionWindow,
  earthMoonDistanceKm,
  hohmannTransferDays,
  lloPeriodHours,
  trackAlignmentWaitDays,
  TRAJECTORY_LABEL,
  FIXED_TRANSFER_DAYS,
} from './arrival';
export type { Arrival, SiteLocation } from './arrival';
export { MissionTimingPanel } from './MissionTimingPanel';
