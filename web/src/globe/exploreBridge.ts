/** Lets the Explore side panel drop a pin and fly the globe, which owns the camera. */
type Pin = { name: string; lat: number; lon: number };

let handler: ((pin: Pin) => void) | null = null;

export function registerExplorePin(fn: ((pin: Pin) => void) | null) {
  handler = fn;
}

export function submitExplorePin(pin: Pin) {
  handler?.(pin);
}
