import { useNavigate } from 'react-router';
import { METRICS, useAppStore, useData, useSelectedSite } from '@/core';
import { PolarMap, scoreColor } from '@/layers';

/**
 * Home: the Moon is the hero. A live polar map (click a site) sits in black space; beside it, a
 * plain question, the selected (or best) site's key figures, one red action and map shortcuts.
 */
export function LandingPage() {
  const sites = useData((s) => s.sites);
  const selected = useSelectedSite();
  const best = sites
    ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score)[0]
    : null;
  const site = selected ?? best;
  const navigate = useNavigate();
  const selectSite = useAppStore((s) => s.selectSite);
  const setLayerActive = useAppStore((s) => s.setLayerActive);

  const openMap = (layerId?: string) => {
    if (site && !selected) selectSite(site.id);
    if (layerId) setLayerActive(layerId, true);
    navigate('/explore');
  };

  return (
    <section className="box grid overflow-hidden md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="space p-5 sm:p-7">
        <div className="mx-auto aspect-square w-full max-w-[460px]">
          <PolarMap className="size-full" />
        </div>
        <p className="text-ink-muted mt-3 text-center text-[13px]">
          The lunar south pole, down to 80° south. Click a diamond to choose a site.
        </p>
      </div>

      <div className="flex flex-col p-6 sm:p-8">
        <h1 className="text-[36px] leading-[1.1] tracking-[-0.02em]">
          Where should the next lander touch down?
        </h1>
        <p className="text-ink mt-4 max-w-[44ch] text-[16px] leading-relaxed">
          Near the south pole the Sun barely rises above the hills, so a few kilometres can decide
          whether a lander has power and can talk to Earth. Pick a site and see.
        </p>

        {site && (
          <div className="mt-8">
            <p className="label">{selected ? 'Selected site' : 'Best site in this data'}</p>
            <div className="mt-1 flex items-end justify-between gap-4">
              <h2 className="text-[24px] leading-tight">{site.name}</h2>
              <p className="num leading-none">
                <span
                  className="mr-2 inline-block size-3 align-middle"
                  style={{ background: scoreColor(site.score) }}
                  aria-hidden
                />
                <span className="text-heading text-[48px] font-medium">
                  {Math.round(site.score * 100)}
                </span>
                <span className="text-ink-faint text-[14px]"> / 100</span>
              </p>
            </div>
            <dl className="rows border-edge mt-3 border-t">
              {METRICS.slice(0, 3).map((m) => (
                <div key={m.key} className="flex justify-between py-2 text-[14px]">
                  <dt className="text-ink-muted">{m.label}</dt>
                  <dd className="num text-heading font-medium">{m.format(site.metrics, false)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            className="btn btn-go h-[42px] px-5 text-[15px]"
            onClick={() => openMap()}
          >
            Explore the map
          </button>
          <p className="text-ink-muted mt-4 text-[14px]">
            Or open the map showing{' '}
            <button type="button" className="lnk" onClick={() => openMap('illumination')}>
              sunlight
            </button>
            ,{' '}
            <button type="button" className="lnk" onClick={() => openMap('slope')}>
              slope
            </button>{' '}
            or{' '}
            <button type="button" className="lnk" onClick={() => openMap('psr')}>
              icy craters
            </button>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
