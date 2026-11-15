/**
 * `recon` phase: the player has touched down at the chosen site and looks around before
 * committing. Shows Pablo's look-only Street View (`@/streetview/StreetViewEmbed`, lazy: the
 * only game file that imports street view) at the landing point, with the real Sun and Earth
 * at the touchdown hour. Until the 3D terrain is ready, and whenever it is unavailable (no
 * token, no WebGL, an error or > 12 s), a draggable 360° panorama (`ReconPanorama`) shows the
 * same sky instead, so the game never waits on Cesium.
 *
 * HUD: "Landing site N" (never the real name or coordinates), touchdown time, Sun / Earth at
 * that hour (from the timeseries, as the engine judges them), compass, hint and the running
 * countdown. Arrows turn the view, Enter simulates; "Simulate" → timelapse, "Choose another
 * site" → back to the same cards.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Earth, Eye, Play, RotateCcw, Sun } from 'lucide-react';
import { clsx } from 'clsx';
import { formatUtc, useData, useTimeseries } from '@/core';
import type { StreetViewEmbedHandle, StreetViewEmbedProps } from '@/streetview/StreetViewEmbed';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import { useGame } from '../state/gameStore';
import { siteTerrain } from './assets';
import { skyAt, viewHeading } from './cockpit/sky';
import { Countdown } from './Countdown';
import { compassPoint, earthText, reconSky, SUN_TEXT } from './panorama';
import { ReconPanorama } from './ReconPanorama';

const MARGIN = DEFAULT_REQUIREMENTS.antenna_margin_deg;
/** Give the 3D terrain this long before settling on the panorama. */
const TERRAIN_TIMEOUT_MS = 12_000;
/** Degrees turned per arrow key press. */
const KEY_STEP = 5;

/** Loading the embed chunk itself can fail (offline): report it like any other failure. */
const StreetViewEmbed = lazy(() =>
  import('@/streetview/StreetViewEmbed').catch(() => ({ default: EmbedChunkFailed })),
);

function EmbedChunkFailed({ onError }: StreetViewEmbedProps) {
  useEffect(() => onError?.('load'), [onError]);
  return null;
}

type Mode = 'loading' | '3d' | 'flat';

