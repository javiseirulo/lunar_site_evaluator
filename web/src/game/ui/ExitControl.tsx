/**
 * The in-game "X": opens a small modal "Leave this mission?" with Restart mission (new hand),
 * Back to menu and Keep playing. It is a native modal <dialog>: the rest of the page is inert
 * while it is open (focus stays inside), Esc closes it, and focus returns to the X.
 *
 * The game keeps running underneath: the decision countdown does not pause.
 */
import { useEffect, useRef, useState } from 'react';
import { Home, Play, RotateCcw, Timer, X } from 'lucide-react';
import { sfx } from '../audio/sfx';
import { useGame, type Phase } from '../state/gameStore';

/** Phases where the decision countdown is on screen. */
const CLOCK_PHASES: readonly Phase[] = ['alert', 'dealing', 'choosing'];

export function ExitControl() {
  const phase = useGame((s) => s.phase);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const xRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      sfx.modalOpen();
      d.showModal();
      keepRef.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  const close = () => setOpen(false);
  const clockRunning = CLOCK_PHASES.includes(phase);

  return (
    <>
      <button
        ref={xRef}
        type="button"
        aria-label="Leave mission"
        title="Leave mission"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        data-sfx-silent
        className="mission-pixel flex size-10 shrink-0 cursor-pointer items-center justify-center border-2 border-black bg-[#2a0a0e] text-white hover:bg-[#ff3b30] focus-visible:bg-[#ff3b30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="size-5" strokeWidth={3} aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="mission-exit-title"
        aria-describedby="mission-exit-desc"
        // Esc (cancel) and every close path end here: sync state and return focus to the X.
        onClose={() => {
          // Fires for every close (buttons, Esc, backdrop).
          sfx.modalClose();
          setOpen(false);
          xRef.current?.focus();
        }}
        onClick={(e) => {
          // A click on the backdrop (the dialog box itself, outside the panel) closes it.
          if (e.target === e.currentTarget) close();
        }}
        className="mission-pixel m-auto w-[min(92vw,360px)] border-4 border-black bg-[#0a1830] p-0 text-[#e6edf7] backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-3 p-4">
          <h2
            id="mission-exit-title"
            className="font-mono text-[16px] font-bold tracking-wider text-white uppercase"
          >
            Leave this mission?
          </h2>
          <p id="mission-exit-desc" className="text-[13px] leading-snug text-[#9fb2d0]">
            {clockRunning ? (
              <span className="flex items-center gap-1.5 font-mono font-bold text-[#ffcc4d]">
                <Timer className="size-4 shrink-0" aria-hidden />
                The clock is still running.
              </span>
            ) : (
              'Your progress in this mission will be lost.'
            )}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn h-10 justify-start px-3 text-[13px]"
              onClick={() => {
                close();
                useGame.getState().restart();
              }}
            >
              <RotateCcw className="size-4" aria-hidden />
              Restart mission
            </button>
            <button
              type="button"
              className="btn h-10 justify-start px-3 text-[13px]"
              onClick={() => {
                close();
                useGame.getState().quit();
              }}
            >
              <Home className="size-4" aria-hidden />
              Back to menu
            </button>
            <button
              ref={keepRef}
              type="button"
              className="btn btn-go h-10 justify-start px-3 text-[13px]"
              onClick={close}
            >
              <Play className="size-4" aria-hidden />
              Keep playing
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
