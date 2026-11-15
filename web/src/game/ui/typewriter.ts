/**
 * Pure helpers for `DialogueBox`: how much of a line is typed after some time, and what a
 * click / Enter / Space does at a given point of the dialogue.
 */

/** Typing speed of the dialogue box, in characters per second. */
export const TYPE_CPS = 35;

/** Characters of a `length`-character line visible `elapsedMs` after it started typing. */
export function charsShown(elapsedMs: number, length: number, cps: number = TYPE_CPS): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(length, Math.floor((elapsedMs * cps) / 1000));
}

/** Milliseconds needed to type a whole `length`-character line. */
export function typingMs(length: number, cps: number = TYPE_CPS): number {
  return Math.ceil((Math.max(0, length) * 1000) / cps);
}

/**
 * What an "advance" input does: finish the line being typed, go to the next line, or end the
 * dialogue after the last line.
 */
export type AdvanceAction = 'complete' | 'next' | 'done';

export function advanceAction(
  lineIndex: number,
  shown: number,
  lineLength: number,
  lineCount: number,
): AdvanceAction {
  if (shown < lineLength) return 'complete';
  return lineIndex < lineCount - 1 ? 'next' : 'done';
}

/** Keys that advance the dialogue. */
export function isAdvanceKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar';
}
