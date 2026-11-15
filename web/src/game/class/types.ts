export type ClassPhase = 'lobby' | 'question' | 'results' | 'final';

export interface BoardRow {
  sid: string;
  name: string;
  score: number;
}

/** What the teacher broadcasts. Students never get the hand itself, only this. */
export interface ClassState {
  phase: ClassPhase;
  /** 0-based question index. */
  q: number;
  total: number;
  /** Server-clock ms (see Transport.serverNow). 0 in the lobby. */
  shownAt: number;
  deadline: number;
  /** Winning slot (1-4). Only present from `results` on, so it cannot be read early. */
  correct?: number;
  /** Votes per slot, index 0 = slot 1. Only in `results`. */
  counts?: number[];
  /** Full ranking, best first (results and final). */
  board?: BoardRow[];
}

export interface Player {
  name: string;
}

export interface Answer {
  /** Slot 1-4. */
  choice: number;
  /** Ms between the question being shown and the answer, on the server clock. */
  t: number;
}
