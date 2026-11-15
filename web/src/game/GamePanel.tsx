/**
 * Mission mode (src/game). The game reads `sites`/timeseries from `useData` and writes the
 * chosen site and landing time to the shared store (`selectSite`, `setTime`).
 */
import { MissionGame } from './ui/MissionGame';

export function GamePanel() {
  return <MissionGame />;
}
