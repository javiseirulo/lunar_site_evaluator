/**
 * `timelapse` phase: plays the 7-day surface mission in ~25 s by driving the shared clock
 * (`setTime`) from the landing time. The default view is the lander cockpit (window + control
 * panel, `cockpit/CockpitView`); a "Map" tab shows the polar map. It freezes at the verdict's
 * `failHour` (the cockpit dramatises the cause) or runs to the last hour (all systems
 * nominal), holds for a moment, then calls `finish()`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { FastForward, Gauge, Map as MapIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { sampleAt, useAppStore, useTimeseries } from '@/core';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import { isLinkUp } from '../engine/simulate';
import { sfx } from '../audio/sfx';
import { useGame } from '../state/gameStore';
import { siteTerrain } from './assets';
import { CockpitView } from './cockpit/CockpitView';
import { MapView } from './cockpit/MapView';
import {
  dayOfMission,
  isoAtHour,
  missionHourAt,
  missionRuns,
  stopHourFor,
  TIMELAPSE_MS,
} from './timelapse';

const REQ = DEFAULT_REQUIREMENTS;
const DAYS = REQ.surface_days;
const MISSION_HOURS = DAYS * 24;
/** How long the frozen end state stays on screen before the verdict (time for the failure fx). */
const HOLD_MS = 3500;

type View = 'cockpit' | 'map';

const VIEWS: { id: View; label: string; icon: typeof Gauge }[] = [
  { id: 'cockpit', label: 'Cockpit', icon: Gauge },
  { id: 'map', label: 'Map', icon: MapIcon },
];

export function TimelapseScreen() {
  const hand = useGame((s) => s.hand);
  const chosenSlot = useGame((s) => s.chosenSlot);
  const card = hand?.cards.find((c) => c.slot === chosenSlot);
  const reduced = useReducedMotion() ?? false;
  const ts = useTimeseries(card?.siteId);
  const [view, setView] = useState<View>('cockpit');

  /** Fractional mission hour on screen (smooth sky motion); instruments use the whole hour. */
  const [hourF, setHourF] = useState(0);
  const hour = Math.floor(hourF);
  const [ended, setEnded] = useState(false);
  const skipRef = useRef(false);
  const finishedRef = useRef(false);
  const settledRef = useRef(false);

  const landingUtc = hand?.landingUtc;
  const stop = card ? stopHourFor(card.verdict.failHour, MISSION_HOURS) : 0;
  // The deal loaded every dealt site's series, so this is normally true on the first render.
  const ready = ts !== null;

  useEffect(() => {
    const finishOnce = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      useGame.getState().finish();
    };
    // Nothing to play (should not happen): go straight to the verdict screen.
    if (!landingUtc || !card) {
      finishOnce();
      return;
    }
    if (!ready) return;
    let raf = 0;
    let hold = 0;

    const settle = () => {
      settledRef.current = true;
      useAppStore.getState().setTime(isoAtHour(landingUtc, stop));
      setHourF(stop);
      setEnded(true);
      hold = window.setTimeout(finishOnce, HOLD_MS);
    };

    // Already played (a dependency changed afterwards, e.g. reduced motion toggled): do not
    // replay, only re-arm the hand-over to the verdict that the cleanup cancelled.
    if (settledRef.current) {
      hold = window.setTimeout(finishOnce, HOLD_MS);
      return () => window.clearTimeout(hold);
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      // Reduced motion: no playback, show the end state straight away.
      const h =
        reduced || skipRef.current
          ? stop
          : missionHourAt(now - t0, TIMELAPSE_MS, MISSION_HOURS, stop);
      if (h >= stop) {
        settle();
        return;
      }
      useAppStore.getState().setTime(isoAtHour(landingUtc, h));
      setHourF(h);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hold);
    };
  }, [landingUtc, card, stop, reduced, ready]);

  const runs = useMemo(
    () =>
      ts && hand ? missionRuns(ts, hand.startIndex, MISSION_HOURS, REQ.antenna_margin_deg) : null,
    [ts, hand],
  );

  // Soft chime at each new mission day; the cause's sting when the mission freezes on a failure.
  const day = dayOfMission(hour, DAYS);
  const lastDay = useRef(day);
  useEffect(() => {
    if (day > lastDay.current && !ended) sfx.dayChime();
    lastDay.current = day;
  }, [day, ended]);
  const verdict = card?.verdict;
  useEffect(() => {
    if (!ended || !verdict) return;
    if (verdict.win) sfx.dayChime();
    else if (verdict.cause) sfx.failure(verdict.cause);
  }, [ended, verdict]);

  if (!card || !landingUtc || !hand) return null;

  const sample = ts ? sampleAt(ts, isoAtHour(landingUtc, hour)) : null;
  const linkUp = sample
    ? isLinkUp(sample.earthVisible, sample.earth_el, REQ.antenna_margin_deg)
    : null;
  const lost = ended && !card.verdict.win;
  const shownHour = ended && card.verdict.win ? MISSION_HOURS : hour;
  const when = `Day ${day} · hour ${shownHour}`;

  return (
    <div
      className={clsx(
        'mission-scan relative flex flex-1 flex-col gap-2 overflow-hidden border-4 bg-[#05070f] p-2 sm:p-3',
        lost ? 'border-[#ff3b30]' : ended ? 'border-[#3ddc84]' : 'border-black',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-warn font-mono text-[11px] font-bold tracking-widest uppercase">
          Landing site {card.slot} · surface mission
        </p>
        <div role="group" aria-label="View" className="flex border-2 border-black">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={clsx(
                'flex min-h-10 cursor-pointer items-center gap-1 px-2.5 font-mono text-[11px] font-bold tracking-wider uppercase',
                view === id ? 'bg-warn text-black' : 'text-ink-muted bg-black hover:text-white',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </header>

      {view === 'cockpit' && ts ? (
        <CockpitView
          ts={ts}
          startIndex={hand.startIndex}
          hourF={hourF}
          hour={hour}
          ended={ended}
          verdict={card.verdict}
          terrain={siteTerrain(card.siteId)}
          runs={runs}
        />
      ) : (
        <MapView
          siteId={card.siteId}
          sunUp={sample ? sample.lit : null}
          linkUp={linkUp}
          darkRun={runs?.dark[hour] ?? 0}
          darkLimit={REQ.max_dark_h.threshold}
          blackoutRun={runs?.blackout[hour] ?? 0}
          blackoutLimit={REQ.max_blackout_h.threshold}
          ended={ended}
          verdict={card.verdict}
          when={when}
          days={DAYS}
        />
      )}

      <div className="flex justify-end">
        <button
          type="button"
          className="btn h-10 px-3 text-[12px]"
          disabled={ended}
          onClick={() => {
            skipRef.current = true;
          }}
        >
          <FastForward className="size-4" aria-hidden />
          Skip
        </button>
      </div>
    </div>
  );
}
