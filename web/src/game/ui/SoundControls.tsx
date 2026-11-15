/** Always-visible sound toggles: mute everything, and music on/off (effects stay). */
import { Music, Volume2, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';
import { useSoundPrefs } from '../audio/prefs';

const BTN =
  'mission-pixel flex size-10 shrink-0 cursor-pointer items-center justify-center border-2 border-black bg-black text-ink-muted hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn';

export function SoundControls() {
  const muted = useSoundPrefs((s) => s.muted);
  const musicOn = useSoundPrefs((s) => s.musicOn);
  const toggleMuted = useSoundPrefs((s) => s.toggleMuted);
  const toggleMusic = useSoundPrefs((s) => s.toggleMusic);

  return (
    <div role="group" aria-label="Sound" className="flex items-center gap-1.5">
      <button
        type="button"
        data-sfx-silent
        aria-pressed={!muted}
        aria-label="Sound"
        title={muted ? 'Sound off' : 'Sound on'}
        onClick={toggleMuted}
        className={clsx(BTN, !muted && 'text-warn')}
      >
        {muted ? (
          <VolumeX className="size-5" aria-hidden />
        ) : (
          <Volume2 className="size-5" aria-hidden />
        )}
      </button>
      <button
        type="button"
        aria-pressed={musicOn}
        aria-label="Music"
        title={musicOn ? 'Music on' : 'Music off'}
        disabled={muted}
        onClick={toggleMusic}
        className={clsx(BTN, musicOn && !muted && 'text-warn', 'disabled:opacity-40')}
      >
        <span className="relative">
          <Music className="size-5" aria-hidden />
          {!musicOn && (
            <span
              aria-hidden
              className="absolute top-1/2 left-1/2 h-0.5 w-6 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current"
            />
          )}
        </span>
      </button>
    </div>
  );
}
