/** Which cockpit instruments fail for each end-of-mission cause. */
import type { FailCause } from '../../engine/simulate';

export type CockpitFx = FailCause | 'win' | null;

/** Instruments that fail for each cause, and whether they get the "below minimum" stamp. */
export function faultsFor(fx: CockpitFx): {
  power: boolean;
  temp: boolean;
  link: boolean;
  tilt: boolean;
  minimum: 'power' | 'link' | null;
} {
  return {
    power: fx === 'cold' || fx === 'low_sun',
    temp: fx === 'cold',
    link: fx === 'blackout' || fx === 'low_comm',
    tilt: fx === 'slope',
    minimum: fx === 'low_sun' ? 'power' : fx === 'low_comm' ? 'link' : null,
  };
}
