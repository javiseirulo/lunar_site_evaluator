/**
 * Controls and labels for the polar terrain patch — owner: Marta (src/globe).
 * Shown once the patch has started loading (it loads near the south pole or from the pole marker).
 */
import { loadTerrain, useTerrain } from './terrainStore';
import { PAPER } from './paper';

export const EXAGGERATION_LABEL = 'Vertical exaggeration ×2 (shadows not to scale)';

export function PatchControls() {
  const status = useTerrain((s) => s.status);
  const highDetail = useTerrain((s) => s.highDetail);
  const exaggeration = useTerrain((s) => s.exaggeration);
  const setHighDetail = useTerrain((s) => s.setHighDetail);
  const setExaggeration = useTerrain((s) => s.setExaggeration);
  if (status === 'idle') return null;

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
              aria-checked={highDetail}
              className="switch"
              onClick={() => setHighDetail(!highDetail)}
            />
            High detail
            <span className="text-ink-muted ml-auto">{highDetail ? '1025²' : '513²'}</span>
          </label>
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
          <p className="text-ink-muted">LOLA 80 m DEM (LDEM_80S), resampled to about 0.6 km.</p>
        </div>
      )}
    </div>
  );
}
