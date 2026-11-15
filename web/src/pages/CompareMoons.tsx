/**
 * A lit Moon centred on one site. The camera eases to a new place when the site changes,
 * and the Sun's height follows the shared mission clock.
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import { buildSpinner } from '@/intro/moonSphere';
import { loadMoonTexture } from '@/intro/moonTexture';

const SIZE = 220;

function shortest(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
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
        const frame = () => {
          if (cancelled) return;
          const target = goal.current;
          view.lat += (target.lat - view.lat) * 0.16;
          view.lon += shortest(view.lon, target.lon) * 0.16;
          view.sunEl += (target.sunEl - view.sunEl) * 0.16;
          const spinner = buildSpinner(tex, SIZE, view.lat, 20, view.sunEl);
          spinner.draw(image.data, 0);
          ctx.putImageData(image, 0, 0);
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
      aria-label={`The Moon centred on ${label}`}
      className="mx-auto block size-[220px] bg-black"
    />
  );
}
