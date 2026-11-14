import { useEffect, useRef, useState } from 'react';
import type { SkySample } from '@/core';
import type { Observer, LunarScene } from './lunarScene';
import { createLunarScene } from './lunarScene';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './streetview.css';

interface Props {
  observer: Observer;
  token: string;
  sample: SkySample | null;
}

export default function LunarViewport({ observer, token, sample }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<LunarScene | null>(null);
  const sky = useRef(sample);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ground, setGround] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [height, setHeight] = useState(1.7);
  useEffect(() => {
    sky.current = sample;
    scene.current?.setSky(sample);
  }, [sample]);
  useEffect(() => {
    if (!container.current) return;
    const abort = new AbortController();
    let mounted: LunarScene | null = null;
    const timeout = window.setTimeout(() => {
      setStatus('error');
      abort.abort();
    }, 60_000);
    createLunarScene(container.current, observer, token, abort.signal, setGround, () => {
      setStatus('error');
      abort.abort();
    })
      .then((instance) => {
        window.clearTimeout(timeout);
        if (abort.signal.aborted) {
          instance.destroy();
          return;
        }
        mounted = instance;
        scene.current = instance;
        instance.setSky(sky.current);
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
  return (
    <div className="lunar-viewport">
      <div ref={container} className="lunar-canvas" />
      {status !== 'ready' && (
        <div className="lunar-message" role="status">
          {status === 'loading' ? (
            <p>Loading Cesium Moon and locating the surface…</p>
          ) : (
            <>
              <p>Could not load the lunar surface.</p>
              <p>Check network access, WebGL support and token access to Cesium Moon.</p>
              <button
                className="btn"
                onClick={() => {
                  setStatus('loading');
                  setHeight(1.7);
                  setRetry((n) => n + 1);
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}
      {status === 'ready' && (
        <div className="lunar-controls">
          <div className="flex flex-wrap items-center gap-1">
            <button
              className="btn"
              aria-label="Look left"
              onClick={() => scene.current?.look(-15, 0)}
            >
              ←
            </button>
            <button
              className="btn"
              aria-label="Look right"
              onClick={() => scene.current?.look(15, 0)}
            >
              →
            </button>
            <button className="btn" aria-label="Look up" onClick={() => scene.current?.look(0, 10)}>
              ↑
            </button>
            <button
              className="btn"
              aria-label="Look down"
              onClick={() => scene.current?.look(0, -10)}
            >
              ↓
            </button>
            <button className="btn" onClick={() => scene.current?.resetLook()}>
              Face north
            </button>
            <label className="ml-1 flex items-center gap-1">
              Eye height
              <input
                aria-label="Observer height above visual terrain in metres"
                className="field w-16"
                type="number"
                min="0.5"
                max="20"
                step="0.1"
                value={height}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isFinite(value) && value >= 0.5 && value <= 20) {
                    setHeight(value);
                    scene.current?.setHeight(value);
                    scene.current?.setSky(sky.current);
                  }
                }}
              />
              m
            </label>
          </div>
          <p className="mt-1">
            Drag / arrow keys · Mesh height {ground?.toFixed(1)} m · Eye height is visual;
            visibility uses pipeline observer settings.
          </p>
        </div>
      )}
    </div>
  );
}
