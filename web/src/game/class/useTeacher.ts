/**
 * Teacher-side session: owns the class token, deals one hand per question from a random seed,
 * publishes the public state, collects answers, scores them and builds the ranking.
 * Students only ever see ClassState; the hand (and so the right answer) stays on this screen
 * until the results are revealed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty } from '../engine/bars';
import type { Hand } from '../engine/deal';
import { dealForSeed } from './dealForSeed';
import { bestSlot, buildBoard, countVotes, generateToken, pointsFor, QUESTION_MS } from './scoring';
import { randomSeed } from './token';
import { createTransport, type Answers, type Players, type Transport } from './transport';
import type { ClassState } from './types';
import { useServerNow } from './useServerNow';

const LOBBY: ClassState = { phase: 'lobby', q: 0, total: 5, shownAt: 0, deadline: 0 };

export interface TeacherSession {
  token: string;
  transport: Transport;
  online: boolean;
  state: ClassState;
  players: Players;
  answers: Answers;
  /** Hand of the open question (null in the lobby / final). */
  hand: Hand | null;
  seed: number;
  loading: boolean;
  error: string | null;
  now: number;
  setTotal: (n: number) => void;
  start: () => void;
  reveal: () => void;
  next: () => void;
  difficulty: Difficulty;
}

export function useTeacher(difficulty: Difficulty): TeacherSession {
  const [token] = useState(() => generateToken());
  const transport = useMemo(() => createTransport(token), [token]);
  const [online, setOnline] = useState(true);
  const [state, setState] = useState<ClassState>(LOBBY);
  const [players, setPlayers] = useState<Players>({});
  const [answers, setAnswers] = useState<Answers>({});
  const [hand, setHand] = useState<Hand | null>(null);
  const [seed, setSeed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useServerNow(transport);

  const stateRef = useRef(state);
  const playersRef = useRef(players);
  const answersRef = useRef(answers);
  const handRef = useRef(hand);
  const totals = useRef<Record<string, number>>({});
  const seeds = useRef(new Map<number, number>());
  const hands = useRef(new Map<number, Promise<Hand | null>>());
  useEffect(() => {
    stateRef.current = state;
    playersRef.current = players;
    answersRef.current = answers;
    handRef.current = hand;
  });

  useEffect(() => {
    const offs = [transport.onPlayers(setPlayers), transport.onConnection(setOnline)];
    // Publish the lobby so students who scan early see "waiting for the teacher".
    void transport.publishState(LOBBY);
    return () => {
      offs.forEach((o) => o());
      transport.close();
    };
  }, [transport]);

  // Live answers of the open question (kept through `results` for the vote bars).
  useEffect(() => {
    if (state.phase !== 'question' && state.phase !== 'results') return;
    return transport.onAnswers(state.q, setAnswers);
  }, [transport, state.phase, state.q]);

  const publish = useCallback(
    (s: ClassState) => {
      stateRef.current = s;
      setState(s);
      void transport.publishState(s);
    },
    [transport],
  );

  const seedFor = (q: number): number => {
    let s = seeds.current.get(q);
    if (s === undefined) {
      s = randomSeed();
      seeds.current.set(q, s);
    }
    return s;
  };
  const prefetch = (q: number): Promise<Hand | null> => {
    let p = hands.current.get(q);
    if (!p) {
      p = dealForSeed(seedFor(q));
      hands.current.set(q, p);
    }
    return p;
  };

  const showQuestion = useCallback(
    async (q: number, total: number) => {
      setLoading(true);
      setError(null);
      // A rejected deal (data fetch failed) must not leave the teacher stuck on "loading".
      const h = await prefetch(q).catch(() => null);
      setLoading(false);
      if (!h) {
        hands.current.delete(q);
        seeds.current.delete(q);
        setError('Could not build a question (data not loaded?). Try again.');
        return;
      }
      setHand(h);
      setSeed(seedFor(q));
      setAnswers({});
      const t = transport.serverNow();
      publish({ phase: 'question', q, total, shownAt: t, deadline: t + QUESTION_MS });
      if (q + 1 < total) void prefetch(q + 1);
    },
    // prefetch/seedFor only touch refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transport, publish],
  );

  const reveal = useCallback(() => {
    const s = stateRef.current;
    const h = handRef.current;
    if (s.phase !== 'question' || !h) return;
    const correct = bestSlot(h.cards);
    const current = answersRef.current;
    for (const [sid, a] of Object.entries(current)) {
      totals.current[sid] =
        (totals.current[sid] ?? 0) + pointsFor(a.choice === correct, a.t, s.deadline - s.shownAt);
    }
    publish({
      ...s,
      phase: 'results',
      correct,
      counts: countVotes(current),
      board: buildBoard(playersRef.current, totals.current),
    });
  }, [publish]);

  const next = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'results') return;
    if (s.q + 1 < s.total) {
      void showQuestion(s.q + 1, s.total);
    } else {
      setHand(null);
      publish({
        phase: 'final',
        q: s.q,
        total: s.total,
        shownAt: s.shownAt,
        deadline: s.deadline,
        board: buildBoard(playersRef.current, totals.current),
      });
    }
  }, [publish, showQuestion]);

  const start = useCallback(() => {
    if (stateRef.current.phase !== 'lobby') return;
    void showQuestion(0, stateRef.current.total);
  }, [showQuestion]);

  const setTotal = useCallback(
    (n: number) => {
      if (stateRef.current.phase === 'lobby') publish({ ...LOBBY, total: n });
    },
    [publish],
  );

  // Close the question when time is up or everybody has answered.
  useEffect(() => {
    if (state.phase !== 'question') return;
    const nPlayers = Object.keys(players).length;
    const nAnswered = Object.keys(answers).length;
    if (now >= state.deadline || (nPlayers > 0 && nAnswered >= nPlayers)) reveal();
  }, [now, state.phase, state.deadline, players, answers, reveal]);

  return {
    token,
    transport,
    online,
    state,
    players,
    answers,
    hand,
    seed,
    loading,
    error,
    now,
    setTotal,
    start,
    reveal,
    next,
    difficulty,
  };
}
