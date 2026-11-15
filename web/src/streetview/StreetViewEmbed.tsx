/**
 * Look-only Street View for other modules (the Mission game's recon screen): the Cesium Moon
 * terrain at `lat`/`lon`, with the real Sun and Earth markers for `timeUtc` (shared `@/ephem`
 * vectors through `observerSky`). No location picker, sharing, access panel, walking or
 * (with `hideLabels`) feature names. It reads the build's token only; without one, or when
 * WebGL / Cesium fails or setup exceeds `timeoutMs`, it calls `onError` once and renders
 * nothing, so the host can show its own fallback. Load it lazily (it pulls in Cesium).
 *
 *   <StreetViewEmbed lat={-89.9} lon={0} timeUtc="2027-03-01T12:00:00Z"
 *     ref={handle} onReady={…} onError={(why) => …} onView={(v) => v.heading} />
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useEphem } from '@/ephem';
import {
  embedInitialView,
  embedSceneOptions,
  embedToken,
  hasWebGL,
  type EmbedFailure,
  type EmbedInteraction,
} from './embed';
import { createLunarScene, type LunarScene } from './lunarScene';
import { observerSky } from './sky';
import type { ViewState } from './viewLink';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './streetview.css';

export interface StreetViewEmbedHandle {
  /** Turn the view by `dh` degrees of heading and `dp` of pitch (no-op until ready). */
  look: (dh: number, dp: number) => void;
}

export interface StreetViewEmbedProps {
  lat: number;
  lon: number;
  /** ISO UTC instant whose Sun / Earth positions are shown. */
  timeUtc: string;
  /** Initial heading, degrees clockwise from north. */
  heading?: number;
  /** Hide official feature names (they could reveal the place). Default true. */
  hideLabels?: boolean;
  /** 'look-only' (default): drag / arrows / zoom only; 'walk' also allows click-to-walk. */
  interactive?: EmbedInteraction;
  /** Give up after this long without a ready surface. Default 90 s (as the page). */
  timeoutMs?: number;
  onReady?: () => void;
  onError?: (reason: EmbedFailure) => void;
  onView?: (view: ViewState) => void;
  className?: string;
  ref?: Ref<StreetViewEmbedHandle>;
}

export default function StreetViewEmbed({
  lat,
  lon,
  timeUtc,
  heading = 0,
  hideLabels = true,
  interactive = 'look-only',
  timeoutMs = 90_000,
  onReady,
  onError,
  onView,
  className,
  ref,
}: StreetViewEmbedProps) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<LunarScene | null>(null);
  const latest = useRef({ onReady, onError, onView });
  const [failed, setFailed] = useState(false);
  const setup = useRef({ heading, hideLabels, interactive, timeoutMs });

  useEffect(() => {
    latest.current = { onReady, onError, onView };
  }, [onReady, onError, onView]);

  useImperativeHandle(ref, () => ({ look: (dh, dp) => scene.current?.look(dh, dp) }), []);

  const parsed = Date.parse(timeUtc);
  const ephem = useEphem(
    timeUtc,
    Number.isFinite(parsed) ? new Date(parsed + 1).toISOString() : timeUtc,
  );
  // Real Sun/Earth for this instant once the vectors are loaded (flat horizon: the mesh
  // itself hides a body behind terrain).
  const sample = useMemo(
    () => (ephem.ready ? observerSky({ lat, lon }, timeUtc) : null),
    [ephem.ready, lat, lon, timeUtc],
  );
  const latestSample = useRef(sample);
  useEffect(() => {
    latestSample.current = sample;
    scene.current?.setSky(sample);
  }, [sample]);

  useEffect(() => {
    let done = false;
    const fail = (reason: EmbedFailure) => {
      if (done) return;
      done = true;
      setFailed(true);
      latest.current.onError?.(reason);
    };
    const token = embedToken(import.meta.env.VITE_CESIUM_ION_TOKEN);
    if (!token) {
      fail('no-token');
      return;
    }
    if (!hasWebGL() || !container.current) {
      fail('webgl');
      return;
    }
    const { heading: h, hideLabels: hide, interactive: mode, timeoutMs: limit } = setup.current;
    const abort = new AbortController();
    let mounted: LunarScene | null = null;
    const timer = window.setTimeout(() => {
      fail('timeout');
      abort.abort();
    }, limit);
    const noop = () => undefined;
    createLunarScene(
      container.current,
      { lat, lon },
      token,
      abort.signal,
      {
        ground: noop,
        hint: noop,
        labels: noop,
        observer: noop,
        save: noop,
        error: () => {
          fail('load');
          abort.abort();
        },
        view: (state) => latest.current.onView?.(state),
      },
      embedInitialView(h),
      embedSceneOptions(hide, mode),
    )
      .then((instance) => {
        window.clearTimeout(timer);
        if (abort.signal.aborted || done) {
          instance.destroy();
          return;
        }
        mounted = instance;
        scene.current = instance;
        instance.setSky(latestSample.current);
        latest.current.onReady?.();
      })
      .catch(() => {
        window.clearTimeout(timer);
        if (!abort.signal.aborted) fail('load');
      });
    return () => {
      window.clearTimeout(timer);
      done = true;
      abort.abort();
      mounted?.destroy();
      scene.current = null;
    };
  }, [lat, lon]);

  if (failed) return null;
  return (
    <div className={`lunar-viewport lunar-embed${className ? ` ${className}` : ''}`}>
      <div ref={container} className="lunar-canvas" />
    </div>
  );
}