export function SiteRecon() {
  const hand = useGame((s) => s.hand);
  const slot = useGame((s) => s.chosenSlot);
  const simulate = useGame((s) => s.simulate);
  const chooseAgain = useGame((s) => s.chooseAgain);
  const card = hand?.cards.find((c) => c.slot === slot);
  const site = useData((s) => s.sites?.find((x) => x.id === card?.siteId) ?? null);
  const ts = useTimeseries(card?.siteId);
  const sky = useMemo(() => (ts && hand ? skyAt(ts, hand.startIndex, 0) : null), [ts, hand]);
  const status = useMemo(() => (sky ? reconSky(sky, MARGIN) : null), [sky]);
  const terrain = card ? siteTerrain(card.siteId) : 'rim';

  // Start facing between the Sun and the Earth so both are near the view when possible.
  const [initialHeading] = useState(() => (sky ? viewHeading(sky.sunAz, sky.earthAz) : 0));
  const [heading, setHeading] = useState(initialHeading);
  const [mode, setMode] = useState<Mode>('loading');
  const embed = useRef<StreetViewEmbedHandle>(null);
  const headingRef = useRef(heading);
  useEffect(() => {
    headingRef.current = heading;
  }, [heading]);

  const onReady = useCallback(() => {
    // Carry over where the player was already looking in the panorama.
    const turn = ((headingRef.current - initialHeading + 540) % 360) - 180;
    if (Math.abs(turn) > 0.5) embed.current?.look(turn, 0);
    setMode('3d');
  }, [initialHeading]);
  const onError = useCallback(() => setMode('flat'), []);
  // Backstop: if even the embed's code never arrives, settle on the panorama.
  useEffect(() => {
    if (mode !== 'loading') return;
    const id = window.setTimeout(() => setMode('flat'), TERRAIN_TIMEOUT_MS + 3000);
    return () => window.clearTimeout(id);
  }, [mode]);
  const onView = useCallback((v: { heading: number }) => setHeading(v.heading), []);

  const turn = useCallback(
    (dh: number) => {
      if (mode === '3d') embed.current?.look(dh, 0);
      else setHeading((h) => (((h + dh) % 360) + 360) % 360);
    },
    [mode],
  );

  // Arrows turn the view from anywhere on the screen (the 3D canvas handles its own keys);
  // Enter simulates unless a button or field has focus. Ignored while the exit dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (useGame.getState().pausedAt !== null || document.querySelector('dialog[open]')) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, canvas')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        turn(e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP);
      } else if (e.key === 'Enter' && !target?.closest('button, a')) {
        e.preventDefault();
        useGame.getState().simulate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const label = slot !== null ? `Landing site ${slot}` : 'Landing site';
  const touchdown = hand ? formatUtc(hand.landingUtc) : null;
  const canEmbed = !!site && !!hand && mode !== 'flat';

  return (
    <div className="mission-scan flex flex-1 flex-col gap-2 border-4 border-black bg-[#05070f] p-2 sm:p-3">
      <header className="flex flex-wrap items-center gap-3">
        <Eye className="text-warn size-6 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-[15px] leading-tight font-bold tracking-wider text-white uppercase">
            Surface reconnaissance
          </h2>
          <p className="text-warn font-mono text-[12px] font-bold tracking-widest uppercase">
            {label}
            {touchdown && <span className="text-ink-muted"> · touchdown {touchdown}</span>}
          </p>
        </div>
        <Countdown />
      </header>

      <div
        className="relative min-h-[300px] flex-1 overflow-hidden border-2 border-black bg-black"
        role="group"
        aria-label={`Surface view at ${label}. Drag or use the arrow keys to look around.`}
      >
        {sky && status && (
          <div
            className={clsx(
              'absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none',
              mode === '3d' ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
            aria-hidden={mode === '3d'}
          >
            <ReconPanorama
              sky={sky}
              status={status}
              terrain={terrain}
              heading={heading}
              onHeading={setHeading}
            />
          </div>
        )}
        {canEmbed && (
          <div
            className={clsx(
              'absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none',
              mode === '3d' ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <Suspense fallback={null}>
              <StreetViewEmbed
                ref={embed}
                lat={site.lat}
                lon={site.lon}
                timeUtc={hand.landingUtc}
                heading={initialHeading}
                hideLabels
                interactive="look-only"
                timeoutMs={TERRAIN_TIMEOUT_MS}
                onReady={onReady}
                onError={onError}
                onView={onView}
              />
            </Suspense>
          </div>
        )}
        {!sky && (
          <p className="text-ink-muted absolute inset-0 flex items-center justify-center font-mono text-[11px] tracking-widest uppercase">
            Loading telemetry…
          </p>
        )}

        {/* HUD */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-2">
          {status && (
            <ul className="flex flex-col gap-1 font-mono text-[11px] font-bold tracking-wider uppercase">
              <li
                className={clsx(
                  'flex items-center gap-1.5 border border-black bg-black/75 px-2 py-1',
                  status.sun === 'up' ? 'text-warn' : 'text-bad',
                )}
              >
                <Sun className="size-3.5" aria-hidden />
                {SUN_TEXT[status.sun]}
              </li>
              <li
                className={clsx(
                  'flex items-center gap-1.5 border border-black bg-black/75 px-2 py-1',
                  status.earth === 'up' ? 'text-[#8fd3ff]' : 'text-bad',
                )}
              >
                <Earth className="size-3.5" aria-hidden />
                {earthText(status.earth, MARGIN)}
              </li>
            </ul>
          )}
          <div
            className="flex items-center gap-1.5 border border-black bg-black/75 px-2 py-1 font-mono text-[11px] font-bold tracking-wider text-white"
            aria-label={`Facing ${compassPoint(heading)}, ${Math.round(heading)} degrees`}
          >
            <Compass
              className="size-3.5"
              style={{ transform: `rotate(${-heading}deg)` }}
              aria-hidden
            />
            {compassPoint(heading)} {String(Math.round(heading) % 360).padStart(3, '0')}°
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col items-center gap-1 text-center">
          <p className="text-ink bg-black/75 px-2 py-1 text-[12px] leading-snug">
            Drag to look around. Is the Sun or the Earth hidden behind terrain?
          </p>
          {mode !== '3d' && (
            <p className="text-ink-muted bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-wider">
              {mode === 'loading' && canEmbed
                ? 'Loading 3D terrain… simplified view meanwhile'
                : 'Simplified view — 3D terrain unavailable'}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn h-11 px-4" onClick={chooseAgain}>
          <RotateCcw className="size-4" aria-hidden />
          Choose another site
        </button>
        <button type="button" autoFocus className="btn btn-go h-11 px-5" onClick={simulate}>
          <Play className="size-4" aria-hidden />
          Simulate
        </button>
      </div>
    </div>
  );
}
