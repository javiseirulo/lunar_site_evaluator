/**
 * 2D south-polar map (owner: Javi2): composites the active raster layers in store order with
 * their opacity, draws a lat/lon grid and clickable site pins. It's the lightweight view for
 * phones and the fallback while the 3D globe loads.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayersManifest, Site } from '@lunar/contracts';
import { cn } from '@/lib/utils';
import {
  formatLatLon,
  latLonToUv,
  loadLayerTexture,
  useAppStore,
  useData,
  uvToLatLon,
} from '@/core';
import { scoreColor } from './scoreColor';

export function PolarMap({ className }: { className?: string }) {
  const manifest = useData((s) => s.layers);
  const sites = useData((s) => s.sites);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const layerOpacity = useAppStore((s) => s.layerOpacity);
  const selectedSiteId = useAppStore((s) => s.selectedSiteId);
  const selectSite = useAppStore((s) => s.selectSite);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);

  // Composite active layers, bottom → top.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!manifest || !canvas) return;
    let cancelled = false;
    const defs = activeLayers.flatMap((id) => manifest.layers.find((l) => l.id === id) ?? []);
    void Promise.all(defs.map((l) => loadLayerTexture(l).catch(() => null))).then((textures) => {
      if (cancelled) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = manifest.width_px;
      canvas.height = manifest.height_px;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      textures.forEach((tex, i) => {
        if (!tex) return;
        const def = defs[i]!;
        ctx.globalAlpha = layerOpacity[def.id] ?? def.default_opacity;
        ctx.drawImage(tex, 0, 0, canvas.width, canvas.height);
      });
      ctx.globalAlpha = 1;
    });
    return () => {
      cancelled = true;
    };
  }, [manifest, activeLayers, layerOpacity]);

  if (!manifest) return <div className={cn('aspect-square', className)} />;

  return (
    <div className={cn('relative aspect-square select-none', className)}>
      <div className="border-edge-hi/40 absolute inset-0 overflow-hidden rounded-full border bg-[#0d1424]">
        <canvas
          ref={canvasRef}
          className="size-full [image-rendering:auto]"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(
              uvToLatLon((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, manifest),
            );
          }}
          onMouseLeave={() => setHover(null)}
          aria-label="South polar map"
          role="img"
        />
      </div>
      <Graticule manifest={manifest} />
      {/* contracts/README v1.1: whole-Moon catalog; this map only covers the south pole. */}
      {sites
        ?.filter((s) => s.region === 'south_pole' || s.lat <= manifest.lat_limit)
        .map((s) => (
          <Pin
            key={s.id}
            site={s}
            manifest={manifest}
            selected={s.id === selectedSiteId}
            onSelect={() => selectSite(s.id === selectedSiteId ? null : s.id)}
          />
        ))}
      <div className="num bg-night/80 text-white pointer-events-none absolute bottom-0 left-0 rounded-[3px] px-1.5 py-0.5 text-[11px]">
        {hover
          ? formatLatLon(hover[0], hover[1])
          : `South pole to ${Math.abs(manifest.lat_limit)}°S`}
      </div>
    </div>
  );
}

function Graticule({ manifest }: { manifest: LayersManifest }) {
  const { rings, spokes } = useMemo(() => {
    const ringLats = [-82.5, -85, -87.5].filter((l) => l < manifest.lat_limit);
    const rings = ringLats.map((lat) => {
      const [u, v] = latLonToUv(lat, 0, manifest);
      return { lat, r: Math.hypot(u - 0.5, v - 0.5) };
    });
    const spokes = Array.from({ length: 12 }, (_, i) => i * 30 - 180).map((lon) => {
      const [u, v] = latLonToUv(manifest.lat_limit, lon, manifest);
      return { lon, u, v };
    });
    return { rings, spokes };
  }, [manifest]);

  return (
    <svg viewBox="0 0 1 1" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <g stroke="white" strokeOpacity={0.12} strokeWidth={0.0015} fill="none">
        {rings.map((r) => (
          <circle key={r.lat} cx={0.5} cy={0.5} r={r.r} />
        ))}
        {spokes.map((s) => (
          <line key={s.lon} x1={0.5} y1={0.5} x2={s.u} y2={s.v} />
        ))}
      </g>
      <g
        fill="white"
        fillOpacity={0.35}
        fontSize={0.022}
        fontFamily="JetBrains Mono Variable, monospace"
      >
        {rings.map((r) => (
          <text key={r.lat} x={0.5 + 0.004} y={0.5 - r.r - 0.006}>
            {Math.abs(r.lat)}°S
          </text>
        ))}
        {spokes
          .filter((s) => s.lon % 90 === 0)
          .map((s) => (
            <text
              key={s.lon}
              x={0.5 + (s.u - 0.5) * 0.93}
              y={0.5 + (s.v - 0.5) * 0.93}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {s.lon === 0
                ? '0°'
                : s.lon === -180
                  ? '180°'
                  : `${Math.abs(s.lon)}°${s.lon < 0 ? 'W' : 'E'}`}
            </text>
          ))}
      </g>
    </svg>
  );
}

function Pin({
  site,
  manifest,
  selected,
  onSelect,
}: {
  site: Site;
  manifest: LayersManifest;
  selected: boolean;
  onSelect: () => void;
}) {
  const [u, v] = latLonToUv(site.lat, site.lon, manifest);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group absolute -translate-x-1/2 -translate-y-1/2 p-1.5"
      style={{ left: `${u * 100}%`, top: `${v * 100}%` }}
      aria-label={`${site.name}, score ${Math.round(site.score * 100)}`}
      aria-pressed={selected}
    >
      <span
        className={cn(
          'block size-[9px] rotate-45 border group-hover:scale-125',
          selected
            ? 'animate-pop scale-150 border-white outline outline-1 outline-black'
            : 'border-black',
          !site.valid && 'opacity-50',
        )}
        style={{ background: scoreColor(site.score) }}
      />
      <span
        className={cn(
          'pointer-events-none absolute top-1/2 left-full z-10 ml-1 -translate-y-1/2 rounded-[3px] bg-white px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap text-black',
          selected ? 'block' : 'hidden group-hover:block',
        )}
      >
        {site.name}
      </span>
    </button>
  );
}
