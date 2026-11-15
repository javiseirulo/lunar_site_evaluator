/**
 * Teacher screen (projector): class token + QR, the question (emergency + 4 landing-site cards),
 * live count of answers, then per-card votes, the right answer, why it was best, and the ranking.
 */
import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router';
import { clsx } from 'clsx';
import { Check, Trophy, Users } from 'lucide-react';
import { useAppStore, useData } from '@/core';
import type { Difficulty } from '../engine/bars';
import type { Card } from '../engine/deal';
import { pickEmergency } from '../state/gameStore';
import { handSiteImages } from '../ui/assets';
import { CAUSE_HEADLINE, emergencyById, lessonFor } from '../ui/content';
import { dealTimeline, formatClock } from '../ui/format';
import { SiteCard } from '../ui/SiteCard';
import { Podium, Ranking } from './Ranking';
import { useTeacher, type TeacherSession } from './useTeacher';

const TIMELINE = dealTimeline(4, true);
const TOTALS = [3, 5, 8];

export default function TeacherPage() {
  const proMode = useAppStore((s) => s.proMode);
  const difficulty: Difficulty = proMode ? 'expert' : 'normal';
  const t = useTeacher(difficulty);
  const { phase } = t.state;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/game" className="btn h-9 px-3 text-[11px]">
          ← Back to game
        </Link>
        <div className="flex items-center gap-4 font-mono text-[12px] tracking-widest uppercase">
          <span className="text-ink-muted">
            Class <b className="text-warn text-base">{t.token}</b>
          </span>
          <span className="flex items-center gap-1.5 text-ink">
            <Users className="size-4" aria-hidden /> {Object.keys(t.players).length}
          </span>
          {!t.online && <span className="text-bad">Reconnecting…</span>}
        </div>
      </header>

      {t.error && <p className="text-bad font-mono text-sm">{t.error}</p>}
      {phase === 'lobby' && <Lobby t={t} />}
      {(phase === 'question' || phase === 'results') && <Question t={t} />}
      {phase === 'final' && <Final t={t} />}
    </div>
  );
}

function joinUrl(token: string): string {
  const local = new URLSearchParams(window.location.search).has('local') ? '?local=1' : '';
  return `${window.location.origin}${import.meta.env.BASE_URL}join/${token}${local}`;
}

