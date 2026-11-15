/**
 * The `intro` phase, inside the lander: through the cabin window the Moon turns (the background
 * globe shows through a transparent viewport; the cabin around it is opaque), and Dr. Regolith
 * explains at the console why we go to the lunar south pole. Finishing the dialogue calls `endIntro()`; "Skip" calls
 * `skipIntro()`. Both lead to the alert.
 */
import intro from '../content/intro.json';
import { useGame } from '../state/gameStore';
import { DialogueBox } from './DialogueBox';
import { PixelScientist } from './PixelScientist';

/** Cabin wall colour: the viewport's giant shadow paints it around the window. */
const CABIN_COLOR = '#0b0f1a';

function Rivet({ className }: { className: string }) {
  return <span aria-hidden className={`mission-rivet ${className}`} />;
}

export function IntroScreen() {
  const endIntro = useGame((s) => s.endIntro);
  const skipIntro = useGame((s) => s.skipIntro);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* The viewport: transparent, so the spinning Moon behind shows through. Its spread shadow
          is the cabin wall around it (clipped to this screen by overflow-hidden). */}
      <div
        aria-hidden
        className="relative mx-3 mt-1 min-h-[190px] flex-1 rounded-[40px] border-[6px] border-[#2b3142] outline-4 outline-black"
        style={{
          boxShadow: `0 0 0 9999px ${CABIN_COLOR}, inset 0 0 48px #000c, inset 0 0 0 2px #555c70`,
        }}
      >
        <Rivet className="top-3 left-6" />
        <Rivet className="top-3 right-6" />
        <Rivet className="bottom-3 left-6" />
        <Rivet className="right-6 bottom-3" />
        {/* A faint reflection on the glass. */}
        <span className="pointer-events-none absolute inset-y-4 left-[12%] w-10 -skew-x-12 bg-white/[0.04]" />
        <span className="pointer-events-none absolute inset-y-4 left-[17%] w-3 -skew-x-12 bg-white/[0.03]" />
      </div>

      <p className="text-ink-faint relative mt-2 text-center font-mono text-[10.5px] tracking-[0.3em] uppercase">
        Lander cabin · lunar orbit
      </p>

      {/* The console: the doctor and his dialogue. */}
      <div className="relative flex flex-col items-center gap-3 p-3 sm:flex-row sm:items-end sm:p-4">
        <div className="mission-bezel relative shrink-0 p-1.5">
          <PixelScientist mood="neutral" className="size-24 bg-black/60 sm:size-32" />
        </div>
        <DialogueBox
          className="max-w-2xl min-w-0 flex-1"
          speaker={intro.speaker}
          lines={intro.lines}
          onDone={() => endIntro()}
          onSkip={() => skipIntro()}
        />
      </div>
    </div>
  );
}
