import { samplePalette } from '@/core';

/** Shared red → amber → lime ramp for site scores (pins, list dots, badges). */
const SCORE_PALETTE: [number, string][] = [
  [0, '#ff7a6b'],
  [0.5, '#f2c55c'],
  [1, '#c9f36b'],
];

export function scoreColor(score: number): string {
  const [r, g, b] = samplePalette(SCORE_PALETTE, score);
  return `rgb(${r} ${g} ${b})`;
}
