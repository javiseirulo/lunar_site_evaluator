/** The rules of the hand in play: the Historical mission's, or South Pole's defaults. */
import { DEFAULT_REQUIREMENTS, type MissionRequirements } from '../engine/requirements';
import { useGame } from './gameStore';

export function useMissionRules(): MissionRequirements {
  return useGame((s) => s.hand?.req) ?? DEFAULT_REQUIREMENTS;
}
