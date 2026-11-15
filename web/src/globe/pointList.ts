/**
 * "Your points" list model + selection — owner: Marta (src/globe).
 *
 * The list is exactly the custom pins (customPins.ts). Picking a row selects the pin as the shared
 * free point (store `selectedPoint`, which drives the in-situ simulation) and asks the globe to fly
 * there through a tiny non-persisted signal (`useFlyRequest`).
 */
import { create } from 'zustand';
import { useAppStore } from '@/core';
import { useCustomPins, type CustomPin } from './customPins';

export interface PointRow {
  id: string;
  name: string;
  lat: number;
  lon: number;
  selected: boolean;
}

/** One row per custom pin; a row is selected only while no catalogue site is and the point matches. */
export function buildPointRows(
  pins: CustomPin[],
  selectedPoint: { lat: number; lon: number } | null,
  selectedSiteId: string | null,
): PointRow[] {
  return pins.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    selected:
      selectedSiteId === null && selectedPoint?.lat === p.lat && selectedPoint?.lon === p.lon,
  }));
}

/** Pin the globe should fly to and focus; `n` makes repeated requests for the same pin fire again. */
interface FlyRequest {
  request: { id: string; lat: number; lon: number; n: number } | null;
  fly: (pin: CustomPin) => void;
}

let flyCount = 0;
export const useFlyRequest = create<FlyRequest>()((set) => ({
  request: null,
  fly: (pin) => set({ request: { id: pin.id, lat: pin.lat, lon: pin.lon, n: ++flyCount } }),
}));

/**
 * Make a pin the active free point (clean switch: no catalogue site stays selected) and fly to it.
 * Goes through the shared guard: a running simulation asks "End simulation?" first.
 */
export function selectCustomPin(pin: CustomPin): void {
  useAppStore
    .getState()
    .requestSelection({ kind: 'point', lat: pin.lat, lon: pin.lon, name: pin.name }, () =>
      useFlyRequest.getState().fly(pin),
    );
}

/** Delete a pin; if it was the active point, the simulation point is cleared too. */
export function removeCustomPin(pin: CustomPin): void {
  const app = useAppStore.getState();
  const p = app.selectedPoint;
  if (p && p.lat === pin.lat && p.lon === pin.lon) app.setSelectedPoint(null);
  useCustomPins.getState().removePin(pin.id);
}
