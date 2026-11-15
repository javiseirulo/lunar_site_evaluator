/**
 * Realtime link between the teacher screen and the students' phones.
 * Firebase Realtime Database is the real transport (works over plain HTTPS/WSS on any wifi);
 * `?local=1` swaps in a BroadcastChannel one so two tabs of the same browser can rehearse
 * without any network.
 *
 * Data layout (see /database.rules.json):
 *   classes/<TOKEN>/state                 ClassState, written by the teacher
 *   classes/<TOKEN>/players/<sid>         { name }
 *   classes/<TOKEN>/answers/<q>/<sid>     { choice, t }, write-once
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref, set } from 'firebase/database';
import { firebaseConfig } from './config';
import type { Answer, ClassState, Player } from './types';

export type Unsub = () => void;
export type Players = Record<string, Player>;
export type Answers = Record<string, Answer>;

export interface Transport {
  /** Epoch ms on the shared (server) clock, so phones with a skewed clock still agree. */
  serverNow(): number;
  publishState(state: ClassState): Promise<void>;
  /** Fires with the latest state right away (null until the teacher publishes one). */
  onState(cb: (state: ClassState | null) => void): Unsub;
  join(sid: string, player: Player): Promise<void>;
  onPlayers(cb: (players: Players) => void): Unsub;
  /** Resolves false if the answer was rejected (e.g. already answered). */
  sendAnswer(q: number, sid: string, answer: Answer): Promise<boolean>;
  onAnswers(q: number, cb: (answers: Answers) => void): Unsub;
  /** Online/offline of the link itself, for a "reconnecting…" hint. */
  onConnection(cb: (online: boolean) => void): Unsub;
  close(): void;
}

/** Realtime Database rejects `undefined`; JSON round-trip drops those keys. */
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function createFirebaseTransport(token: string): Transport {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const root = `classes/${token}`;
  let offset = 0;
  const offUnsubs: Unsub[] = [
    onValue(ref(db, '.info/serverTimeOffset'), (s) => {
      offset = Number(s.val()) || 0;
    }),
  ];
  return {
    serverNow: () => Date.now() + offset,
    publishState: (state) => set(ref(db, `${root}/state`), clean(state)),
    onState: (cb) => onValue(ref(db, `${root}/state`), (s) => cb((s.val() as ClassState) ?? null)),
    join: (sid, player) => set(ref(db, `${root}/players/${sid}`), player),
    onPlayers: (cb) => onValue(ref(db, `${root}/players`), (s) => cb((s.val() as Players) ?? {})),
    sendAnswer: (q, sid, answer) =>
      set(ref(db, `${root}/answers/${q}/${sid}`), answer).then(
        () => true,
        () => false,
      ),
    onAnswers: (q, cb) =>
      onValue(ref(db, `${root}/answers/${q}`), (s) => cb((s.val() as Answers) ?? {})),
    onConnection: (cb) => onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true)),
    close: () => offUnsubs.forEach((u) => u()),
  };
}

type Msg =
  | { k: 'state'; v: ClassState }
  | { k: 'player'; sid: string; v: Player }
  | { k: 'answer'; q: number; sid: string; v: Answer }
  | { k: 'sync' };

/** Same-browser transport: every tab keeps a copy and answers `sync` requests from new tabs. */
export function createLocalTransport(token: string): Transport {
  const chan = new BroadcastChannel(`lse-class-${token}`);
  let state: ClassState | null = null;
  const players: Players = {};
  const answers: Record<number, Answers> = {};
  const stateCbs = new Set<(s: ClassState | null) => void>();
  const playerCbs = new Set<(p: Players) => void>();
  const answerCbs = new Set<{ q: number; cb: (a: Answers) => void }>();

  const apply = (m: Msg) => {
    if (m.k === 'state') {
      state = m.v;
      stateCbs.forEach((cb) => cb(state));
    } else if (m.k === 'player') {
      players[m.sid] = m.v;
      playerCbs.forEach((cb) => cb({ ...players }));
    } else if (m.k === 'answer') {
      answers[m.q] ??= {};
      if (answers[m.q]![m.sid]) return; // write-once, like the real rules
      answers[m.q]![m.sid] = m.v;
      answerCbs.forEach((x) => x.q === m.q && x.cb({ ...answers[m.q]! }));
    }
  };
  chan.onmessage = (e: MessageEvent<Msg>) => {
    if (e.data.k === 'sync') {
      if (state) chan.postMessage({ k: 'state', v: state } satisfies Msg);
      for (const [sid, v] of Object.entries(players)) {
        chan.postMessage({ k: 'player', sid, v } satisfies Msg);
      }
      for (const [q, byQ] of Object.entries(answers)) {
        for (const [sid, v] of Object.entries(byQ)) {
          chan.postMessage({ k: 'answer', q: Number(q), sid, v } satisfies Msg);
        }
      }
    } else apply(e.data);
  };
  chan.postMessage({ k: 'sync' } satisfies Msg);

  const send = (m: Msg) => {
    apply(m);
    chan.postMessage(m);
  };
  return {
    serverNow: () => Date.now(),
    publishState: (v) => {
      send({ k: 'state', v: clean(v) });
      return Promise.resolve();
    },
    onState: (cb) => {
      stateCbs.add(cb);
      cb(state);
      return () => stateCbs.delete(cb);
    },
    join: (sid, v) => {
      send({ k: 'player', sid, v });
      return Promise.resolve();
    },
    onPlayers: (cb) => {
      playerCbs.add(cb);
      cb({ ...players });
      return () => playerCbs.delete(cb);
    },
    sendAnswer: (q, sid, v) => {
      const taken = Boolean(answers[q]?.[sid]);
      if (!taken) send({ k: 'answer', q, sid, v });
      return Promise.resolve(!taken);
    },
    onAnswers: (q, cb) => {
      const x = { q, cb };
      answerCbs.add(x);
      cb({ ...(answers[q] ?? {}) });
      return () => answerCbs.delete(x);
    },
    onConnection: (cb) => {
      cb(true);
      return () => undefined;
    },
    close: () => chan.close(),
  };
}

/** `?local=1` (or `?local`) selects the BroadcastChannel transport. */
export function createTransport(token: string, search = window.location.search): Transport {
  return new URLSearchParams(search).has('local')
    ? createLocalTransport(token)
    : createFirebaseTransport(token);
}
