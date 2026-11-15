/**
 * Retro dialogue box: types each line at `TYPE_CPS` with a blinking block cursor. Click, Enter
 * or Space completes the line being typed, then advances; after the last line it calls `onDone`
 * (once). With `prefers-reduced-motion` every line appears whole. Reusable by any game mode.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronRight, FastForward } from 'lucide-react';
import { clsx } from 'clsx';
import { sfx } from '../audio/sfx';
import { rateLimiter } from '../audio/theory';
import { advanceAction, charsShown, isAdvanceKey } from './typewriter';

export interface DialogueBoxProps {
  lines: readonly string[];
  speaker: string;
  onDone: () => void;
  /** Shows a "Skip" button that calls this. */
  onSkip?: () => void;
  className?: string;
}

/** Interval between typing updates; fine enough for 35 chars/s. */
const TICK_MS = 25;

export function DialogueBox({ lines, speaker, onDone, onSkip, className }: DialogueBoxProps) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(0);
  const doneRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  /** The player completed the current line by hand: stop typing (and blipping) it. */
  const rushedRef = useRef(false);

  const line = lines[index] ?? '';
  const shown = reduced ? line.length : Math.min(typed, line.length);
  const complete = shown >= line.length;
  const isLast = index >= lines.length - 1;

  // Take keyboard focus so Enter / Space work right away (without scrolling the page).
  useEffect(() => {
    boxRef.current?.focus({ preventScroll: true });
  }, []);

  // Type the current line; the timer is cleared on line change and on unmount.
  useEffect(() => {
    if (reduced) return;
    rushedRef.current = false;
    const start = performance.now();
    const length = line.length;
    // Typewriter blips, at most ~16 per second so they never become a buzz.
    const blipGate = rateLimiter(60);
    let blipped = 0;
    const id = window.setInterval(() => {
      if (rushedRef.current) {
        window.clearInterval(id);
        return;
      }
      const now = performance.now();
      const next = charsShown(now - start, length);
      setTyped((prev) => Math.max(prev, next));
      if (next > blipped) {
        if (blipGate(now)) sfx.blip(line.charAt(next - 1));
        blipped = next;
      }
      if (next >= length) window.clearInterval(id);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [index, line, reduced]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  const advance = () => {
    switch (advanceAction(index, shown, line.length, lines.length)) {
      case 'complete':
        rushedRef.current = true;
        setTyped(line.length);
        break;
      case 'next':
        setTyped(0);
        setIndex((i) => i + 1);
        break;
      case 'done':
        finish();
        break;
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isAdvanceKey(e.key)) return;
    e.preventDefault();
    if (!e.repeat) advance();
  };

  return (
    <div className={clsx('flex w-full flex-col gap-2', className)}>
      <div
        ref={boxRef}
        role="button"
        tabIndex={0}
        aria-label={
          complete ? (isLast ? 'Continue to the mission' : 'Next line') : 'Show the whole line'
        }
        onClick={advance}
        onKeyDown={onKeyDown}
        className="bg-navy-950/95 relative cursor-pointer border-4 border-double border-white/80 p-4 text-left shadow-[0_0_0_2px_#000] outline-none select-none focus-visible:border-amber-300"
      >
        <div className="mb-2 inline-block bg-white px-2 py-0.5 font-mono text-[11px] font-bold tracking-widest text-black uppercase">
          {speaker}
        </div>
        {/* Screen readers get the whole line at once; the typed copy is visual only. */}
        <p className="sr-only" aria-live="polite">
          {line}
        </p>
        <p
          aria-hidden
          className="grid min-h-[4.5em] font-mono text-[13px] leading-relaxed text-white"
        >
          {/* Invisible full line reserves the final height, so the box does not grow while typing. */}
          <span className="invisible col-start-1 row-start-1">{line}▌</span>
          <span className="col-start-1 row-start-1">
            {line.slice(0, shown)}
            {reduced ? (
              <span className="text-amber-300">▌</span>
            ) : (
              <motion.span
                className="text-amber-300"
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
              >
                ▌
              </motion.span>
            )}
          </span>
        </p>
        <div
          aria-hidden
          className={clsx(
            'mt-1 flex items-center justify-end gap-1 font-mono text-[10px] tracking-widest text-white/70 uppercase transition-opacity',
            complete ? 'opacity-100' : 'opacity-0',
          )}
        >
          {isLast ? 'Start mission' : 'Next'}
          <ChevronRight className="size-3" />
        </div>
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-ink-faint uppercase">
        <span>
          {index + 1} / {lines.length} · Click, Enter or Space
        </span>
        {onSkip && (
          <button type="button" className="btn inline-flex items-center gap-1" onClick={onSkip}>
            <FastForward className="size-3" aria-hidden />
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
