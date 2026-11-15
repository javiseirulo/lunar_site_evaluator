import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/core';
import { START_UTC, END_UTC } from './viewLink';

export function StreetViewClock() {
  const time = useAppStore((s) => s.currentTimeUTC);
  const setTime = useAppStore((s) => s.setTime);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6);
  const frame = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(),
      published = last;
    const tick = (now: number) => {
      if (now - published >= 100) {
        const next = Math.min(
          Date.parse(END_UTC),
          Date.parse(useAppStore.getState().currentTimeUTC) + (now - last) * speed * 3600,
        );
        setTime(new Date(next).toISOString().replace('.000Z', 'Z'));
        last = now;
        published = now;
        if (next === Date.parse(END_UTC)) {
          setPlaying(false);
          return;
        }
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, speed, setTime]);
  const step = (hours: number) => {
    setPlaying(false);
    const next = Math.max(
      Date.parse(START_UTC),
      Math.min(Date.parse(END_UTC), Date.parse(time) + hours * 3600000),
    );
    setTime(new Date(next).toISOString().replace('.000Z', 'Z'));
  };
  return (
    <div className="lunar-clock">
      <label>
        Date / time UTC
        <input
          aria-label="Lunar date and time UTC"
          type="datetime-local"
          min={START_UTC.slice(0, 16)}
          max={END_UTC.slice(0, 16)}
          value={time.slice(0, 16)}
          onChange={(e) => {
            const candidate = e.target.value + 'Z',
              ms = Date.parse(candidate);
            if (Number.isFinite(ms) && ms >= Date.parse(START_UTC) && ms <= Date.parse(END_UTC)) {
              setPlaying(false);
              setTime(new Date(ms).toISOString().replace('.000Z', 'Z'));
            }
          }}
        />
      </label>
      <button className="btn" onClick={() => step(-24)}>
        −1 day
      </button>
      <button className="btn" onClick={() => step(-1)}>
        −1 h
      </button>
      <button className="btn" onClick={() => setPlaying(!playing)}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <button className="btn" onClick={() => step(1)}>
        +1 h
      </button>
      <button className="btn" onClick={() => step(24)}>
        +1 day
      </button>
      <label>
        Speed
        <select
          aria-label="Lunar time playback speed"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        >
          <option value={1}>1 h/s</option>
          <option value={6}>6 h/s</option>
          <option value={24}>1 day/s</option>
          <option value={168}>1 week/s</option>
        </select>
      </label>
    </div>
  );
}
