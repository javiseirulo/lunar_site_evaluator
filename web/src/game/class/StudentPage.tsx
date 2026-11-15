/**
 * Student screen (phone): enter the class token (or arrive from the QR), pick a nickname, then
 * answer each question with one of four big buttons, one per landing site. Nothing heavy is
 * loaded here: the cards are on the projector.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { clsx } from 'clsx';
import { Circle, Diamond, Square, Triangle, type LucideIcon } from 'lucide-react';
import { formatClock } from '../ui/format';
import { Ranking } from './Ranking';
import { pointsFor, rankOf } from './scoring';
import { normalizeToken } from './token';
import { createTransport, type Answers } from './transport';
import type { ClassState } from './types';
import { useServerNow } from './useServerNow';

const SLOTS: { slot: number; Icon: LucideIcon; color: string }[] = [
  { slot: 1, Icon: Triangle, color: 'bg-[#ff7a6b]' },
  { slot: 2, Icon: Diamond, color: 'bg-[#6fb4ff]' },
  { slot: 3, Icon: Circle, color: 'bg-[#ffcc4d]' },
  { slot: 4, Icon: Square, color: 'bg-[#8fe39a]' },
];

interface Identity {
  sid: string;
  name: string;
}

const storeKey = (token: string) => `lse.class.${token}`;

function loadIdentity(token: string): Identity | null {
  try {
    const raw = sessionStorage.getItem(storeKey(token));
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

function newSid(): string {
  try {
    return crypto.randomUUID().slice(0, 12);
  } catch {
    return Math.random().toString(36).slice(2, 14);
  }
}

export default function StudentPage() {
  const { token: param } = useParams();
  const token = param ? normalizeToken(param) : null;
  return (
    <main className="mission-root flex min-h-screen flex-col items-center justify-center bg-navy-950 p-4 text-ink">
      {token ? <Joining token={token} /> : <TokenForm invalid={Boolean(param)} />}
    </main>
  );
}

function TokenForm({ invalid }: { invalid: boolean }) {
  const [value, setValue] = useState('');
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = normalizeToken(value);
    if (t) void navigate(`/join/${t}${window.location.search}`);
  };
  return (
    <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3 text-center">
      <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase">Join class</h1>
      {invalid && <p className="text-bad font-mono text-[12px]">That token does not look right.</p>}
      <input
        className="field text-center font-mono text-2xl tracking-[0.3em] uppercase"
        aria-label="Class token"
        placeholder="TOKEN"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={8}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="btn btn-go h-12 text-[14px]"
        disabled={!normalizeToken(value)}
      >
        Join
      </button>
    </form>
  );
}

function Joining({ token }: { token: string }) {
  const [identity, setIdentity] = useState<Identity | null>(() => loadIdentity(token));
  const [name, setName] = useState('');
  if (identity) return <Session token={token} identity={identity} />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = { sid: newSid(), name: trimmed.slice(0, 20) };
    try {
      sessionStorage.setItem(storeKey(token), JSON.stringify(id));
    } catch {
      // Private mode: the identity lives only until the page reloads.
    }
    setIdentity(id);
  };
  return (
    <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3 text-center">
      <p className="label">Class {token}</p>
      <h1 className="font-mono text-2xl font-bold tracking-[0.15em] uppercase">Your nickname</h1>
      <input
        className="field text-center text-lg"
        aria-label="Nickname"
        placeholder="Nickname"
        maxLength={20}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn btn-go h-12 text-[14px]" disabled={!name.trim()}>
        Enter
      </button>
    </form>
  );
}

function Session({ token, identity }: { token: string; identity: Identity }) {
  const { sid, name } = identity;
  const transport = useMemo(() => createTransport(token), [token]);
  const [state, setState] = useState<ClassState | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState<{ q: number; slot: number } | null>(null);
  const sending = useRef(false);
  const now = useServerNow(transport);

  useEffect(() => {
    const offs = [
      transport.onState(setState),
      transport.onConnection((on) => {
        setOnline(on);
        // (Re)announce on every (re)connection; the rules allow the same name again.
        if (on) void transport.join(sid, { name });
      }),
    ];
    void transport.join(sid, { name });
    return () => {
      offs.forEach((o) => o());
      transport.close();
    };
  }, [transport, sid, name]);

  const q = state?.q ?? 0;
  const live = state?.phase === 'question' || state?.phase === 'results';
  useEffect(() => {
    if (!live) return;
    return transport.onAnswers(q, setAnswers);
  }, [transport, live, q]);

  const mine = answers[sid];
  const myChoice = mine?.choice ?? (pending?.q === q ? pending.slot : null);

  const choose = (slot: number) => {
    if (!state || state.phase !== 'question' || myChoice !== null || sending.current) return;
    sending.current = true;
    setPending({ q: state.q, slot });
    const t = Math.max(0, transport.serverNow() - state.shownAt);
    void transport.sendAnswer(state.q, sid, { choice: slot, t }).finally(() => {
      sending.current = false;
    });
  };

  const board = state?.board ?? [];
  const rank = rankOf(board, sid);
  const myScore = board.find((r) => r.sid === sid)?.score ?? 0;

  return (
    <div className="flex w-full max-w-md flex-1 flex-col gap-3">
      <header className="flex items-center justify-between font-mono text-[11px] tracking-widest uppercase">
        <span className="text-ink-muted">
          {name} · {token}
        </span>
        {!online && <span className="text-bad">Reconnecting…</span>}
        {state && state.phase !== 'lobby' && (
          <span>
            Q {Math.min(state.q + 1, state.total)}/{state.total}
          </span>
        )}
      </header>

      {!state && <Center>Connecting…</Center>}

      {state?.phase === 'lobby' && (
        <Center>
          <b className="text-warn text-xl">You&apos;re in!</b>
          <span>Waiting for the teacher to start.</span>
        </Center>
      )}

      {state?.phase === 'question' && myChoice === null && now < state.deadline && (
        <>
          <p className="text-center font-mono text-3xl font-bold">
            {formatClock(Math.max(0, state.deadline - now))}
          </p>
          <div className="grid flex-1 grid-cols-2 gap-3">
            {SLOTS.map(({ slot, Icon, color }) => (
              <button
                key={slot}
                type="button"
                onClick={() => choose(slot)}
                aria-label={`Landing site ${slot}`}
                className={clsx(
                  'mission-pixel flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border-4 border-black font-mono font-bold text-black active:translate-y-1',
                  color,
                )}
              >
                <Icon className="size-12" fill="currentColor" aria-hidden />
                <span className="text-[13px] tracking-wider uppercase">Site {slot}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {state?.phase === 'question' && (myChoice !== null || now >= state.deadline) && (
        <Center>
          {myChoice !== null ? (
            <>
              <b className="text-warn text-xl">Answer locked in</b>
              <span>You picked Landing site {myChoice}.</span>
              <span className="text-ink-muted text-[12px]">Look at the projector…</span>
            </>
          ) : (
            <b className="text-bad text-xl">Time&apos;s up</b>
          )}
        </Center>
      )}

      {state?.phase === 'results' && (
        <>
          <Center>
            {myChoice === null ? (
              <b className="text-bad text-xl">No answer</b>
            ) : myChoice === state.correct ? (
              <>
                <b className="text-good text-2xl">Correct!</b>
                <span>+{pointsFor(true, mine?.t ?? 0, state.deadline - state.shownAt)} points</span>
              </>
            ) : (
              <>
                <b className="text-bad text-2xl">Not this time</b>
                <span>Best was Landing site {state.correct}.</span>
              </>
            )}
            <span className="text-ink-muted text-[12px]">
              {rank ? `You are #${rank} with ${myScore} points` : ''}
            </span>
          </Center>
          <Ranking board={board} limit={5} highlight={sid} />
        </>
      )}

      {state?.phase === 'final' && (
        <>
          <Center>
            <b className="text-warn text-2xl">{rank ? `You finished #${rank}` : 'Finished'}</b>
            <span>{myScore} points</span>
          </Center>
          <Ranking board={board} limit={5} highlight={sid} />
        </>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center font-mono text-[14px]">
      {children}
    </div>
  );
}
