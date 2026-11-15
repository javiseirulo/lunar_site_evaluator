/** Cockpit status colours. */
export const GOOD = '#3ddc84';
export const WARN = '#ffd23f';
export const BAD = '#ff3b30';

/** Green, amber from 75 % of the limit, red past it. */
export const runColor = (value: number, limit: number): string =>
  value > limit ? BAD : value >= limit * 0.75 ? WARN : GOOD;
