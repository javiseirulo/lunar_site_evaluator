/**
 * Controls and labels for the polar terrain patch — owner: Marta (src/globe).
 * Shown while the camera is close to the south pole (the "South pole" button distance or closer).
 */
import { loadTerrain, useTerrain } from './terrainStore';
import { PAPER } from './paper';

export const SHADING_LABEL =
  'Illustrative shading — official sunlight figures come from the data pipeline';

export const EXAGGERATION_LABEL = 'Vertical exaggeration ×2 (shadows not to scale)';

export function PatchControls() {
  const status = useTerrain((s) => s.status);
  const shown = useTerrain((s) => s.shown);
  const exaggeration = useTerrain((s) => s.exaggeration);
  const setExaggeration = useTerrain((s) => s.setExaggeration);
  if (!shown || status === 'idle') return null;

  return (
    <div className="box w-60 px-3 py-2 text-[12px]" style={PAPER}>
      <p className="text-heading flex items-center text-[13px] font-medium">
        Polar terrain
        {status === 'loading' && (
          <span className="text-ink-muted ml-auto font-normal">loading…</span>
        )}
        {status === 'error' && (
          <button
            type="button"
            className="lnk ml-auto font-normal"
            onClick={() => void loadTerrain()}
          >
            unavailable · retry
          </button>
        )}
      </p>
      {status === 'ready' && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={exaggeration === 2}
              className="switch"
              onClick={() => setExaggeration(exaggeration === 2 ? 1 : 2)}
            />
            Vertical ×2
          </label>
          <p className="text-ink-muted">{SHADING_LABEL}</p>
          <p className="text-ink-muted">LOLA 80 m DEM (LDEM_80S), resampled to about 0.6 km.</p>
        </div>
      )}
    </div>
  );
}
