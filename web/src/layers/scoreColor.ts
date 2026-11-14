import { samplePalette } from '@/core';

/** Shared red → amber → lime ramp for site scores (pins, list dots, badges). */
const SCORE_PALETTE: [number, string][] = [
  [0, '#fc3d21'],
  [0.5, '#f2a900'],
  [1, '#4cb963'],
];

export function scoreColor(score: number): string {
  const [r, g, b] = samplePalette(SCORE_PALETTE, score);
  return `rgb(${r} ${g} ${b})`;
}
