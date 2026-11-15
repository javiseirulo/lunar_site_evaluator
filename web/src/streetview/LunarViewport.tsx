import { useEffect, useRef, useState } from 'react';
import type { ViewerSky } from './sky';
import type { Observer, LunarScene } from './lunarScene';
import { createLunarScene } from './lunarScene';
import { lightingState, MAX_WALK_DISTANCE_M } from './navigation';
import type { LabelLayout } from './landmarks';
import { DEFAULT_VIEW, type ViewState } from './viewLink';
import { SaveLocation } from './SaveLocation';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './streetview.css';

interface Props {
  observer: Observer;
  token: string;
  sample: ViewerSky | null;
  initialView?: ViewState;
  onObserver: (point: Observer) => void;
  onView: (state: ViewState) => void;
  onGround: (height: number) => void;
  onReturn: () => void;
}
const lightText = {
  unknown: 'Solar state unavailable',
  night: 'Sun below local horizontal',
  shadow: 'Terrain shadow',
  sunlight: 'Sunlight',
};

export default function LunarViewport({
  observer,
  token,
  sample,
  initialView = DEFAULT_VIEW,
  onObserver,
  onView,
  onGround,
  onReturn,
}: Props) {
  const [savePoint, setSavePoint] = useState<Observer | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<LunarScene | null>(null);
  const currentObserver = useRef(observer);
  const latest = useRef({ sample, onObserver, onView, onGround });
  const initialCamera = useRef(initialView);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ground, setGround] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [height, setHeight] = useState(initialView.height);
  const [reading, setReading] = useState(false);
  const [names, setNames] = useState(true);
  const [hint, setHint] = useState(
    `Click or tap nearby ground to walk · up to ${MAX_WALK_DISTANCE_M} m per step.`,
  );
  const [view, setView] = useState(initialView);
  const [labels, setLabels] = useState<LabelLayout[]>([]);
  const [coordinates, setCoordinates] = useState(observer);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', close);
    };
  }, [expanded]);
  useEffect(() => {
    latest.current = { sample, onObserver, onView, onGround };
  }, [sample, onObserver, onView, onGround]);
  useEffect(() => {
    scene.current?.setSky(sample);
  }, [sample]);
  useEffect(() => {
    if (!container.current) return;
    const abort = new AbortController();
    let mounted: LunarScene | null = null;
    const fail = () => {
      setStatus('error');
      abort.abort();
    };
    const timeout = window.setTimeout(fail, 90_000);
    createLunarScene(
      container.current,
      currentObserver.current,
      token,
      abort.signal,
      {
        ground: (value) => {
          setGround(value);
          latest.current.onGround(value);
        },
        error: fail,
        hint: setHint,
        labels: setLabels,
        save: setSavePoint,
        view: (state) => {
          initialCamera.current = state;
          setView(state);
          latest.current.onView(state);
        },
        observer: (point) => {
          currentObserver.current = point;
          setCoordinates(point);
          latest.current.onObserver(point);
        },
      },
      initialCamera.current,
    )
      .then((instance) => {
        window.clearTimeout(timeout);
        if (abort.signal.aborted) {
          instance.destroy();
          return;
        }
        mounted = instance;
        scene.current = instance;
        instance.setSky(latest.current.sample);
        setStatus('ready');
      })
      .catch(() => {
        window.clearTimeout(timeout);
        if (!abort.signal.aborted) setStatus('error');
      });
    return () => {
      window.clearTimeout(timeout);
      abort.abort();
      mounted?.destroy();
      scene.current = null;
    };
  }, [observer, token, retry]);
  const state = lightingState(sample);
  return (
    <div className={`lunar-viewport${expanded ? ' lunar-expanded' : ''}`} data-light={state}>
      <div ref={container} className="lunar-canvas" />
      <svg className="lunar-landmarks" aria-label="Visible lunar feature names">
        {labels.map((label) => (
          <g key={label.id}>
            <circle cx={label.x} cy={label.y} r="2" />
            <path d={`M${label.x},${label.y} L${label.elbowX},${label.elbowY} H${label.endX}`} />
            <text x={Math.min(label.elbowX, label.endX) + 4} y={label.elbowY - 6}>
              {label.name}
            </text>
          </g>
        ))}
      </svg>
      {status !== 'ready' ? (
        <div className="lunar-message" role="status">
          {status === 'loading' ? (
            <>
              <span className="lunar-loading" />
              <p>Locating the lunar surface…</p>
              <small>Loading terrain from Cesium Moon</small>
            </>
          ) : (
            <>
              <p>Could not load the lunar surface.</p>
              <small>Check network, WebGL and token access to Cesium Moon.</small>
              <button
                className="btn"
                onClick={() => {
                  setStatus('loading');
                  setHeight(initialCamera.current.height);
                  setReading(false);
                  setNames(true);
                  setRetry((n) => n + 1);
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="lunar-environment" aria-live="polite">
            <span className="lunar-state-dot" />
            <span>
              {sample && !sample.terrainMatched
                ? sample.lit
                  ? 'Sun above estimated horizon'
                  : 'Sun below estimated horizon'
                : lightText[state]}
            </span>
            {sample && !sample.terrainMatched && (
              <small title="The 3D surface is visible. A terrain horizon has not been calculated for this exact location and eye height, so mountains are not included in this visibility estimate.">
                Terrain visibility not calculated
              </small>
            )}
            {reading && <small>Relief light on</small>}
          </div>
          <div className="lunar-toolbar">
            <button className="lunar-close" onClick={onReturn}>
              3D map
            </button>
            {expanded && (
              <button className="lunar-close" onClick={() => setExpanded(false)}>
                Close view
              </button>
            )}
            <div className="lunar-body-controls">
              <button
                className="lunar-close"
                disabled={!sample}
                onClick={() => scene.current?.faceBody('sun')}
              >
                Face Sun
              </button>
              <button
                className="lunar-close"
                disabled={!sample}
                onClick={() => scene.current?.faceBody('earth')}
              >
                Face Earth
              </button>
              <small>
                Az {Math.round(view.heading)}° · El {Math.round(view.pitch)}°
              </small>
            </div>
            <details className="lunar-options">
              <summary>View options</summary>
              <div className="lunar-option-panel">
                {!expanded && (
                  <button
                    className="btn"
                    onClick={(event) => {
                      event.currentTarget.closest('details')!.open = false;
                      setExpanded(true);
                    }}
                  >
                    Expand view
                  </button>
                )}
                <label className="lunar-check">
                  <input
                    type="checkbox"
                    checked={reading}
                    onChange={(e) => {
                      setReading(e.target.checked);
                      scene.current?.setReadingLight(e.target.checked);
                    }}
                  />
                  Relief reading light
                </label>
                <small>
                  Artificial fill reveals shapes. Source imagery may contain baked shadows.
                </small>
                <label className="lunar-check">
                  <input
                    type="checkbox"
                    checked={names}
                    onChange={(e) => {
                      setNames(e.target.checked);
                      scene.current?.setNames(e.target.checked);
                    }}
                  />
                  Named features
                </label>
                <label className="lunar-height">
                  Eye height{' '}
                  <input
                    type="number"
                    aria-label="Eye height in metres"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={height}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (n >= 0.5 && n <= 20) {
                        setHeight(n);
                        scene.current?.setHeight(n);
                      }
                    }}
                  />{' '}
                  m
                </label>
                <small>Visual height only. Scientific profiles use 5 m.</small>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void scene.current?.relocate(coordinates);
                  }}
                >
                  <p>Go anywhere on the Moon</p>
                  <div className="lunar-coordinate-fields">
                    <label>
                      Latitude
                      <input
                        type="number"
                        required
                        min="-90"
                        max="90"
                        step="any"
                        value={coordinates.lat}
                        onChange={(e) =>
                          setCoordinates((p) => ({ ...p, lat: Number(e.target.value) }))
                        }
                      />
                    </label>
                    <label>
                      Longitude E
                      <input
                        type="number"
                        required
                        min="-180"
                        max="180"
                        step="any"
                        value={coordinates.lon}
                        onChange={(e) =>
                          setCoordinates((p) => ({ ...p, lon: Number(e.target.value) }))
                        }
                      />
                    </label>
                  </div>
                  <button type="submit" className="btn">
                    Go to coordinates
                  </button>
                </form>
                <small>
                  Place names: IAU / USGS. Labels mark approximate feature areas, not measured
                  summits.
                </small>
                <button className="btn" onClick={() => setSavePoint(currentObserver.current)}>
                  Save current location
                </button>
              </div>
            </details>
          </div>
          <div className="lunar-guidance">
            <p className="lunar-desktop-help">
              Drag to look · Scroll to zoom · Click nearby ground to walk
            </p>
            <p className="lunar-touch-help">
              Drag to look · Pinch to zoom · Tap nearby ground to walk
            </p>
            <span className="lunar-hint" role="status">
              {hint}
            </span>
            <small>
              Mesh {ground?.toFixed(1)} m · Eye {height} m · Field of view {Math.round(view.fov)}°
            </small>
            <small>Right-click ground / double-tap to save a named location</small>
          </div>
        </>
      )}
      {savePoint && (
        <SaveLocation
          key={`${savePoint.lat}:${savePoint.lon}`}
          point={savePoint}
          onClose={() => setSavePoint(null)}
        />
      )}
    </div>
  );
}
