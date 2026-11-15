import { useEffect, useRef } from 'react';
import { buildSpinner } from './moonSphere';
import { loadMoonTexture } from './moonTexture';

// View from the south so the pole sits low on the disc; Sun to the left of the camera.
const VIEW_LAT = -35;
const SUN_AZIMUTH = -50;
/** One full turn in this many seconds: slow enough to read the craters. */
const SECONDS_PER_TURN = 90;
const FRAME_MS = 1000 / 30;

/**
 * A 3D Moon turning on its axis, drawn on a canvas (no WebGL, no three.js). Decorative and not
 * interactive. Holds still for people who prefer reduced motion, and pauses while off screen or hidden.
 */
export function SpinningMoon({ pixels = 440, className }: { pixels?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    let raf = 0;
    let visible = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting));
    io.observe(canvas);

    loadMoonTexture('moon-1k.jpg')
      .then((tex) => {
        if (cancelled) return;
        canvas.width = pixels;
        canvas.height = pixels;
        const spinner = buildSpinner(tex, pixels, VIEW_LAT, SUN_AZIMUTH);
        const image = ctx.createImageData(pixels, pixels);
        const render = (theta: number) => {
          spinner.draw(image.data, theta);
          ctx.putImageData(image, 0, 0);
        };
        render(0.9); // a start longitude that shows the near side's maria
        canvas.dataset.ready = 'true';
        if (reduce) return;

        const start = performance.now();
        let last = 0;
        const tick = (now: number) => {
          raf = requestAnimationFrame(tick);
          if (!visible || document.hidden || now - last < FRAME_MS) return;
          last = now;
          render(0.9 + ((now - start) / 1000 / SECONDS_PER_TURN) * 2 * Math.PI);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {
        /* No texture: the halo behind the canvas still reads as a soft Moon-coloured glow. */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [pixels]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[18%] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(220,230,255,0.28) 0%, rgba(150,175,255,0.1) 40%, rgba(120,150,255,0) 66%)',
        }}
      />
      <canvas
        ref={ref}
        role="img"
        aria-label="A slowly rotating 3D Moon, seen from the south"
        className="relative size-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100"
      />
    </div>
  );
}
