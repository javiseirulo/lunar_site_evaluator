/** Pure display/timing helpers for the Mission UI. */

/** Milliseconds left → "mm:ss", rounding up so "00:00" only shows when time is really up. */
export function formatClock(ms: number): string {
  const total = Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface DealTimeline {
  /** Seconds before card `i` slides onto the table. */
  slideDelay: (i: number) => number;
  /** Seconds before card `i` flips face-up. */
  flipDelay: (i: number) => number;
  slideDuration: number;
  flipDuration: number;
  /** Milliseconds from the start of the deal until every card is face-up. */
  totalMs: number;
}

/** Cards slide in one by one face-down, then flip one by one. Instant with reduced motion. */
export function dealTimeline(count: number, reducedMotion: boolean): DealTimeline {
  if (reducedMotion || count <= 0) {
    return {
      slideDelay: () => 0,
      flipDelay: () => 0,
      slideDuration: 0,
      flipDuration: 0,
      totalMs: 0,
    };
  }
  const slideStep = 0.25;
  const slideDuration = 0.4;
  const pause = 0.35;
  const flipStep = 0.45;
  const flipDuration = 0.5;
  const flipStart = (count - 1) * slideStep + slideDuration + pause;
  return {
    slideDelay: (i) => i * slideStep,
    flipDelay: (i) => flipStart + i * flipStep,
    slideDuration,
    flipDuration,
    totalMs: Math.round((flipStart + (count - 1) * flipStep + flipDuration) * 1000),
  };
}

/** Count-up value after `elapsedMs` of a `durationMs` ease-out animation to `target` (rounded). */
export function countUp(elapsedMs: number, durationMs: number, target: number): number {
  if (!(durationMs > 0) || elapsedMs >= durationMs) return target;
  const t = Math.max(0, elapsedMs) / durationMs;
  return Math.round(target * (1 - (1 - t) ** 3));
}

/** Slot chosen by a number-key shortcut ("1"–"4"), or null if the key is not a listed slot. */
export function slotForKey(key: string, slots: readonly number[]): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  const n = Number(key);
  return slots.includes(n) ? n : null;
}
