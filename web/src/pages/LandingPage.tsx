import { useNavigate } from 'react-router';
import { Mountain, SatelliteDish, Snowflake, Sun, type LucideIcon } from 'lucide-react';
import type { Site } from '@lunar/contracts';
import { useAppStore, useData } from '@/core';
import { PolarMap, ScoreBox } from '@/layers';

/** Home: one hero panel with the site of the day, and four big topic tiles. */
export function LandingPage() {
  const sites = useData((s) => s.sites);
  const top = sites ? [...sites].filter((s) => s.valid).sort((a, b) => b.score - a.score)[0] : null;

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <section className="box p-5">
        <h1 className="text-heading text-[34px] leading-[1.1] font-black tracking-[-0.01em]">
          Where should the next lander{' '}
          <span className="bg-gradient-to-r from-[#ff6fb5] to-[#ff8a3d] bg-clip-text text-transparent">
            touch down?
          </span>
        </h1>
        <p className="text-ink mt-3 max-w-[46ch] text-[15px]">
          Find a safe, sunny place to land near the Moon&apos;s south pole, then compare sites to
          pick the best one.
        </p>
        {top && <FeaturedSite site={top} />}
      </section>

      <TopicTiles />
    </div>
  );
}

function FeaturedSite({ site }: { site: Site }) {
  const selectSite = useAppStore((s) => s.selectSite);
  const navigate = useNavigate();
  return (
    <div className="border-edge mt-6 flex flex-col gap-5 rounded-[8px] border bg-[#0e0820] p-4 sm:flex-row sm:items-center">
      <div
        className="space pointer-events-none aspect-square w-full shrink-0 rounded-[6px] p-2 sm:w-[170px]"
        aria-hidden
      >
        <PolarMap className="size-full" />
      </div>
      <div className="min-w-0">
        <p className="text-ink-muted text-[14px]">Site of the Day</p>
        <h2 className="text-heading mt-0.5 text-[24px] font-black">{site.name}</h2>
        <div className="mt-4 flex items-center gap-4">
          <ScoreBox score={site.score} />
          <button
            type="button"
            className="btn btn-go h-[38px] px-4 text-[15px]"
            onClick={() => {
              selectSite(site.id);
              navigate('/explore');
            }}
          >
            Explore →
          </button>
        </div>
      </div>
    </div>
  );
}

/** Big neon topic tiles. Map topics open Explore with that layer switched on. */
function TopicTiles() {
  const navigate = useNavigate();
  const setLayerActive = useAppStore((s) => s.setLayerActive);
  const openLayer = (layerId: string) => {
    setLayerActive(layerId, true);
    navigate('/explore');
  };
  const tiles: { label: string; Icon: LucideIcon; color: string; go: () => void }[] = [
    { label: 'Sunlight', Icon: Sun, color: '#ffb84d', go: () => openLayer('illumination') },
    {
      label: 'Earth View',
      Icon: SatelliteDish,
      color: '#5cc8ff',
      go: () => navigate('/learn#earth'),
    },
    { label: 'Terrain', Icon: Mountain, color: '#b394ff', go: () => openLayer('slope') },
    { label: 'Icy Craters', Icon: Snowflake, color: '#ff6fb5', go: () => openLayer('psr') },
  ];
  return (
    <section className="grid grid-cols-2 gap-4" aria-label="Topics">
      {tiles.map(({ label, Icon, color, go }) => (
        <button
          key={label}
          type="button"
          onClick={go}
          className="box lift group flex min-h-[170px] flex-col items-center justify-center gap-4"
        >
          <Icon
            className="size-16 transition-transform duration-200 group-hover:scale-110"
            style={{ color, filter: `drop-shadow(0 0 10px ${color})` }}
            strokeWidth={1.6}
            aria-hidden
          />
          <span className="text-heading text-[18px]">{label}</span>
        </button>
      ))}
    </section>
  );
}
