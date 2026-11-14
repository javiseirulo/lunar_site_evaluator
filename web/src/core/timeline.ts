/** CSS gradient with a solid band wherever `flags` is 1 (sunlit / Earth-in-view timelines). */
export function windowsGradient(flags: (0 | 1)[], color: string): string {
  const n = flags.length;
  if (n === 0) return 'transparent';
  const stops: string[] = [];
  let start = -1;
  for (let i = 0; i <= n; i++) {
    const on = i < n && flags[i] === 1;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const a = (start / n) * 100;
      const b = (i / n) * 100;
      stops.push(`transparent ${a}%`, `${color} ${a}%`, `${color} ${b}%`, `transparent ${b}%`);
      start = -1;
    }
  }
  return stops.length ? `linear-gradient(to right, ${stops.join(', ')})` : 'transparent';
}

export const SUN_BAND = 'rgb(255 180 60 / 0.85)';
export const EARTH_BAND = 'rgb(90 180 255 / 0.8)';
