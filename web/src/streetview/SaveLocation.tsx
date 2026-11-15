import { useEffect, useRef, useState } from 'react';
import { formatLatLon, useSavedPlaces, type MoonPoint } from '@/core';

export function SaveLocation({ point, onClose }: { point: MoonPoint; onClose: () => void }) {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  return (
    <form
      className="lunar-save-panel"
      role="dialog"
      aria-label="Save lunar location"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (saved || !name.trim()) return;
        useSavedPlaces.getState().addPin({ ...point, name });
        setSaved(true);
      }}
    >
      <strong>{saved ? 'Location saved' : 'Save location'}</strong>
      <p className="font-mono">{formatLatLon(point.lat, point.lon)}</p>
      {saved ? (
        <p>Available in your saved pins on the 3D map, on this browser.</p>
      ) : (
        <label>
          Name
          <input
            ref={input}
            aria-label="Saved location name"
            value={name}
            maxLength={80}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}
      <div>
        <button className="btn" type="button" onClick={onClose}>
          {saved ? 'Close' : 'Cancel'}
        </button>
        {!saved && (
          <button className="btn btn-go" type="submit" disabled={!name.trim()}>
            Save pin
          </button>
        )}
      </div>
    </form>
  );
}
