/**
 * Historical mode: the player picks a real mission (sorted by year) or a random one. Only the
 * missions where the landing-site choice matters are listed (`playable`, see
 * `python/export/historic.py`).
 */
import { useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2, Shuffle, TriangleAlert } from 'lucide-react';
import { loadMissionList, narratorImage, useHistoric, type MissionSummary } from '../historic/data';
import { useGame } from '../state/gameStore';
import { scientistImage } from './assets';
import { GameImage } from './GameImage';

export function MissionPicker({ onBack }: { onBack: () => void }) {
  const missions = useHistoric((s) => s.missions);
  const listError = useHistoric((s) => s.listError);
  const startHistorical = useGame((s) => s.startHistorical);
  useEffect(() => {
    void loadMissionList();
  }, []);

  const playable = useMemo(
    () =>
      (missions ?? [])
        .filter((m) => m.playable)
        .sort((a, b) => a.landing_utc.localeCompare(b.landing_utc)),
    [missions],
  );
  const go = (m: MissionSummary) => startHistorical(m.id, m.alarm);
  const random = () => {
    const m = playable[Math.floor(Math.random() * playable.length)];
    if (m) go(m);
  };

  return (
    <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <div aria-hidden className="mission-scan absolute inset-0" />
      <header className="relative flex flex-wrap items-center gap-3">
        <button type="button" className="btn h-10 px-3" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[18px] font-bold tracking-wider text-white uppercase">
            Historical missions
          </h2>
          <p className="text-ink-muted font-mono text-[11px]">
            Real landings, real dates, real Sun. Can you pick the site history picked?
          </p>
        </div>
        <button
          type="button"
          className="btn btn-go h-10 px-4"
          onClick={random}
          disabled={playable.length === 0}
        >
          <Shuffle className="size-4" aria-hidden />
          Random mission
        </button>
      </header>

      {listError ? (
        <p className="text-bad relative font-mono text-[12px]">
          Could not load the missions: {listError}
        </p>
      ) : !missions ? (
        <p className="text-ink-muted relative flex items-center gap-2 font-mono text-[11px] uppercase">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Loading missions…
        </p>
      ) : (
        <ul className="relative grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {playable.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                data-sfx="hover"
                onClick={() => go(m)}
                className="mission-pixel group flex w-full cursor-pointer items-center gap-3 border-4 border-black bg-navy-800 p-2 text-left transition-[translate,border-color] duration-150 hover:-translate-y-0.5 hover:border-warn focus-visible:border-warn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn"
              >
                <GameImage
                  src={narratorImage(m.narrator)}
                  alt={m.narrator.name}
                  className="size-16 shrink-0 border-2 border-black bg-black/60 object-contain [image-rendering:pixelated]"
                  fallback={
                    <GameImage
                      src={scientistImage('neutral')}
                      alt={m.narrator.name}
                      className="size-16 shrink-0 border-2 border-black bg-black/60 object-contain [image-rendering:pixelated]"
                    />
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[14px] font-bold tracking-wide text-white uppercase">
                    {m.name}
                  </span>
                  <span className="text-ink-muted block font-mono text-[11px]">
                    {m.year} · {m.country}
                  </span>
                  <span className="text-ink-faint block truncate font-mono text-[10.5px]">
                    {m.narrator.name}
                  </span>
                </span>
                {m.alarm && (
                  <TriangleAlert
                    className="text-bad size-5 shrink-0"
                    aria-label="Something went wrong on this descent"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-ink-faint relative font-mono text-[10px]">
        Dialogues are playful dramatisations for learning, not real quotes. Sun and Earth computed
        for the real landing date (NASA/NAIF SPICE).
      </p>
    </div>
  );
}
