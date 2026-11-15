/** Compatibility entry point; pins are shared through core with Street View.
 * The storage key, shape and Marta API are unchanged. */
export { useSavedPlaces as useCustomPins } from '@/core';
export type { SavedPlace as CustomPin } from '@/core';
