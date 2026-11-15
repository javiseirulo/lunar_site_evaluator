/**
 * A close view of the Moon with the landing craft on the site. Longitude is what actually
 * turns the ground: south-polar sites share a latitude, so a latitude-only camera looks still.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { buildSpinner } from '@/intro/moonSphere';
import { loadMoonTexture } from '@/intro/moonTexture';

const SIZE = 220;
const ZOOM = 5;
const DEG = Math.PI / 180;

function shortest(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

/** The same lander as Past landings: violet cabin, gold body, pale legs. Drawn at the site. */
function drawLander(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.6, 1.6);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = '#b8b0c9';
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(-8, 11);
  ctx.moveTo(4, 2);
  ctx.lineTo(8, 11);
  ctx.moveTo(0, 3);
  ctx.lineTo(0, 11);
  ctx.stroke();
  ctx.fillStyle = '#c9a24a';
  ctx.strokeStyle = '#2c2822';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-5.2, -2);
  ctx.lineTo(5.2, -2);
  ctx.lineTo(4.2, 4);
  ctx.lineTo(-4.2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6e5aa8';
  ctx.fillRect(-3.1, -8.2, 6.2, 5.4);
  ctx.strokeRect(-3.1, -8.2, 6.2, 5.4);
  ctx.fillStyle = '#d9ccff';
  ctx.beginPath();
  ctx.arc(0, -5.4, 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

    loadMoonTexture('moon-1k.jpg')
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
          drawLander(ctx, SIZE / 2, SIZE / 2);
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
      aria-label={`The Moon with a lander at ${label}`}
      className="mx-auto block size-[220px] bg-black"
    />
  );
}
