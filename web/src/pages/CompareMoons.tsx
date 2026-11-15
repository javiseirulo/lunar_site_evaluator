/**
 * A close view of the Moon with a small mark on the site. Longitude is what actually
 * turns the ground: south-polar sites share a latitude, so a latitude-only camera looks still.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { buildSpinner } from '@/intro/moonSphere';
import { loadMoonTexture } from '@/intro/moonTexture';

const SIZE = 512;
const ZOOM = 2.2;
const DEG = Math.PI / 180;

function shortest(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

/** A small mark on the site, so the ground stays readable. */
function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ff3b30';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}

export function SiteMoon({
  lat,
  lon,
  sunEl,
  label,
}: {
  lat: number;
  lon: number;
  sunEl: number;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const goal = useRef({ lat, lon, sunEl });
  // Updated after render (not during it): the animation reads the latest target each frame.
  useLayoutEffect(() => {
    goal.current = { lat, lon, sunEl };
  }, [lat, lon, sunEl]);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const ctx = node.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    let raf = 0;
    let watch = 0;
    node.width = SIZE;
    node.height = SIZE;
    const image = ctx.createImageData(SIZE, SIZE);
    const view = { ...goal.current };

    loadMoonTexture('moon-2k.jpg')
      .then((tex) => {
        if (cancelled) return;
        let spinner = buildSpinner(tex, SIZE, view.lat, 20, view.sunEl, ZOOM);
        let builtLat = view.lat;
        let builtSun = view.sunEl;
        const frame = () => {
          if (cancelled) return;
          const target = goal.current;
          view.lat += (target.lat - view.lat) * 0.16;
          view.lon += shortest(view.lon, target.lon) * 0.16;
          view.sunEl += (target.sunEl - view.sunEl) * 0.16;
          if (Math.abs(view.lat - builtLat) > 0.02 || Math.abs(view.sunEl - builtSun) > 0.05) {
            spinner = buildSpinner(tex, SIZE, view.lat, 20, view.sunEl, ZOOM);
            builtLat = view.lat;
            builtSun = view.sunEl;
          }
          spinner.draw(image.data, view.lon * DEG);
          ctx.putImageData(image, 0, 0);
          drawDot(ctx, SIZE / 2, SIZE / 2);
          const moving =
            Math.abs(target.lat - view.lat) > 0.04 ||
            Math.abs(shortest(view.lon, target.lon)) > 0.04 ||
            Math.abs(target.sunEl - view.sunEl) > 0.15;
          raf = moving ? requestAnimationFrame(frame) : 0;
        };
        const kick = () => {
          if (!raf) raf = requestAnimationFrame(frame);
        };
        kick();
        watch = window.setInterval(kick, 250);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearInterval(watch);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={`The Moon marked at ${label}`}
      className="absolute inset-0 h-full w-full bg-black object-contain"
    />
  );
}