function Lobby({ t }: { t: TeacherSession }) {
  const names = Object.values(t.players).map((p) => p.name);
  const url = joinUrl(t.token);
  return (
    <section className="mission-pixel mx-auto flex w-full max-w-4xl flex-col items-center gap-6 border-4 border-black bg-navy-800 p-6 md:flex-row md:items-start">
      <div className="flex flex-col items-center gap-2">
        <div className="bg-white p-3">
          <QRCodeSVG value={url} size={220} />
        </div>
        <p className="text-ink-muted font-mono text-[11px]">Scan with your phone</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="label">Class token</p>
          <p className="text-warn font-mono text-6xl font-bold tracking-[0.2em]">{t.token}</p>
          <p className="text-ink-muted mt-1 font-mono text-[11px] break-all">{url}</p>
        </div>
        <div>
          <p className="label">Questions</p>
          <div role="group" aria-label="Number of questions" className="flex gap-2">
            {TOTALS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={t.state.total === n}
                onClick={() => t.setTotal(n)}
                className={clsx('btn h-9 px-4 text-[12px]', t.state.total === n && 'btn-go')}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-ink-muted mt-1 font-mono text-[11px]">
            {t.difficulty === 'expert' ? 'Expert' : 'Normal'} difficulty (site-wide switch). 3
            minutes per question, faster right answers score more.
          </p>
        </div>
        <div>
          <p className="label">Students ({names.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {names.length === 0 && (
              <span className="text-ink-muted font-mono text-[12px]">Waiting for students…</span>
            )}
            {names.map((n, i) => (
              <span key={`${n}${i}`} className="chip">
                {n}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-go h-12 px-6 text-[14px]"
          disabled={names.length === 0 || t.loading}
          onClick={t.start}
        >
          {t.loading ? 'Preparing…' : 'Start'}
        </button>
      </div>
    </section>
  );
}

function Question({ t }: { t: TeacherSession }) {
  const { state, hand, seed } = t;
  const sites = useData((s) => s.sites);
  const results = state.phase === 'results';
  const cards = useMemo(() => hand?.cards ?? [], [hand]);
  const images = useMemo(() => handSiteImages(cards, seed), [cards, seed]);
  const emergency = emergencyById(pickEmergency(seed));
  const answered = Object.keys(t.answers).length;
  const nPlayers = Object.keys(t.players).length;
  const left = Math.max(0, state.deadline - t.now);
  const counts = state.counts ?? [0, 0, 0, 0];
  const maxVotes = Math.max(1, ...counts);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono uppercase">
        <span className="text-[12px] tracking-widest">
          Question {state.q + 1} / {state.total}
        </span>
        <span className="text-[12px] tracking-widest text-ink">
          {answered} / {nPlayers} answered
        </span>
        <span className={clsx('text-3xl font-bold', left < 30_000 && !results && 'text-bad')}>
          {results ? 'Results' : formatClock(left)}
        </span>
      </div>

      {emergency && (
        <div className="mission-pixel border-4 border-black bg-navy-900 p-3">
          <p className="text-bad font-mono text-[12px] font-bold tracking-widest uppercase">
            ⚠ {emergency.title}
          </p>
          <p className="text-[13px] text-ink">{emergency.briefing}</p>
          <p className="text-warn mt-1 font-mono text-[12px] uppercase">
            Which landing site should we pick?
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card, i) => {
          const isCorrect = results && card.slot === state.correct;
          const votes = counts[card.slot - 1] ?? 0;
          return (
            <div
              key={card.slot}
              className={clsx('flex flex-col gap-1.5', results && !isCorrect && 'opacity-60')}
            >
              <SiteCard
                card={card}
                site={sites?.find((s) => s.id === card.siteId)}
                difficulty={t.difficulty}
                image={images[card.slot] ?? null}
                index={i}
                dealt={false}
                timeline={TIMELINE}
                state="idle"
                clickable={false}
                onPick={() => undefined}
              />
              {results && (
                <div className="mission-pixel border-2 border-black bg-navy-900 p-2">
                  <div className="flex items-center justify-between font-mono text-[12px] font-bold">
                    <span className={clsx(isCorrect ? 'text-good' : 'text-ink')}>
                      {isCorrect && <Check className="mr-1 inline size-4" aria-hidden />}
                      {votes} vote{votes === 1 ? '' : 's'}
                    </span>
                    <span className="text-ink-muted">
                      {nPlayers ? Math.round((votes / nPlayers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-black">
                    <div
                      className={clsx('h-full', isCorrect ? 'bg-good' : 'bg-ink-muted')}
                      style={{ width: `${(votes / maxVotes) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!results && (
        <div className="flex justify-center">
          <button type="button" className="btn btn-go h-11 px-6 text-[13px]" onClick={t.reveal}>
            Reveal answer
          </button>
        </div>
      )}

      {results && (
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <Insights cards={cards} correct={state.correct ?? 1} />
          <div>
            <p className="label mb-1 flex items-center gap-1.5">
              <Trophy className="size-4" aria-hidden /> Top players
            </p>
            <Ranking board={state.board ?? []} limit={5} />
          </div>
          <div className="flex justify-center md:col-span-2">
            <button type="button" className="btn btn-go h-11 px-6 text-[13px]" onClick={t.next}>
              {state.q + 1 < state.total ? 'Next question' : 'Final ranking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Why the right card was the best one, and what sank each of the others. */
function Insights({ cards, correct }: { cards: readonly Card[]; correct: number }) {
  const best = cards.find((c) => c.slot === correct);
  return (
    <div className="mission-pixel flex flex-col gap-2 border-4 border-black bg-navy-900 p-3 text-[13px]">
      <p className="text-good font-mono text-[12px] font-bold tracking-widest uppercase">
        Best choice: Landing site {correct}
        {best ? ` · ${'★'.repeat(best.verdict.stars)}` : ''}
      </p>
      {best && <p className="text-ink">{best.verdict.detail}.</p>}
      {cards
        .filter((c) => c.slot !== correct)
        .map((c) => (
          <p key={c.slot} className="text-ink-muted">
            <b className="text-ink">Site {c.slot}:</b>{' '}
            {c.verdict.win
              ? `also survives, but scored lower (${Math.round(c.verdict.score * 100)}%).`
              : `${CAUSE_HEADLINE[c.verdict.cause!]} ${lessonFor(c.verdict.cause)}`}
          </p>
        ))}
    </div>
  );
}

function Final({ t }: { t: TeacherSession }) {
  const board = t.state.board ?? [];
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-center font-mono text-3xl font-bold tracking-[0.15em] uppercase">
        Final ranking
      </h1>
      <Podium board={board} />
      <Ranking board={board} limit={10} />
      <div className="flex justify-center">
        <Link to="/game" className="btn h-11 px-6 text-[13px]">
          Back to game
        </Link>
      </div>
    </section>
  );
}
