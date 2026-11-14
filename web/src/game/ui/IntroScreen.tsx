/**
 * The `intro` phase: Dr. Regolith briefs the pilot on why the lunar south pole matters.
 * Finishing the dialogue calls `endIntro()`; "Skip" calls `skipIntro()`. Both lead to the alert.
 */
import intro from '../content/intro.json';
import { useGame } from '../state/gameStore';
import { DialogueBox } from './DialogueBox';
import { PixelScientist } from './PixelScientist';

export function IntroScreen() {
  const endIntro = useGame((s) => s.endIntro);
  const skipIntro = useGame((s) => s.skipIntro);

  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-4 p-4 sm:p-6">
      <p className="font-mono text-[11px] tracking-[0.3em] text-ink-faint uppercase">
        Incoming transmission
      </p>
      <PixelScientist />
      <DialogueBox
        className="max-w-2xl"
        speaker={intro.speaker}
        lines={intro.lines}
        onDone={() => endIntro()}
        onSkip={() => skipIntro()}
      />
    </div>
  );
}
