/**
 * Day / night layer: terminator line in the scene and its switch over the globe — owner: Marta.
 * State and geometry helpers live in nightLayer.ts.
 */
import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { terminatorPoints, useNightLayer } from './nightLayer';
import { PAPER } from './paper';

/** Day/night boundary for the current Sun direction (Three axes); only while the layer is on. */
export function Terminator({ sun }: { sun: readonly [number, number, number] | null }) {
  const on = useNightLayer((s) => s.on);
  // Rebuilt only when the Sun actually moves (the direction array is new on every render).
  const key = sun ? sun.map((x) => x.toFixed(5)).join(',') : '';
  const geometry = useMemo(() => {
    if (!sun) return null;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(terminatorPoints(sun), 3));
    return g;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!on || !geometry) return null;
  return (
    <lineLoop geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color="#ffd27a" transparent opacity={0.85} toneMapped={false} />
    </lineLoop>
  );
}

export function NightControls({ hasSun }: { hasSun: boolean }) {
  const on = useNightLayer((s) => s.on);
  const setOn = useNightLayer((s) => s.setOn);
  return (
    <div className="box w-60 px-3 py-2 text-[12px]" style={PAPER}>
      <label className="text-heading flex cursor-pointer items-center gap-2 text-[13px] font-medium">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          className="switch"
          onClick={() => setOn(!on)}
        />
        Day / night
      </label>
      {on && (
        <div className="mt-1.5 flex flex-col gap-1">
          {hasSun ? (
            <>
              <p className="flex items-center gap-2">
                <span aria-hidden className="inline-block h-0.5 w-3 bg-[#ffd27a]" />
                Terminator (day/night line)
              </p>
              <p className="flex items-center gap-2">
                <span aria-hidden className="inline-block size-2.5 rounded-[1px] bg-[#3b4a72]" />
                Night side (blue)
              </p>
              <p className="text-ink-muted">
                Follows the Mission Clock: press Play to watch it move.
              </p>
            </>
          ) : (
            <p className="text-ink-muted">
              No ephemeris for this date: the night side shows, but not where it is.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
